-- Advisor fixes: pin match_products search_path; move vector out of public.

create schema if not exists extensions;
alter extension vector set schema extensions;

alter function public.match_products(extensions.vector, int, text)
  set search_path = '';
