-- Sospende temporaneamente il digest email pratiche, in attesa di verificare
-- un dominio su Resend (rimandato per costi, non per problemi tecnici: la
-- pipeline query -> Edge Function -> Resend e' stata confermata funzionante
-- end-to-end il 2026-07-24, si e' fermata solo sulla restrizione sandbox di
-- Resend che permette l'invio solo all'indirizzo del titolare dell'account).
--
-- Usiamo cron.alter_job() invece di cron.unschedule(): quest'ultima CANCELLA
-- la riga da cron.job (nonostante il nome), qui vogliamo solo metterlo in
-- pausa restando visibile in "select * from cron.job". Un semplice
-- "update cron.job set active = false" fallisce con "permission denied for
-- table job" perche' il ruolo di migrazione non ha accesso diretto alla
-- tabella: cron.alter_job() e' l'API pensata apposta per questo, con i
-- permessi giusti gia' concessi. La funzione pratiche-digest e la sua
-- migrazione restano intatte.

select cron.alter_job(job_id := (select jobid from cron.job where jobname = 'pratiche-digest-daily'), active := false);

-- Per riattivarlo in futuro, dopo aver verificato il dominio Resend e
-- impostato il secret DIGEST_FROM_EMAIL su un indirizzo di quel dominio:
--   select cron.alter_job(job_id := (select jobid from cron.job where jobname = 'pratiche-digest-daily'), active := true);
