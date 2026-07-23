-- Visibilità per ruolo su Pratiche, Storico, Documenti e Agenda.
-- Sostituisce le policy permissive "authenticated_all" create in
-- 20260722_000001_pratiche_multisettore.sql per le quattro tabelle qui sotto.
-- Non tocca crm_settori / crm_pratica_steps (restano lette da tutto il team).
--
-- Regole (crm_profiles.ruolo):
--   - collaboratore: vede solo le pratiche dove e' responsabile_id, oppure ha
--     una riga in crm_assignments con target_type='pratica' e target_id=pratica.id
--   - responsabile_settore: vede tutte le pratiche del proprio settore
--     (crm_pratiche.settore_id = crm_profiles.settore_principale_id)
--   - admin: nessuna restrizione
-- crm_pratica_storico e crm_pratica_documenti ereditano la visibilità della
-- pratica collegata (pratica_id). crm_agenda_eventi la eredita solo quando
-- pratica_id è valorizzato; gli eventi senza pratica restano visibili a tutti.

-- 1. Funzione di visibilità, riusata da tutte le policy sotto -----------------
-- security definer perche' deve poter leggere crm_profiles/crm_assignments
-- indipendentemente dalle policy RLS di quelle tabelle.

create or replace function crm_pratica_visible(target_pratica_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from crm_pratiche pr
    join crm_profiles me on me.id = auth.uid()
    where pr.id = target_pratica_id
      and (
        me.ruolo = 'admin'
        or (
          me.ruolo = 'responsabile_settore'
          and me.settore_principale_id is not null
          and pr.settore_id = me.settore_principale_id
        )
        or (
          me.ruolo = 'collaboratore'
          and (
            pr.responsabile_id = auth.uid()
            or exists (
              select 1
              from crm_assignments a
              where a.target_type = 'pratica'
                and a.target_id = pr.id
                and a.user_id = auth.uid()
            )
          )
        )
      )
  );
$$;

comment on function crm_pratica_visible(uuid) is
  'Vero se auth.uid() puo'' vedere la pratica indicata, secondo il ruolo in crm_profiles.';

-- 2. crm_pratiche --------------------------------------------------------------

drop policy if exists "crm_pratiche_authenticated_all" on crm_pratiche;

create policy "crm_pratiche_select_by_role" on crm_pratiche
  for select to authenticated
  using (crm_pratica_visible(id));

-- L'inserimento resta aperto a tutto il team autenticato: chi crea una pratica
-- ne diventa di norma responsabile (vedi createPratica in crmRepository.js) e
-- quindi la vede subito tramite la policy di select sopra.
create policy "crm_pratiche_insert_authenticated" on crm_pratiche
  for insert to authenticated
  with check (true);

create policy "crm_pratiche_update_by_role" on crm_pratiche
  for update to authenticated
  using (crm_pratica_visible(id))
  with check (crm_pratica_visible(id));

create policy "crm_pratiche_delete_by_role" on crm_pratiche
  for delete to authenticated
  using (crm_pratica_visible(id));

-- 3. crm_pratica_storico --------------------------------------------------------
-- E' un log: niente policy di update/delete, cosi lo storico resta immutabile
-- (nessuno, nemmeno admin, puo' modificarlo o cancellarlo via API).

drop policy if exists "crm_pratica_storico_authenticated_all" on crm_pratica_storico;

create policy "crm_pratica_storico_select_by_role" on crm_pratica_storico
  for select to authenticated
  using (crm_pratica_visible(pratica_id));

create policy "crm_pratica_storico_insert_by_role" on crm_pratica_storico
  for insert to authenticated
  with check (crm_pratica_visible(pratica_id));

-- 4. crm_pratica_documenti -------------------------------------------------------

drop policy if exists "crm_pratica_documenti_authenticated_all" on crm_pratica_documenti;

create policy "crm_pratica_documenti_select_by_role" on crm_pratica_documenti
  for select to authenticated
  using (crm_pratica_visible(pratica_id));

create policy "crm_pratica_documenti_insert_by_role" on crm_pratica_documenti
  for insert to authenticated
  with check (crm_pratica_visible(pratica_id));

create policy "crm_pratica_documenti_delete_by_role" on crm_pratica_documenti
  for delete to authenticated
  using (crm_pratica_visible(pratica_id));

-- 5. crm_agenda_eventi -----------------------------------------------------------
-- pratica_id è opzionale: un evento senza pratica collegata resta visibile a
-- tutto il team (agenda davvero condivisa); se e' collegato a una pratica ne
-- eredita la visibilità.

drop policy if exists "crm_agenda_eventi_authenticated_all" on crm_agenda_eventi;

create policy "crm_agenda_eventi_select_by_role" on crm_agenda_eventi
  for select to authenticated
  using (pratica_id is null or crm_pratica_visible(pratica_id));

create policy "crm_agenda_eventi_insert_by_role" on crm_agenda_eventi
  for insert to authenticated
  with check (pratica_id is null or crm_pratica_visible(pratica_id));

create policy "crm_agenda_eventi_update_by_role" on crm_agenda_eventi
  for update to authenticated
  using (pratica_id is null or crm_pratica_visible(pratica_id))
  with check (pratica_id is null or crm_pratica_visible(pratica_id));

create policy "crm_agenda_eventi_delete_by_role" on crm_agenda_eventi
  for delete to authenticated
  using (pratica_id is null or crm_pratica_visible(pratica_id));

-- Nota: questa migrazione assume che crm_assignments.target_type sia una
-- colonna text senza vincolo CHECK rigido (coerente con l'uso gia' fatto altrove
-- nel progetto per 'cliente', 'appuntamento', 'opportunita', 'opportunita_step',
-- 'agenda_evento'). Se in produzione esiste un CHECK che elenca i valori
-- ammessi, aggiungici 'pratica' prima di applicare questa migrazione.
