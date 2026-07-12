# Art Piso — Schema 0.0.2 (proposta para validação)

Evolução do `art_piso_0_0_1_schema.sql`, alinhada ao mock validado na Fase 1 (revisão tela a tela) e ao modelo multi-quadra (Q1, M1+M2+M3). **Este documento é proposta, não migração aplicada** — depois do OK ele vira o SQL do projeto Supabase Pro (etapa 2 da Fase 2).

Princípios mantidos do 0.0.1:

- Caixas são a fonte da verdade; m² é SEMPRE derivado (`caixas × m2_por_caixa`).
- Disponível = Estoque − Reserva − Perda (derivado, nunca digitado).
- Produto + Lote = unidade real de estoque.
- Permissões críticas reforçadas no banco (RLS + funções), não só escondidas no frontend.

---

## 1. O que muda em relação ao 0.0.1 (resumo)

| # | 0.0.1 | 0.0.2 | Motivo (validado no mock) |
|---|-------|-------|---------------------------|
| 1 | `lotes.quadra_id` (1 quadra por lote) | tabela **`lote_quadras`** (N quadras por lote) | Q1 respondida: lote pode ocupar 2+ quadras (excesso de caixas) |
| 2 | `lotes.caixas_estoque` coluna | **derivado** = soma de `lote_quadras.caixas` | invariante "soma das alocações = estoque" vira estrutural, sem risco de drift |
| 3 | `produtos` sem nome; `referencia not null unique` | **`nome` obrigatório**; `referencia` opcional (única quando preenchida, normalizada) | identidade do produto é `produto_id`; referência virou dado exibicional opcional |
| 4 | cliente = texto na reserva | tabelas **`clientes`** + **`cliente_enderecos`** | R-06: cliente é entidade (fonte única); cliente tem N obras/endereços |
| 5 | `reservas.numero_pedido unique` (1 linha = 1 pedido) | tabelas **`pedidos`** (grupo) + **`reservas`** (linhas) | R-07: pedido multi-item — o unique de 0.0.1 impedia 2 lotes no mesmo PED |
| 6 | `reserva_status`: reservado/entregue/cancelado | + **`parcial`** e **`estornado`**; novo eixo **`regime`** | Q6 entrega parcial, R-08 estorno, E-06 regime rotacionando/travado |
| 7 | trigger de baixa por mudança de status | tabelas **`entregas`** + **`entrega_quadras`** + **`estornos`** | entregas parciais múltiplas com histórico; M3: de quais quadras saíram as caixas |
| 8 | sem log de ajustes | tabela **`movimentos`** | Q10: histórico de entrada/perda/quadra/correção (tela Ajustes) |
| 9 | `quadras.numero int` | **`numero text`** único + `descricao` obrigatória + `status` manual | mock usa "Q-03"; máscara ainda pendente (dados reais do usuário); Q-01 revertida = ocupação manual |
| 10 | sem perda por peça | `lotes.pisos_danificados` | registro informativo de pisos quebrados dentro das caixas perdidas |
| 11 | limites fixos no app | tabela **`parametros`** | PH-1/PH-2/PH-3 são chutes: ajustar sem deploy |
| 12 | escrita direta nas tabelas | operações compostas via **RPC** (funções Postgres) | entrega/estorno/correção tocam 2+ tabelas; transação + regra no banco (Q5, PH-9) |
| 13 | caixas `numeric(12,2)` | caixas **`int`** | CONFIRMADO pelo usuário (2026-07-12): meia caixa não existe na prática, somente caixas inteiras |

O que **continua fora do banco** (derivado em view/app): m² de tudo, `caixas_reserva` do lote (soma das linhas ativas), disponível, status de estoque (disponível/baixo/esgotado), label de localização ("Q-08 (30 cx) · Q-11 (15 cx)").

O que **fica para fatias seguintes** (não trava a 0.0.2): tabela de notificações + job/cron do E-03 (encomenda em risco precisa de relógio — no mock só dispara por mudança de estado), fotos no Supabase Storage (bucket + policy na fatia do catálogo).

---

## 2. Tipos

```sql
create type user_role      as enum ('admin', 'vendedor', 'gerente');
create type user_status    as enum ('ativo', 'ausente');
create type reserva_status as enum ('reservado', 'parcial', 'entregue', 'cancelado', 'estornado');
create type reserva_regime as enum ('aguardando', 'rotacionando', 'travado');
create type movimento_tipo as enum ('entrada', 'perda', 'quadra', 'correcao');
create type quadra_status  as enum ('disponivel', 'ocupado');
```

