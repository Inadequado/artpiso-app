-- =====================================================================
-- ART PISO 0.0.2 — Protecao do papel ADMIN (decisao do usuario, 2026-07-14)
--  1. Papel admin so pode ser CONCEDIDO pelo banco (SQL Editor/service),
--     nunca pelo app — nem por outro admin.
--  2. STATUS de um admin (ativar/desativar) tambem so muda pelo banco.
--  3. De quebra: o ultimo admin nao pode ser rebaixado nem pelo proprio app.
-- Criterio: auth.uid() nulo = operacao do banco/service_role (livre);
-- auth.uid() presente = veio do app logado (regras valem p/ QUALQUER papel).
-- =====================================================================

create or replace function public.fn_protege_admin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;  -- banco / service_role: sem restricao
  end if;

  if tg_op = 'INSERT' and new.role = 'admin' then
    raise exception 'Papel admin só pode ser concedido direto no banco.';
  end if;

  if tg_op = 'UPDATE' then
    if new.role = 'admin' and old.role <> 'admin' then
      raise exception 'Papel admin só pode ser concedido direto no banco.';
    end if;
    if old.role = 'admin' and new.role <> 'admin'
       and (select count(*) from profiles where role = 'admin') <= 1 then
      raise exception 'Não é possível rebaixar o último administrador.';
    end if;
    if old.role = 'admin' and new.status is distinct from old.status then
      raise exception 'Status de administrador só pode ser alterado direto no banco.';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_protege_admin
  before insert or update on profiles
  for each row execute function fn_protege_admin();
