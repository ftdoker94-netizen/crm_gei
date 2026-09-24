-- Bug: il trigger crm_cantiere_rapportini_set_updated_at (creato in
-- 20260929_000001_rapportino_giornaliero.sql) riusa crm_set_updated_at(),
-- che imposta sia updated_at sia updated_by. crm_cantiere_rapportini pero'
-- ha solo updated_at (non era nello scope originale tracciare "chi ha
-- modificato per ultimo" separatamente da autore_id), quindi ogni UPDATE
-- falliva con "record "new" has no field "updated_by"" -- scoperto
-- verificando dal vivo che il responsabile/admin potesse correggere un
-- rapportino altrui.

create or replace function crm_rapportino_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists crm_cantiere_rapportini_set_updated_at on crm_cantiere_rapportini;

create trigger crm_cantiere_rapportini_set_updated_at before update on crm_cantiere_rapportini
  for each row execute function crm_rapportino_set_updated_at();