`regime` é eixo ORTOGONAL ao status (decisão E-06): `aguardando`/`travado` travam o saldo inteiro (consomem disponível); `rotacionando` trava só `caixas_travadas` (que pode ser 0 — estoque gira até perto da data).

## 3. Tabelas

### 3.1 profiles (espelha auth.users)

```sql
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null,
  role       user_role not null default 'vendedor',
  status     user_status not null default 'ativo',
  created_at timestamptz not null default now()
);
```

E-mail vive em `auth.users` (não duplicar). O helper `auth_role()` do 0.0.1 continua igual. PH-11: na prática o ambiente começa só com `admin`; a distribuição real de papéis é do Dev.

### 3.2 quadras

```sql
create table quadras (
  id         uuid primary key default gen_random_uuid(),
  numero     text not null,          -- identificador exibido ("Q-03"); MÁSCARA pendente (pergunta P1)
  descricao  text not null,          -- "Corredor 3" (obrigatória no mock)
  status     quadra_status not null default 'disponivel',  -- ocupação MANUAL (Q-01 revertida)
  created_at timestamptz not null default now()
);
create unique index quadras_numero_unico on quadras (lower(trim(numero)));
```

### 3.3 produtos

```sql
create table produtos (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,               -- identidade comercial exibida (faltava no 0.0.1!)
  referencia      text,                        -- OPCIONAL (decisão 2026-07-07)
  marca           text not null,
  tamanho_nominal text,                        -- rótulo "60x60"; OPCIONAL
  descricao       text,
  preco_m2        numeric(10,2) not null check (preco_m2 >= 0),
  foto            text,                        -- path no Storage (mock validou 1 foto; 0.0.1 previa array)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- Duplicados bloqueados por CHAVE NORMALIZADA (sem acento/caixa/espaços duplicados — regra da Fase 1):
create unique index produtos_nome_unico       on produtos (chave_nome(nome));
create unique index produtos_referencia_unica on produtos (chave_referencia(referencia))
  where referencia is not null;
```

`chave_nome` / `chave_referencia` são funções SQL `immutable` espelhando as do mock (`lower` + `unaccent` + colapso de espaços; a de referência remove também ` ._-`). Detalhe de implementação: `unaccent` precisa de wrapper immutable para ser indexável — resolvido na migração.

`preco_m2`, `descricao` e `foto` são atributos de PRODUTO (iguais em todos os lotes — validado na Fase 1). `m2_por_caixa`/`pecas_por_caixa` ficam no LOTE (variam por remessa).

### 3.4 lotes

```sql
create table lotes (
  id                uuid primary key default gen_random_uuid(),
  produto_id        uuid not null references produtos(id) on delete restrict,
  codigo            text not null,      -- "L-2405"; sufixo manual p/ specs diferentes ("L-2405-B", PH-12)
  bitola            text,               -- calibre impresso na caixa; varia por lote
  tonalidade        text,               -- idem
  m2_por_caixa      numeric(10,4) not null check (m2_por_caixa > 0),
  pecas_por_caixa   int not null check (pecas_por_caixa > 0),
  caixas_perda      int not null default 0 check (caixas_perda >= 0),
  pisos_danificados int not null default 0 check (pisos_danificados >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index lotes_codigo_unico on lotes (lower(trim(codigo)));  -- ÚNICO GLOBAL (regra da Fase 1; ver PH-12)
create index idx_lotes_produto on lotes (produto_id);
```

**Sem `caixas_estoque` e sem `quadra_id`**: o estoque físico do lote É a soma das alocações abaixo. Perda NÃO mexe nas alocações (a caixa perdida continua fisicamente na quadra até descarte; o acerto de contagem é a correção — decisão M2).

### 3.5 lote_quadras (Q1 — o coração do 0.0.2)

```sql
create table lote_quadras (
  lote_id   uuid not null references lotes(id)   on delete cascade,
  quadra_id uuid not null references quadras(id) on delete restrict,  -- quadra com caixas não pode ser excluída
  caixas    int  not null check (caixas > 0),    -- alocação zerada é REMOVIDA, não fica em 0
  primary key (lote_id, quadra_id)
);
create index idx_lote_quadras_quadra on lote_quadras (quadra_id);
```

Movimentações (validadas no mock M1–M3):

