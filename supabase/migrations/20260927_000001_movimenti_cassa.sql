-- Vista economica generale: movimenti di cassa inseriti a mano (entrate/uscite),
-- opzionalmente collegati a un cantiere. Nessuna integrazione bancaria o di
-- fatturazione elettronica in questo blocco.

create table crm_movimenti_cassa (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrata', 'uscita')),
  categoria text not null,
  importo numeric(12, 2) not null,
  data date not null default current_date,
  descrizione text,
  cantiere_id uuid references crm_cantieri(id) on delete set null,
  created_by uuid references crm_profiles(id),
  created_at timestamptz not null default now()
);

create index crm_movimenti_cassa_data_idx on crm_movimenti_cassa(data);
create index crm_movimenti_cassa_cantiere_idx on crm_movimenti_cassa(cantiere_id);

alter table crm_movimenti_cassa enable row level security;

create policy "crm_movimenti_cassa_select" on crm_movimenti_cassa
  for select to authenticated using (true);
create policy "crm_movimenti_cassa_insert" on crm_movimenti_cassa
  for insert to authenticated with check (created_by = auth.uid());
create policy "crm_movimenti_cassa_delete" on crm_movimenti_cassa
  for delete to authenticated using (created_by = auth.uid());
