-- =====================================================================
-- ART PISO 0.0.2 — E-03: encomenda em risco com relogio de verdade
-- (etapa 2 do fechamento do modo Supabase)
--  - encomenda_alertas: estado por reserva p/ alertar NA VIRADA
--  - fn_avaliar_encomendas: FILA DE URGENCIA (ordena pela data prevista e
--    aloca o disponivel do produto — pega o caso de dois pedidos que
--    individualmente cabem mas juntos nao)
--  - dispara por MUDANCA DE ESTADO (triggers) E por TEMPO (pg_cron diario)
--  - janela = parametros.dias_antecedencia_entrega (30); vencida fica FORA (E-07 aberto)
-- =====================================================================

create table encomenda_alertas (
  reserva_id    uuid primary key references reservas(id) on delete cascade,
  em_risco      boolean not null default false,
  atualizado_em timestamptz not null default now()
);
alter table encomenda_alertas enable row level security;
create policy encomenda_alertas_read on encomenda_alertas for select using (auth.uid() is not null);

create or replace function public.fn_avaliar_encomendas(p_produto_id uuid default null)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_janela int;
  v_prod record;
  v_res record;
  v_restante int;
  v_precisa int;
  v_risco boolean;
  v_ant boolean;
begin
  select coalesce((select valor from parametros where chave = 'dias_antecedencia_entrega'), 30)::int into v_janela;

  -- Limpa o estado de reservas que sairam do jogo (entregues/canceladas/nao rotacionando)
  delete from encomenda_alertas ea
   using reservas r
   where ea.reserva_id = r.id
     and (r.status not in ('reservado', 'parcial') or r.regime <> 'rotacionando');

  for v_prod in
    select p.id, p.nome from produtos p
    where p_produto_id is null or p.id = p_produto_id
  loop
    -- Disponivel do produto (fisico - travadas - perda), a "verba" da fila
    select coalesce((select sum(lq.caixas) from lote_quadras lq join lotes l on l.id = lq.lote_id where l.produto_id = v_prod.id), 0)
         - coalesce((select sum(case when r.regime = 'rotacionando' then r.caixas_travadas else r.caixas_saldo end)
                     from reservas r join lotes l on l.id = r.lote_id
                     where l.produto_id = v_prod.id and r.status in ('reservado', 'parcial')), 0)
         - coalesce((select sum(l.caixas_perda) from lotes l where l.produto_id = v_prod.id), 0)
      into v_restante;
    v_restante := greatest(0, v_restante);

    for v_res in
      select res.id, res.caixas_saldo, res.caixas_travadas,
             ped.numero, (ped.data_prevista - current_date) as dias
        from reservas res
        join pedidos ped on ped.id = res.pedido_id
        join lotes l on l.id = res.lote_id
       where l.produto_id = v_prod.id
         and res.status in ('reservado', 'parcial')
         and res.regime = 'rotacionando'
         and ped.data_prevista is not null
         and ped.data_prevista >= current_date                 -- vencida fica fora (E-07)
         and ped.data_prevista <= current_date + v_janela      -- so dentro da janela
       order by ped.data_prevista, res.created_at
    loop
      v_precisa := greatest(0, v_res.caixas_saldo - v_res.caixas_travadas)
;
      v_risco := v_precisa > v_restante;
      select em_risco into v_ant from encomenda_alertas where reserva_id = v_res.id;

      if v_risco and (v_ant is distinct from true) then
        perform fn_notificar('reserva', 'Encomenda em risco',
          format('%s · %s — faltam %s cx e entrega em %s dia%s',
            v_res.numero, v_prod.nome, v_precisa - v_restante, v_res.dias, case when v_res.dias = 1 then '' else 's' end));
      end if;

      insert into encomenda_alertas (reserva_id, em_risco)
      values (v_res.id, v_risco)
      on conflict (reserva_id) do update set em_risco = excluded.em_risco, atualizado_em = now();

      v_restante := greatest(0, v_restante - v_precisa);
    end loop;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Mudanca de estado tambem reavalia (nao so o cron): os triggers da
-- etapa 1 passam a chamar as DUAS avaliacoes (produto + encomendas)
-- ---------------------------------------------------------------------
create or replace function public.fn_trigger_avaliar_lote_quadras()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_produto uuid;
begin
  select produto_id into v_produto from lotes where id = coalesce(new.lote_id, old.lote_id);
  if v_produto is not null then
    perform fn_avaliar_produto(v_produto);
    perform fn_avaliar_encomendas(v_produto);
  end if;
  return null;
end;
$$;

create or replace function public.fn_trigger_avaliar_reservas()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_produto uuid;
begin
  select produto_id into v_produto from lotes where id = coalesce(new.lote_id, old.lote_id);
  if v_produto is not null then
    perform fn_avaliar_produto(v_produto);
    perform fn_avaliar_encomendas(v_produto);
  end if;
  return null;
end;
$$;

create or replace function public.fn_trigger_avaliar_lotes()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  perform fn_avaliar_produto(coalesce(new.produto_id, old.produto_id));
  perform fn_avaliar_encomendas(coalesce(new.produto_id, old.produto_id));
  return null;
end;
$$;

-- Editar so a data prevista do pedido tambem muda o risco
create or replace function public.fn_trigger_avaliar_pedidos()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if new.data_prevista is distinct from old.data_prevista then
    perform fn_avaliar_encomendas(null);
  end if;
  return null;
end;
$$;
create constraint trigger trg_avaliar_pedidos
  after update on pedidos
  deferrable initially deferred
  for each row execute function fn_trigger_avaliar_pedidos();

revoke execute on function public.fn_avaliar_encomendas(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- O RELOGIO: pg_cron roda a avaliacao todo dia as 10:00 UTC (07:00 BRT) —
-- e o que faz o alerta disparar pela PASSAGEM DO TEMPO, sem ninguem mexer
-- ---------------------------------------------------------------------
create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'artpiso-encomendas-diario') then
    perform cron.unschedule('artpiso-encomendas-diario');
  end if;
  perform cron.schedule('artpiso-encomendas-diario', '0 10 * * *', 'select public.fn_avaliar_encomendas()');
end;
$$;
