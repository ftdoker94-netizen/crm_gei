-- Fusione definitiva di Pratiche dentro Opportunità (multi-settore abbandonato,
-- il CRM resta solo edilizia). crm_pratiche non aveva righe reali (verificato
-- prima di questa migrazione), quindi non serve alcuna migrazione dati.
--
-- crm_opportunity_storico sostituisce crm_pratica_storico ma adattato al
-- modello reale delle opportunità: non esiste una tabella di step per
-- opportunità (a differenza di crm_pratica_steps per settore), le opportunità
-- si muovono lungo la pipeline fissa in opportunityPipelineStages (colonna
-- crm_opportunities.status, testo), quindi qui tracciamo stato_precedente /
-- stato_nuovo come testo invece di uuid verso una tabella step. Le opportunità
-- non hanno nemmeno un singolo campo "responsabile" da riassegnare (usano
-- crm_assignments multi-utente), quindi non c'è un tipo 'responsabile' qui:
-- solo 'creazione' e 'stato'.
--
-- crm_opportunity_documenti sostituisce crm_pratica_documenti, stessa struttura.

create table crm_opportunity_storico (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references crm_opportunities(id) on delete cascade,
  tipo text not null check (tipo in ('creazione', 'stato')),
  stato_precedente text,
  stato_nuovo text,
  nota text,
  actor_id uuid references crm_profiles(id),
  created_at timestamptz not null default now()
);

create index crm_opportunity_storico_opportunity_idx on crm_opportunity_storico(opportunity_id, created_at desc);

create table crm_opportunity_documenti (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references crm_opportunities(id) on delete cascade,
  nome text not null,
  tipo text,
  url text,
  dati_estratti jsonb,
  caricato_da uuid references crm_profiles(id),
  created_at timestamptz not null default now()
);

create index crm_opportunity_documenti_opportunity_idx on crm_opportunity_documenti(opportunity_id);

-- RLS coerente con lo stile già in uso per crm_opportunities/crm_opportunity_steps:
-- nessuna restrizione di visibilità (CRM interno, tutto il team autenticato vede
-- tutto), scrittura aperta, cancellazione riservata a chi ha creato la riga.
-- Lo storico è un log: niente update/delete, così resta immutabile.

alter table crm_opportunity_storico enable row level security;
alter table crm_opportunity_documenti enable row level security;

create policy "crm_opportunity_storico_select" on crm_opportunity_storico
  for select to authenticated using (true);

create policy "crm_opportunity_storico_insert" on crm_opportunity_storico
  for insert to authenticated with check (actor_id = auth.uid());

create policy "crm_opportunity_documenti_select" on crm_opportunity_documenti
  for select to authenticated using (true);

create policy "crm_opportunity_documenti_insert" on crm_opportunity_documenti
  for insert to authenticated with check (caricato_da = auth.uid());

create policy "crm_opportunity_documenti_delete" on crm_opportunity_documenti
  for delete to authenticated using (caricato_da = auth.uid());