- **Entrada** soma na quadra de destino informada (pode ser quadra nova para o lote — é assim que ele passa a ocupar 2+).
- **Correção** é por quadra: novo total da alocação; estoque do lote = soma resultante.
- **Mover** é parcial ou total: subtrai da origem (remove se zerar), soma no destino.
- **Entrega** baixa nas quadras escolhidas pelo usuário (M3); **estorno** devolve alocando na quadra de destino informada.

### 3.6 clientes + endereços (R-06)

```sql
create table clientes (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  documento  text not null,     -- CPF/CNPJ com máscara; dígito verificador validado no app (PH-10)
  telefone   text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index clientes_documento_unico on clientes (regexp_replace(documento, '\D', '', 'g'));

create table cliente_enderecos (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  apelido    text,              -- "Obra Centro" (opcional)
  endereco   text not null      -- TEXTO LIVRE por ora (estruturar rua/CEP é a pergunta P5)
);
```

Anti-órfã (regra da Fase 1): excluir cliente/endereço com pedido ATIVO é bloqueado — nas RPCs de exclusão (a FK sozinha não distingue ativo de histórico; pedidos históricos seguram o vínculo por snapshot).

### 3.7 pedidos + reservas (R-07: grupo + linhas)

```sql
create table pedidos (
  id               uuid primary key default gen_random_uuid(),
  numero           text not null,                -- "PED-1042", manual com sugestão automática (PH-7)
  cliente_id       uuid not null references clientes(id) on delete restrict,
  endereco_id      uuid references cliente_enderecos(id) on delete set null,
  endereco_entrega text,                         -- SNAPSHOT do endereço na criação (fallback); null = retirada na loja
  data_prevista    date,                         -- null = entrega imediata
  observacoes      text,
  vendedor_id      uuid references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index pedidos_numero_unico on pedidos (lower(trim(numero)));

create table reservas (
  id                  uuid primary key default gen_random_uuid(),
  pedido_id           uuid not null references pedidos(id) on delete restrict,
  lote_id             uuid not null references lotes(id)   on delete restrict,
  caixas_saldo        int not null default 0 check (caixas_saldo >= 0),   -- saldo EM ABERTO (encolhe a cada entrega — modelo R-05)
  caixas_entregues    int not null default 0 check (caixas_entregues >= 0),
  caixas_travadas     int not null default 0 check (caixas_travadas >= 0), -- só rotacionando usa (aguardando/travado = saldo inteiro, derivado)
  regime              reserva_regime not null default 'aguardando',
  status              reserva_status not null default 'reservado',
  motivo_cancelamento text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (pedido_id, lote_id),                   -- carrinho não repete lote (bloqueio na origem, R-07)
  check (status in ('entregue','cancelado','estornado') or caixas_saldo > 0)
);
create index idx_reservas_lote   on reservas (lote_id);
create index idx_reservas_status on reservas (status);
```

Dados compartilhados (cliente, endereço, data prevista, observações) vivem no PEDIDO — o mock repetia por linha porque não tinha grupo; no banco normaliza. Ciclo de vida continua **por linha** (entrega/cancela sozinha). Sem coluna `quadra` snapshot: a localização de reserva ativa é derivada ao vivo do lote, e o histórico de "de onde saiu" agora é estruturado em `entrega_quadras`/`estornos`.

### 3.8 entregas + entrega_quadras (Q6 parcial + M3)

```sql
create table entregas (
  id            uuid primary key default gen_random_uuid(),
  reserva_id    uuid not null references reservas(id) on delete restrict,
  lote_id       uuid not null references lotes(id)    on delete restrict,  -- de onde saiu (rotacionando pode trocar de lote)
  caixas        int not null check (caixas > 0),
  responsavel   text not null,                    -- motorista/cliente (texto livre, como no mock)
  registrado_por uuid references profiles(id),
  observacoes   text,
  created_at    timestamptz not null default now()
);

create table entrega_quadras (                     -- M3: divisão da baixa por quadra
  entrega_id uuid not null references entregas(id) on delete cascade,
  quadra_id  uuid not null references quadras(id)  on delete restrict,
  caixas     int  not null check (caixas > 0),
  primary key (entrega_id, quadra_id)
);
```

Invariante da entrega (garantido na RPC): soma de `entrega_quadras.caixas` = `entregas.caixas`, e cada parcela cabe na alocação da quadra no momento da baixa.

### 3.9 estornos (R-08)

