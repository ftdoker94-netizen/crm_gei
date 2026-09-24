-- Trasforma il tracciamento ore (crm_cantiere_ore) in un vero rapportino
-- giornaliero di cantiere: un rapportino per cantiere per giorno (meteo,
-- lavorazioni svolte, note), con le righe ore per collaboratore agganciate
-- al rapportino invece che direttamente a cantiere_id/data, più foto.

-- 1. Rapportini ------------------------------------------------------------

create table crm_cantiere_rapportini (
  id uuid primary key default gen_random_uuid(),
  cantiere_id uuid not null references crm_cantieri(id) on delete cascade,
  data date not null,
  autore_id uuid references crm_profiles(id),
  meteo text check (meteo in ('sereno', 'nuvolo', 'pioggia', 'vento', 'altro')),
  lavorazioni_svolte text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cantiere_id, data)
);

create index crm_cantiere_rapportini_cantiere_idx on crm_cantiere_rapportini(cantiere_id, data desc);

create trigger crm_cantiere_rapportini_set_updated_at before update on crm_cantiere_rapportini
  for each row execute function crm_set_updated_at();

-- 2. Migrazione delle ore esistenti in rapportini ---------------------------
-- Raggruppa le righe esistenti di crm_cantiere_ore per cantiere_id+data e
-- crea un rapportino per ciascun gruppo, prima di ricollegare le ore. Le
-- eventuali note per-riga esistenti confluiscono nel campo note del
-- rapportino (concatenate), così non si perde nulla. Se la tabella è vuota
-- (come nell'ambiente in cui è stata scritta questa migrazione) questo
-- passaggio è un no-op.
insert into crm_cantiere_rapportini (cantiere_id, data, autore_id, note)
select
  cantiere_id,
  data,
  (array_agg(created_by order by created_at))[1] as autore_id,
  nullif(string_agg(distinct note, ' | ') filter (where note is not null and note <> ''), '') as note
from crm_cantiere_ore
group by cantiere_id, data
on conflict (cantiere_id, data) do nothing;

-- 3. Ristruttura crm_cantiere_ore --------------------------------------------

alter table crm_cantiere_ore add column rapportino_id uuid references crm_cantiere_rapportini(id) on delete cascade;
alter table crm_cantiere_ore add column mansione text;

update crm_cantiere_ore o
set rapportino_id = r.id
from crm_cantiere_rapportini r
where r.cantiere_id = o.cantiere_id and r.data = o.data;

alter table crm_cantiere_ore alter column rapportino_id set not null;

drop index if exists crm_cantiere_ore_cantiere_idx;
alter table crm_cantiere_ore drop column cantiere_id;
alter table crm_cantiere_ore drop column data;
alter table crm_cantiere_ore drop column note;

create index crm_cantiere_ore_rapportino_idx on crm_cantiere_ore(rapportino_id);

-- Le policy RLS esistenti su crm_cantiere_ore (select libera, insert/delete
-- riservati a chi ha creato la riga) non referenziano le colonne rimosse:
-- restano valide senza modifiche.

-- 4. Foto dei rapportini ------------------------------------------------------

create table crm_rapportino_foto (
  id uuid primary key default gen_random_uuid(),
  rapportino_id uuid not null references crm_cantiere_rapportini(id) on delete cascade,
  storage_path text not null,
  caricato_da uuid references crm_profiles(id),
  created_at timestamptz not null default now()
);

create index crm_rapportino_foto_rapportino_idx on crm_rapportino_foto(rapportino_id);

-- 5. RLS: stessa logica liberal già in uso per crm_cantieri (nessuna
-- restrizione di visibilità: tutto il team autenticato vede tutti i
-- cantieri, quindi anche tutti i rapportini e le foto collegate; scrittura
-- riservata a chi ha creato la riga per update/delete).

alter table crm_cantiere_rapportini enable row level security;
alter table crm_rapportino_foto enable row level security;

create policy "crm_cantiere_rapportini_select" on crm_cantiere_rapportini
  for select to authenticated using (true);
create policy "crm_cantiere_rapportini_insert" on crm_cantiere_rapportini
  for insert to authenticated with check (autore_id = auth.uid());
create policy "crm_cantiere_rapportini_update" on crm_cantiere_rapportini
  for update to authenticated using (true) with check (autore_id = auth.uid());
create policy "crm_cantiere_rapportini_delete" on crm_cantiere_rapportini
  for delete to authenticated using (autore_id = auth.uid());

create policy "crm_rapportino_foto_select" on crm_rapportino_foto
  for select to authenticated using (true);
create policy "crm_rapportino_foto_insert" on crm_rapportino_foto
  for insert to authenticated with check (caricato_da = auth.uid());
create policy "crm_rapportino_foto_delete" on crm_rapportino_foto
  for delete to authenticated using (caricato_da = auth.uid());

-- 6. Storage bucket per le foto -----------------------------------------------
-- Bucket privato: le foto si leggono solo tramite URL firmati generati lato
-- app (o con una sessione autenticata), coerente con "solo chi vede il
-- cantiere vede le foto" — dato che tutti i cantieri sono visibili a tutto
-- il team autenticato (vedi crm_cantieri_select), la policy sul bucket è
-- semplicemente "autenticato", stessa logica liberal del resto del CRM.

insert into storage.buckets (id, name, public)
values ('rapportini-cantiere', 'rapportini-cantiere', false)
on conflict (id) do nothing;

create policy "rapportini_cantiere_select" on storage.objects
  for select to authenticated using (bucket_id = 'rapportini-cantiere');

create policy "rapportini_cantiere_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'rapportini-cantiere');

create policy "rapportini_cantiere_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'rapportini-cantiere' and owner = auth.uid());
