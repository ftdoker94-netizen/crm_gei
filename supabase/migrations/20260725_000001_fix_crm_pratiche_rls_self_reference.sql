-- Fix: INSERT/UPDATE con RETURNING su crm_pratiche fallivano sempre con
-- "new row violates row-level security policy for table crm_pratiche",
-- anche per un utente admin.
--
-- Causa: le policy di select/update/delete su crm_pratiche usavano
-- crm_pratica_visible(id), che internamente fa "from crm_pratiche pr where
-- pr.id = target_pratica_id" — cioè ri-interroga la STESSA tabella su cui è
-- definita la policy. Postgres non garantisce che questa auto-referenza veda
-- correttamente la riga appena inserita/aggiornata quando la policy di
-- select viene ri-applicata per la clausola RETURNING (usata sempre dal
-- client Supabase con .select()). Per crm_pratica_storico, crm_pratica_documenti
-- e crm_agenda_eventi non c'è questo problema perché crm_pratica_visible(id)
-- lì interroga una tabella DIVERSA (crm_pratiche) tramite una foreign key,
-- non se stessa: quella funzione resta invariata e continua a essere usata
-- da quelle tre tabelle.
--
-- Fix: per le policy DI crm_pratiche, valutare la visibilità direttamente
-- sulle colonne della riga corrente (settore_id, responsabile_id, id) invece
-- che tramite una nuova query sulla tabella.

create or replace function crm_pratica_visible_row(row_settore_id uuid, row_responsabile_id uuid, row_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from crm_profiles me
    where me.id = auth.uid()
      and (
        me.ruolo = 'admin'
        or (
          me.ruolo = 'responsabile_settore'
          and me.settore_principale_id is not null
          and row_settore_id = me.settore_principale_id
        )
        or (
          me.ruolo = 'collaboratore'
          and (
            row_responsabile_id = auth.uid()
            or exists (
              select 1
              from crm_assignments a
              where a.target_type = 'pratica'
                and a.target_id = row_id
                and a.user_id = auth.uid()
            )
          )
        )
      )
  );
$$;

comment on function crm_pratica_visible_row(uuid, uuid, uuid) is
  'Come crm_pratica_visible(uuid), ma valutata sulle colonne della riga corrente invece che con una query su crm_pratiche, per essere sicura anche su INSERT/UPDATE ... RETURNING.';

drop policy if exists "crm_pratiche_select_by_role" on crm_pratiche;
drop policy if exists "crm_pratiche_update_by_role" on crm_pratiche;
drop policy if exists "crm_pratiche_delete_by_role" on crm_pratiche;

create policy "crm_pratiche_select_by_role" on crm_pratiche
  for select to authenticated
  using (crm_pratica_visible_row(settore_id, responsabile_id, id));

create policy "crm_pratiche_update_by_role" on crm_pratiche
  for update to authenticated
  using (crm_pratica_visible_row(settore_id, responsabile_id, id))
  with check (crm_pratica_visible_row(settore_id, responsabile_id, id));

create policy "crm_pratiche_delete_by_role" on crm_pratiche
  for delete to authenticated
  using (crm_pratica_visible_row(settore_id, responsabile_id, id));

-- crm_pratiche_insert_authenticated (with check (true)) resta invariata:
-- non era lei la causa del problema.
