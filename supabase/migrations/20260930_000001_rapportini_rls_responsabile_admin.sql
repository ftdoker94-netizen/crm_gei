-- Estende chi può modificare/eliminare un rapportino o una sua foto: non solo
-- chi lo ha creato (autore_id / caricato_da), ma anche il responsabile del
-- cantiere collegato e chi ha ruolo admin.
--
-- Stato verificato di crm_profiles.ruolo prima di questa migrazione: il
-- CHECK constraint ammette ancora ('collaboratore', 'responsabile_settore',
-- 'admin') per compatibilità storica, ma 'responsabile_settore' non è più
-- usato da nessuna riga reale (il concetto di settore è stato ritirato in
-- feature/cantieri-marginalita) e non ha più senso semantico: i valori
-- effettivamente in uso oggi sono solo 'collaboratore' e 'admin'. Le funzioni
-- qui sotto controllano quindi ruolo = 'admin', non 'responsabile_settore'.
-- Non tocchiamo il CHECK constraint stesso: non era nello scope di questa
-- richiesta e rimuoverlo non è necessario per la logica di permesso.

create or replace function crm_cantiere_rapportino_editable(target_autore_id uuid, target_cantiere_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = target_autore_id
    or exists (
      select 1 from crm_cantieri c
      where c.id = target_cantiere_id and c.responsabile_id = auth.uid()
    )
    or exists (
      select 1 from crm_profiles p
      where p.id = auth.uid() and p.ruolo = 'admin'
    );
$$;

comment on function crm_cantiere_rapportino_editable(uuid, uuid) is
  'Vero se auth.uid() puo'' modificare/eliminare un rapportino: ne e'' l''autore, e'' responsabile del cantiere collegato, oppure ha ruolo admin.';

create or replace function crm_rapportino_foto_editable(target_caricato_da uuid, target_rapportino_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = target_caricato_da
    or exists (
      select 1 from crm_cantiere_rapportini r
      join crm_cantieri c on c.id = r.cantiere_id
      where r.id = target_rapportino_id and c.responsabile_id = auth.uid()
    )
    or exists (
      select 1 from crm_profiles p
      where p.id = auth.uid() and p.ruolo = 'admin'
    );
$$;

comment on function crm_rapportino_foto_editable(uuid, uuid) is
  'Vero se auth.uid() puo'' eliminare una foto di rapportino: l''ha caricata lui, e'' responsabile del cantiere del rapportino, oppure ha ruolo admin.';

-- crm_cantiere_rapportini: sostituisce le policy update/delete precedenti
-- (riservate al solo autore_id) con la nuova logica.

drop policy if exists "crm_cantiere_rapportini_update" on crm_cantiere_rapportini;
drop policy if exists "crm_cantiere_rapportini_delete" on crm_cantiere_rapportini;

create policy "crm_cantiere_rapportini_update" on crm_cantiere_rapportini
  for update to authenticated
  using (crm_cantiere_rapportino_editable(autore_id, cantiere_id))
  with check (crm_cantiere_rapportino_editable(autore_id, cantiere_id));

create policy "crm_cantiere_rapportini_delete" on crm_cantiere_rapportini
  for delete to authenticated
  using (crm_cantiere_rapportino_editable(autore_id, cantiere_id));

-- crm_rapportino_foto: sostituisce la policy delete precedente (riservata al
-- solo caricato_da). Non c'e' una policy update: le foto non si modificano,
-- solo si caricano o si eliminano.

drop policy if exists "crm_rapportino_foto_delete" on crm_rapportino_foto;

create policy "crm_rapportino_foto_delete" on crm_rapportino_foto
  for delete to authenticated
  using (crm_rapportino_foto_editable(caricato_da, rapportino_id));