```sql
create table estornos (
  id                uuid primary key default gen_random_uuid(),
  reserva_id        uuid not null references reservas(id) on delete restrict,
  caixas            int not null check (caixas > 0),
  quadra_destino_id uuid not null references quadras(id) on delete restrict, -- onde as caixas devolvidas foram guardadas
  motivo            text,
  registrado_por    uuid references profiles(id),
  created_at        timestamptz not null default now()
);
```

Estorno devolve DE VERDADE às alocações (`lote_quadras`) na quadra de destino — comportamento validado na M1.

### 3.10 movimentos (Q10 — histórico de ajustes)

```sql
create table movimentos (
  id         uuid primary key default gen_random_uuid(),
  tipo       movimento_tipo not null,
  detalhe    text not null,                 -- texto exibido ("L-2410: Q-08 → Q-05 (10 cx)")
  observacao text,                          -- motivo da perda etc.
  lote_id    uuid references lotes(id)    on delete set null,  -- vínculo estruturado p/ filtros
  produto_id uuid references produtos(id) on delete set null,
  usuario_id uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_movimentos_produto on movimentos (produto_id, tipo);
```

Só AJUSTES entram aqui (entrada/perda/quadra/correção + gestão de quadras) — reserva/entrega/cadastro vivem como notificação (H-04), e agora também nas próprias tabelas de histórico.

### 3.11 parametros (PH-1/2/3 ajustáveis)

```sql
create table parametros (
  chave     text primary key,
  valor     numeric not null,
  descricao text not null
);
insert into parametros values
  ('limite_estoque_baixo_cx',    10, 'Disponível abaixo disso = produto em estoque baixo (PH-1)'),
  ('limite_pico_perda_cx',        5, 'Perda acumulada do lote que dispara alerta (PH-2)'),
  ('dias_antecedencia_entrega',  30, 'Janela do alerta de encomenda em risco — E-03 (PH-3)');
```

## 4. Views

```sql
create or replace view vw_estoque as
select
  l.id as lote_id, l.codigo as lote, l.bitola, l.tonalidade,
  p.id as produto_id, p.nome, p.referencia, p.marca, p.tamanho_nominal, p.preco_m2, p.foto,
  l.m2_por_caixa, l.pecas_por_caixa,

  coalesce(alocado.caixas, 0)                              as caixas_estoque,   -- soma das alocações
  coalesce(res.caixas_reserva, 0)                          as caixas_reserva,   -- só o TRAVADO conta
  l.caixas_perda,
  coalesce(alocado.caixas,0) - coalesce(res.caixas_reserva,0) - l.caixas_perda as caixas_disponivel,
  alocado.alocacoes,                                        -- jsonb [{quadra, caixas}] p/ o label da UI

  -- m² SEMPRE derivados
  coalesce(alocado.caixas,0) * l.m2_por_caixa               as m2_estoque
  -- (+ m2_reserva / m2_perda / m2_disponivel, mesmos produtos)
from lotes l
join produtos p on p.id = l.produto_id
left join (
  select lote_id, sum(caixas) as caixas,
         jsonb_agg(jsonb_build_object('quadra', q.numero, 'caixas', lq.caixas) order by lq.caixas desc) as alocacoes
  from lote_quadras lq join quadras q on q.id = lq.quadra_id
  group by lote_id
) alocado on alocado.lote_id = l.id
left join (
  -- Regra DISPONÍVEL x REGIME (validada): desconta só as caixas TRAVADAS.
  -- aguardando/travado travam o saldo inteiro; rotacionando trava caixas_travadas (pode ser 0).
  select lote_id,
         sum(case when regime = 'rotacionando' then caixas_travadas else caixas_saldo end) as caixas_reserva
  from reservas
  where status in ('reservado','parcial')
  group by lote_id
) res on res.lote_id = l.id;
```

Views auxiliares (`vw_pedidos` com linhas agregadas, `vw_quadras` com "N lotes · M cx") entram na implementação; não mudam o modelo.

## 5. Operações como RPCs (escrita composta no banco)

Toda operação que toca 2+ tabelas ou carrega regra de negócio vira função Postgres (`security definer` com checagem de papel interna), transacional. O frontend NUNCA escreve direto em `lotes`/`lote_quadras`/`reservas`/`entregas`/`estornos` — RLS deixa essas tabelas somente-leitura para o client e a escrita passa pelas funções (é o "reforçado no banco" do princípio). Espelham 1:1 as ações do provider do mock:

