-- Ripunta crm_agenda_eventi da crm_pratiche a crm_opportunities. Nessun evento
-- aveva pratica_id valorizzato (verificato prima di questa migrazione), quindi
-- il rename di colonna non perde alcun collegamento reale.

alter table crm_agenda_eventi drop constraint if exists crm_agenda_eventi_pratica_id_fkey;
alter table crm_agenda_eventi rename column pratica_id to opportunity_id;
alter table crm_agenda_eventi add constraint crm_agenda_eventi_opportunity_id_fkey
  foreign key (opportunity_id) references crm_opportunities(id) on delete set null;

alter index if exists crm_agenda_eventi_pratica_idx rename to crm_agenda_eventi_opportunity_idx;

-- Le policy per-ruolo introdotte per Pratiche (crm_pratica_visible) non hanno
-- più senso: le opportunità non hanno restrizioni di visibilità (vedi
-- crm_opportunities_authenticated_select: using(true)), quindi un evento
-- agganciato a un'opportunità è visibile a tutto il team esattamente come
-- prima. Semplifichiamo le policy di conseguenza.

drop policy if exists "crm_agenda_eventi_select_by_role" on crm_agenda_eventi;
drop policy if exists "crm_agenda_eventi_insert_by_role" on crm_agenda_eventi;
drop policy if exists "crm_agenda_eventi_update_by_role" on crm_agenda_eventi;
drop policy if exists "crm_agenda_eventi_delete_by_role" on crm_agenda_eventi;

create policy "crm_agenda_eventi_select" on crm_agenda_eventi
  for select to authenticated using (true);

create policy "crm_agenda_eventi_insert" on crm_agenda_eventi
  for insert to authenticated with check (true);

create policy "crm_agenda_eventi_update" on crm_agenda_eventi
  for update to authenticated using (true) with check (true);

create policy "crm_agenda_eventi_delete" on crm_agenda_eventi
  for delete to authenticated using (true);
