-- =====================================================================
-- ART PISO 0.0.2 — Migration 1/5: base (extensoes, enums, funcoes puras)
-- Fonte: Art Piso/Handoff/art_piso_0_0_2_schema.md
-- =====================================================================

-- unaccent para as chaves normalizadas (mesma regra de duplicados do mock)
-- (em public de proposito: o wrapper f_unaccent referencia public.unaccent)
create extension if not exists unaccent with schema public;

-- Wrapper IMMUTABLE do unaccent (com dicionario explicito) para uso em indice
create or replace function public.f_unaccent(p_texto text)
returns text
language sql immutable strict parallel safe
as $$ select public.unaccent('public.unaccent'::regdictionary, p_texto) $$;

-- Chave normalizada de NOME: minusculo, sem acento, espacos colapsados
create or replace function public.chave_nome(p_texto text)
returns text
language sql immutable strict parallel safe
as $$ select lower(public.f_unaccent(trim(regexp_replace(p_texto, '\s+', ' ', 'g')))) $$;

-- Chave normalizada de REFERENCIA/CODIGO: remove tambem espacos, ponto, underscore e hifen
create or replace function public.chave_referencia(p_texto text)
returns text
language sql immutable strict parallel safe
as $$ select lower(public.f_unaccent(regexp_replace(p_texto, '[\s._-]+', '', 'g'))) $$;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type user_role      as enum ('admin', 'vendedor', 'gerente');
create type user_status    as enum ('ativo', 'ausente');
create type reserva_status as enum ('reservado', 'parcial', 'entregue', 'cancelado', 'estornado');
create type reserva_regime as enum ('aguardando', 'rotacionando', 'travado');
create type movimento_tipo as enum ('entrada', 'perda', 'quadra', 'correcao');
create type quadra_status  as enum ('disponivel', 'ocupado');

-- updated_at automatico
create or replace function public.fn_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
