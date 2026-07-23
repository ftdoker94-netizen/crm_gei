-- crm_assignments.target_type ha un CHECK con una lista chiusa di valori che
-- non include ancora 'pratica' (assegnazione collaboratore su una pratica,
-- usata dalla RLS in 20260723_000001_pratiche_rls_per_ruolo.sql) ne'
-- 'agenda_evento' (partecipanti di un evento agenda, usato da
-- crmRepository.js: createAgendaEvento/fetchAgendaEventi).
-- Senza questa correzione entrambe le funzionalita' falliscono contro il
-- database reale con una violazione del CHECK constraint.

alter table crm_assignments
  drop constraint if exists crm_assignments_target_type_check;

alter table crm_assignments
  add constraint crm_assignments_target_type_check
  check (
    target_type = any (array[
      'cliente'::text,
      'appuntamento'::text,
      'progetto'::text,
      'lavorazione'::text,
      'opportunita'::text,
      'opportunita_step'::text,
      'pratica'::text,
      'agenda_evento'::text
    ])
  );
