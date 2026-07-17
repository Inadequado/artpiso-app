-- =====================================================================
-- ART PISO 0.0.2 — Foto do produto no Storage (Formas A + B)
--  - Antes: foto vivia como base64 na coluna produtos.foto (inchava a
--    vw_estoque e o banco). Agora: arquivo no bucket `produtos`, e a
--    coluna guarda so a URL publica (texto curto).
--  - Leitura publica (foto de piso nao e sensivel); upload admin+gerente
--    (ambos gerenciam produtos); remocao de arquivo so admin.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;

-- Leitura: qualquer um (a URL publica ja serve sem auth; a policy cobre a API).
create policy "produtos_foto_leitura"
  on storage.objects for select
  using (bucket_id = 'produtos');

-- Upload/troca: admin e gerente (ambos criam/editam produtos).
create policy "produtos_foto_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'produtos'
    and exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'gerente'))
  );

create policy "produtos_foto_update"
  on storage.objects for update
  using (
    bucket_id = 'produtos'
    and exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'gerente'))
  );

-- Remocao de arquivo: so admin (gerente nao exclui).
create policy "produtos_foto_delete_admin"
  on storage.objects for delete
  using (
    bucket_id = 'produtos'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
