-- Modulo Cantieri: costi, ore, marginalità. Un cantiere nasce (di norma) da
-- un'opportunità vinta, ma opportunity_id resta nullable per coprire cantieri
-- inseriti a mano senza un'opportunità collegata.

create table crm_cantieri (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references crm_opportunities(id) on delete set null,
  cliente_id uuid references crm_customers(id) on delete set null,
  titolo text not null,
  indirizzo text,
  valore_commessa numeric(12, 2) not null default 0,
  data_apertura date not null default current_date,
  data_chiusura_prevista date,
  stato text not null default 'aperto' check (stato in ('aperto', 'sospeso', 'chiuso')),
  responsabile_id uuid references crm_profiles(id),
  created_by uuid references crm_profiles(id),
  updated_by uuid references crm_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index crm_cantieri_opportunity_idx on crm_cantieri(opportunity_id);
create index crm_cantieri_cliente_idx on crm_cantieri(cliente_id);
create index crm_cantieri_stato_idx on crm_cantieri(stato);

create trigger crm_cantieri_set_updated_at before update on crm_cantieri
  for each row execute function crm_set_updated_at();

create table crm_cantiere_costi (
  id uuid primary key default gen_random_uuid(),
  cantiere_id uuid not null references crm_cantieri(id) on delete cascade,
  categoria text not null check (categoria in ('manodopera', 'materiali', 'subappalti', 'attrezzature_noleggi', 'altro')),
  descrizione text not null,
  importo numeric(12, 2) not null default 0,
  data date not null default current_date,
  fornitore text,
  tipo text not null check (tipo in ('consuntivo', 'previsto')),
  created_by uuid references crm_profiles(id),
  created_at timestamptz not null default now()
);

create index crm_cantiere_costi_cantiere_idx on crm_cantiere_costi(cantiere_id, tipo);

create table crm_cantiere_ore (
  id uuid primary key default gen_random_uuid(),
  cantiere_id uuid not null references crm_cantieri(id) on delete cascade,
  collaboratore_id uuid references crm_profiles(id),
  data date not null default current_date,
  ore numeric(5, 2) not null,
  note text,
  created_by uuid references crm_profiles(id),
  created_at timestamptz not null default now()
);

create index crm_cantiere_ore_cantiere_idx on crm_cantiere_ore(cantiere_id);

-- Marginalità calcolata lato database (non solo frontend): vista che
-- aggrega i costi consuntivo/previsto per cantiere e ne deriva margine
-- attuale, margine previsto a finire, percentuale sul valore commessa.
create view crm_cantieri_marginalita as
select
  c.id as cantiere_id,
  c.valore_commessa,
  coalesce(sum(cc.importo) filter (where cc.tipo = 'consuntivo'), 0) as costi_consuntivo,
  coalesce(sum(cc.importo) filter (where cc.tipo = 'previsto'), 0) as costi_previsto,
  c.valore_commessa - coalesce(sum(cc.importo) filter (where cc.tipo = 'consuntivo'), 0) as margine_attuale,
  c.valore_commessa
    - coalesce(sum(cc.importo) filter (where cc.tipo = 'consuntivo'), 0)
    - coalesce(sum(cc.importo) filter (where cc.tipo = 'previsto'), 0) as margine_previsto_a_finire,
  case when c.valore_commessa = 0 then 0
    else round(
      (c.valore_commessa - coalesce(sum(cc.importo) filter (where cc.tipo = 'consuntivo'), 0))
      / c.valore_commessa * 100, 1
    )
  end as percentuale_margine
from crm_cantieri c
left join crm_cantiere_costi cc on cc.cantiere_id = c.id
group by c.id, c.valore_commessa;

-- RLS coerente con lo stile già in uso per crm_opportunities: nessuna
-- restrizione di visibilità, scrittura aperta al team autenticato,
-- cancellazione riservata a chi ha creato la riga.

alter table crm_cantieri enable row level security;
alter table crm_cantiere_costi enable row level security;
alter table crm_cantiere_ore enable row level security;

create policy "crm_cantieri_select" on crm_cantieri
  for select to authenticated using (true);
create policy "crm_cantieri_insert" on crm_cantieri
  for insert to authenticated with check (created_by = auth.uid());
create policy "crm_cantieri_update" on crm_cantieri
  for update to authenticated using (true) with check (updated_by = auth.uid());
create policy "crm_cantieri_delete" on crm_cantieri
  for delete to authenticated using (created_by = auth.uid());

create policy "crm_cantiere_costi_select" on crm_cantiere_costi
  for select to authenticated using (true);
create policy "crm_cantiere_costi_insert" on crm_cantiere_costi
  for insert to authenticated with check (created_by = auth.uid());
create policy "crm_cantiere_costi_delete" on crm_cantiere_costi
  for delete to authenticated using (created_by = auth.uid());

create policy "crm_cantiere_ore_select" on crm_cantiere_ore
  for select to authenticated using (true);
create policy "crm_cantiere_ore_insert" on crm_cantiere_ore
  for insert to authenticated with check (created_by = auth.uid());
create policy "crm_cantiere_ore_delete" on crm_cantiere_ore
  for delete to authenticated using (created_by = auth.uid());
