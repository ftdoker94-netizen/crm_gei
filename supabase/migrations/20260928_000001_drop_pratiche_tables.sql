-- Ultima migrazione della fusione Pratiche -> Opportunità: rimuove le tabelle
-- ormai inutilizzate. Applicata solo dopo aver verificato che tutto il resto
-- (fix bug Blocco 0, fusione in Opportunità, frontend) funziona, così resta
-- reversibile fino all'ultimo momento. crm_pratiche non conteneva righe reali
-- (verificato prima di iniziare questo blocco di lavoro).

drop table if exists crm_pratica_documenti;
drop table if exists crm_pratica_storico;
drop table if exists crm_pratiche;
drop table if exists crm_pratica_steps;

drop function if exists crm_pratica_visible(uuid);
drop function if exists crm_pratica_visible_row(uuid, uuid, uuid);

-- settore_principale_id referenziava crm_settori: va tolto prima di poter
-- droppare la tabella. Il ruolo (collaboratore/responsabile_settore/admin)
-- resta per ora com'è: non era nello scope di questa pulizia toccare il
-- modello utenti, solo ritirare il concetto di settore.
alter table crm_profiles drop column if exists settore_principale_id;

drop table if exists crm_settori;

-- 'pratica' non è più un target_type valido per crm_assignments (la tabella
-- che lo usava non esiste più); 'agenda_evento' resta perché ancora in uso.
alter table crm_assignments drop constraint if exists crm_assignments_target_type_check;
alter table crm_assignments add constraint crm_assignments_target_type_check
  check (
    target_type = any (array[
      'cliente'::text,
      'appuntamento'::text,
      'progetto'::text,
      'lavorazione'::text,
      'opportunita'::text,
      'opportunita_step'::text,
      'agenda_evento'::text
    ])
  );

-- Il digest email pratiche non ha più nulla da leggere: rimuoviamo lo
-- scheduling pg_cron in modo definitivo (non solo in pausa come nella
-- migrazione del 2026-07-27). L'Edge Function va rimossa separatamente con
-- `supabase functions delete pratiche-digest` (fuori da questa migrazione,
-- le Edge Function non sono gestite da supabase db push).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'pratiche-digest-daily') then
    perform cron.unschedule('pratiche-digest-daily');
  end if;
end $$;
