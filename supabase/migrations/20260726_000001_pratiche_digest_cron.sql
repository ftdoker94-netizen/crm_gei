-- Digest giornaliero pratiche urgenti: schedula l'invocazione della Edge
-- Function "pratiche-digest" una volta al giorno tramite pg_cron + pg_net.
--
-- Questa migrazione NON contiene nessun segreto: il valore condiviso che il
-- cron manda nell'header x-cron-secret viene letto da Supabase Vault, dove
-- va inserito manualmente (una volta sola) dopo aver applicato questa
-- migrazione, eseguendo nell'SQL Editor (sostituendo il valore con una
-- stringa a caso, la stessa che poi imposterai come secret della funzione
-- con `supabase secrets set DIGEST_CRON_SECRET=...`):
--
--   select vault.create_secret('LA_STESSA_STRINGA_DEL_SECRET_DELLA_FUNZIONE', 'digest_cron_secret');
--
-- Se in futuro la ruoti, aggiorna il valore con:
--   select vault.update_secret(
--     (select id from vault.decrypted_secrets where name = 'digest_cron_secret'),
--     'NUOVO_VALORE'
--   );

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- cron.schedule() e' gia' idempotente per nome: se un job "pratiche-digest-daily"
-- esiste gia' lo sostituisce, non lo duplica.
select cron.schedule(
  'pratiche-digest-daily',
  '0 7 * * *', -- 07:00 UTC ogni giorno
  $$
  select net.http_post(
    url := 'https://vttcfclotcjxzcnbufdr.supabase.co/functions/v1/pratiche-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'digest_cron_secret'), '')
    ),
    body := '{}'::jsonb
  );
  $$
);
