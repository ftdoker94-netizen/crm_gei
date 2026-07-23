-- Modulo "Pratiche" multi-settore (edilizia, fotovoltaico, prestiti_mutui, estendibile)
-- Coerente con le tabelle esistenti con prefisso crm_ (crm_customers, crm_profiles, ...).

-- 1. Settori -----------------------------------------------------------------

create table if not exists crm_settori (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  colore text default '#6f3ff5',
  posizione integer not null default 0,
  attivo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Step per settore ----------------------------------------------------------

create table if not exists crm_pratica_steps (
  id uuid primary key default gen_random_uuid(),
  settore_id uuid not null references crm_settori(id) on delete cascade,
  chiave text not null,
  nome text not null,
  posizione integer not null,
  colore text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (settore_id, posizione),
  unique (settore_id, chiave)
);

-- 3. Pratiche (entita' centrale, trasversale ai settori) -----------------------

create table if not exists crm_pratiche (
  id uuid primary key default gen_random_uuid(),
  settore_id uuid not null references crm_settori(id),
  customer_id uuid references crm_customers(id),
  titolo text not null,
  descrizione text,
  step_attuale_id uuid references crm_pratica_steps(id),
  responsabile_id uuid references crm_profiles(id),
  priorita text not null default 'media' check (priorita in ('bassa', 'media', 'alta', 'urgente')),
  valore numeric(12, 2) not null default 0,
  scadenza date,
  stato text not null default 'aperta' check (stato in ('aperta', 'sospesa', 'conclusa', 'annullata')),
  created_by uuid references crm_profiles(id),
  updated_by uuid references crm_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_pratiche_settore_idx on crm_pratiche(settore_id);
create index if not exists crm_pratiche_step_idx on crm_pratiche(step_attuale_id);
create index if not exists crm_pratiche_responsabile_idx on crm_pratiche(responsabile_id);

-- 4. Storico passaggi (step e responsabile) -----------------------------------
-- E' la parte che serve per il controllo costante: chi, quando, da chi a chi.

create table if not exists crm_pratica_storico (
  id uuid primary key default gen_random_uuid(),
  pratica_id uuid not null references crm_pratiche(id) on delete cascade,
  tipo text not null check (tipo in ('step', 'responsabile', 'creazione')),
  step_precedente_id uuid references crm_pratica_steps(id),
  step_nuovo_id uuid references crm_pratica_steps(id),
  responsabile_precedente_id uuid references crm_profiles(id),
  responsabile_nuovo_id uuid references crm_profiles(id),
  nota text,
  actor_id uuid references crm_profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists crm_pratica_storico_pratica_idx on crm_pratica_storico(pratica_id, created_at desc);

-- 5. Documenti di pratica (per riuso futuro import/OCR preventivi) ------------

create table if not exists crm_pratica_documenti (
  id uuid primary key default gen_random_uuid(),
  pratica_id uuid not null references crm_pratiche(id) on delete cascade,
  nome text not null,
  tipo text,
  url text,
  dati_estratti jsonb,
  caricato_da uuid references crm_profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists crm_pratica_documenti_pratica_idx on crm_pratica_documenti(pratica_id);

-- 6. Agenda condivisa ----------------------------------------------------------
-- Agganciabile a una pratica ma non obbligatoriamente.

create table if not exists crm_agenda_eventi (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  descrizione text,
  data date not null,
  ora time,
  tipo text not null default 'altro' check (tipo in ('riunione', 'sopralluogo', 'scadenza', 'altro')),
  pratica_id uuid references crm_pratiche(id) on delete set null,
  creato_da uuid references crm_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_agenda_eventi_data_idx on crm_agenda_eventi(data);
create index if not exists crm_agenda_eventi_pratica_idx on crm_agenda_eventi(pratica_id);

-- Partecipanti di un evento agenda: riusa crm_assignments esistente con
-- target_type = 'agenda_evento' e target_id = crm_agenda_eventi.id.

-- 7. Estensione crm_profiles: ruolo e settore principale (per RLS futura) -----

alter table crm_profiles
  add column if not exists ruolo text not null default 'collaboratore'
    check (ruolo in ('collaboratore', 'responsabile_settore', 'admin')),
  add column if not exists settore_principale_id uuid references crm_settori(id);

-- 8. Seed settori e step di default -------------------------------------------

insert into crm_settori (slug, nome, colore, posizione) values
  ('edilizia', 'Edilizia', '#6f3ff5', 1),
  ('fotovoltaico', 'Fotovoltaico', '#12805c', 2),
  ('prestiti_mutui', 'Prestiti e Mutui', '#a76500', 3)
on conflict (slug) do nothing;

insert into crm_pratica_steps (settore_id, chiave, nome, posizione)
select s.id, step.chiave, step.nome, step.posizione
from crm_settori s
join (values
  ('edilizia', 'sopralluogo', 'Sopralluogo', 1),
  ('edilizia', 'preventivo', 'Preventivo', 2),
  ('edilizia', 'contratto', 'Contratto firmato', 3),
  ('edilizia', 'cantiere', 'Cantiere in corso', 4),
  ('edilizia', 'collaudo', 'Collaudo', 5),
  ('edilizia', 'chiusura', 'Chiusura pratica', 6),
  ('fotovoltaico', 'sopralluogo', 'Sopralluogo tecnico', 1),
  ('fotovoltaico', 'progettazione', 'Progettazione impianto', 2),
  ('fotovoltaico', 'preventivo', 'Preventivo', 3),
  ('fotovoltaico', 'pratiche_enel', 'Pratiche GSE/Enel', 4),
  ('fotovoltaico', 'installazione', 'Installazione', 5),
  ('fotovoltaico', 'collaudo_gse', 'Collaudo e connessione', 6),
  ('fotovoltaico', 'chiusura', 'Chiusura pratica', 7),
  ('prestiti_mutui', 'raccolta_documenti', 'Raccolta documenti', 1),
  ('prestiti_mutui', 'istruttoria', 'Istruttoria', 2),
  ('prestiti_mutui', 'invio_banca', 'Invio in banca', 3),
  ('prestiti_mutui', 'delibera', 'Delibera', 4),
  ('prestiti_mutui', 'perizia', 'Perizia', 5),
  ('prestiti_mutui', 'rogito_erogazione', 'Rogito/Erogazione', 6),
  ('prestiti_mutui', 'chiusura', 'Chiusura pratica', 7)
) as step(settore_slug, chiave, nome, posizione) on step.settore_slug = s.slug
on conflict (settore_id, chiave) do nothing;

-- 9. Row Level Security --------------------------------------------------------
-- Coerente con un CRM interno: utenti autenticati leggono e scrivono tutto.
-- Da raffinare in futuro per visibilita' per settore (settore_principale_id / ruolo).

alter table crm_settori enable row level security;
alter table crm_pratica_steps enable row level security;
alter table crm_pratiche enable row level security;
alter table crm_pratica_storico enable row level security;
alter table crm_pratica_documenti enable row level security;
alter table crm_agenda_eventi enable row level security;

create policy "crm_settori_authenticated_all" on crm_settori
  for all to authenticated using (true) with check (true);

create policy "crm_pratica_steps_authenticated_all" on crm_pratica_steps
  for all to authenticated using (true) with check (true);

create policy "crm_pratiche_authenticated_all" on crm_pratiche
  for all to authenticated using (true) with check (true);

create policy "crm_pratica_storico_authenticated_all" on crm_pratica_storico
  for all to authenticated using (true) with check (true);

create policy "crm_pratica_documenti_authenticated_all" on crm_pratica_documenti
  for all to authenticated using (true) with check (true);

create policy "crm_agenda_eventi_authenticated_all" on crm_agenda_eventi
  for all to authenticated using (true) with check (true);