| RPC | Papéis | Regras que garante |
|-----|--------|--------------------|
| `fn_criar_pedido(cliente, endereco, itens[], ...)` | admin, vendedor | Q5 por item (nunca acima do disponível, com lock do lote); lote não repetido no pedido; PED único |
| `fn_editar_pedido(pedido, itens[], ...)` | admin, vendedor | R-05 (linha parcial: lote/cliente imutáveis, só saldo/data/obs); remover linha = cancelar com rastro; Q5 no aumento |
| `fn_cancelar_reserva(reserva, motivo)` | admin, vendedor | libera o travado; grava motivo |
| `fn_entregar(reserva, caixas, retiradas[], lote_alternativo?, ...)` | admin, gerente | baixa `lote_quadras` nas quadras informadas (M3: soma = caixas, cada parcela ≤ alocação); parcial vira `parcial`, saldo 0 vira `entregue`; troca de lote só rotacionando em `reservado` |
| `fn_estornar(reserva, caixas, quadra_destino, motivo)` | admin, gerente | só de `entregue`; máx = entregue; devolve às alocações |
| `fn_registrar_entrada(lote, caixas, quadra)` | admin, gerente | soma alocação (cria se nova) + movimento `entrada` |
| `fn_registrar_perda(lote, caixas, pisos, motivo, quadra?)` | admin, gerente | perda ≤ disponível; motivo obrigatório; quadra informativa no movimento; pisos ≤ caixas × peças/caixa |
| `fn_mover_quadra(lote, origem, destino, caixas)` | admin, gerente | ≤ alocação da origem; origem zerada some; movimento `quadra` |
| `fn_corrigir_estoque(lote, quadra, novo_total)` | admin, gerente | PH-9: total resultante do lote ≥ comprometido (reserva travada + perda) — BLOQUEIA (confirmar com Dev, pergunta P3) |

Rede de segurança adicional (cinto e suspensório, baratos): trigger de Q5 em `reservas` e constraint de não-negatividade já cobrem escrita que escape das RPCs.

## 6. RLS — matriz papel × ação

Leitura: **todo autenticado lê tudo** (Q11: vendedor vê todas as reservas). Escrita direta nas tabelas: fechada para o client nas tabelas operacionais (passa pelas RPCs); aberta com policy nas de cadastro:

| Tabela | admin | vendedor | gerente |
|--------|-------|----------|---------|
| profiles | CRUD | lê o próprio | lê o próprio |
| quadras | CRUD | — | CRUD |
| produtos | CRUD | — | — |
| clientes / endereços | CRUD | CRUD | — (Q13: gerente não mexe em cliente) |
| lotes / lote_quadras | via RPC | — | via RPC |
| pedidos / reservas | via RPC | via RPC (criar/editar/cancelar) | via RPC (entregar/estornar) |
| movimentos / entregas / estornos | insert via RPC; leitura geral | leitura | leitura |
| parametros | CRUD | leitura | leitura |

PH-11 vigente: na prática só `admin` existe no começo; a matriz acima é o alvo (papéis do CLAUDE.md §5), refinável sem mudar o modelo.

## 7. Perguntas para o Dev (levar junto com a validação)

- **P1 — Máscara da quadra**: `quadras.numero` é `text` livre até o usuário confirmar os identificadores reais do depósito. Existe padrão ("Q-03"? número puro? letra+número)? Vira `check` depois.
- **P2 — PH-12**: mesmo código de fábrica com bitola/tonalidade diferentes → hoje sufixo manual (L-2405-B), código único global. Como o depósito diferencia isso HOJE no papel? Vale unicidade composta (código+bitola+tonalidade) em vez do sufixo? (No 0.0.2 o vínculo reserva→lote já é por FK id, então mudar a unicidade depois é barato.)
- **P3 — PH-9**: correção de contagem abaixo do comprometido (reserva travada + perda): BLOQUEAR (comportamento atual) ou avisar e permitir?
- ~~P4 — Caixa fracionada~~ RESOLVIDA pelo usuário (2026-07-12): não existe meia caixa; caixas são `int`.
- **P5 — Endereço de entrega**: texto livre basta ou estruturar (rua/CEP/cidade) para rota/frete no futuro?
- **P6 — Q16/PH-5**: prazo real de reposição (pedido → chegada), sazonalidade, produtos mais lentos — define `dias_antecedencia_entrega` e a escala rápida×encomenda (PH-4).
- **P7 — PH-1/PH-2**: limites de estoque baixo (10 cx) e pico de perda (5 cx) — valores reais? Por produto ou global? (A tabela `parametros` já deixa ajustável.)
