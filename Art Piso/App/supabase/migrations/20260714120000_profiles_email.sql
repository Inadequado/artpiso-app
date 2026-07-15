-- =====================================================================
-- ART PISO 0.0.2 — profiles.email (etapa 3 do fechamento do modo Supabase)
-- O e-mail de login vive em auth.users (fora do alcance dos outros
-- usuarios); espelhamos em profiles para a tela de Configuracoes.
-- Sincronizacao: handle_new_user grava na criacao; a Edge Function
-- admin-usuarios atualiza o espelho quando o admin troca o e-mail.
-- =====================================================================

alter table profiles add column email text not null default '';

update profiles
   set email = coalesce(u.email, '')
  from auth.users u
 where u.id = profiles.id;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    coalesce(new.email, '')
  );
  return new;
end;
$$;
