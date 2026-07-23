// Digest giornaliero: per ogni collaboratore, un'unica email con le
// pratiche di cui e' responsabile che sono gia' in ritardo o scadono entro
// DIGEST_DAYS_AHEAD giorni. Pensata per essere invocata una volta al giorno
// da un cron pg_cron/pg_net (vedi supabase/migrations/20260726_000001_pratiche_digest_cron.sql).
//
// Usa la service role key (bypassa la RLS) perche' deve leggere le pratiche
// di TUTTI i collaboratori per costruire il digest di ciascuno - la
// visibilita' per ruolo qui non e' delegata a Postgres ma e' intrinseca
// alla logica stessa: ogni email contiene solo le pratiche dove
// responsabile_id = quel collaboratore, mai quelle di qualcun altro.
//
// Secrets richiesti (supabase secrets set ...):
//   RESEND_API_KEY        - API key Resend
//   DIGEST_CRON_SECRET    - stringa condivisa, deve combaciare con quella
//                           passata dal job pg_cron nell'header x-cron-secret
//   DIGEST_FROM_EMAIL     - opzionale, default "CRM Gei <onboarding@resend.dev>"
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono gia' iniettati di default da
// Supabase in ogni Edge Function, non vanno impostati a mano.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DIGEST_DAYS_AHEAD = 3;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(year, month - 1, day));
};

const isOverdue = (dateKey: string, todayKey: string) => dateKey < todayKey;

function renderDigestHtml(fullName: string, pratiche: Array<Record<string, unknown>>, todayKey: string) {
  const rows = pratiche
    .map((pratica) => {
      const scadenza = String(pratica.scadenza);
      const overdue = isOverdue(scadenza, todayKey);
      const badge = overdue
        ? `<span style="background:#fde8e8;color:#9b2c35;padding:2px 8px;border-radius:5px;font-weight:700;font-size:12px;">In ritardo</span>`
        : `<span style="background:#fff3dd;color:#a76500;padding:2px 8px;border-radius:5px;font-weight:700;font-size:12px;">In scadenza</span>`;
      return `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;">
            <strong>${pratica.titolo}</strong><br />
            <span style="color:#6d6977;font-size:13px;">${pratica.settoreNome} · ${pratica.customerNome}</span>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;white-space:nowrap;">${formatDateLabel(scadenza)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;white-space:nowrap;">${badge}</td>
        </tr>`;
    })
    .join("");

  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#1d1b22;max-width:600px;margin:0 auto;">
      <p style="color:#6f3ff5;font-weight:700;text-transform:uppercase;font-size:12px;letter-spacing:0.04em;">CRM Gei</p>
      <h1 style="font-size:20px;margin:4px 0 16px;">Le tue pratiche urgenti di oggi</h1>
      <p>Ciao ${fullName || ""}, ecco le pratiche di cui sei responsabile che sono già in ritardo o scadono entro ${DIGEST_DAYS_AHEAD} giorni.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <thead>
          <tr style="text-align:left;font-size:12px;color:#6d6977;">
            <th style="padding:0 8px 8px;">Pratica</th>
            <th style="padding:0 8px 8px;">Scadenza</th>
            <th style="padding:0 8px 8px;">Stato</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#6d6977;font-size:12px;margin-top:20px;">Ricevi questa email perché sei responsabile di almeno una pratica in scadenza. Apri il CRM per aggiornarne lo stato.</p>
    </div>`;
}

async function sendEmail(to: string, fullName: string, pratiche: Array<Record<string, unknown>>, todayKey: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return { error: "RESEND_API_KEY non configurata", sent: false };
  }

  const from = Deno.env.get("DIGEST_FROM_EMAIL") || "CRM Gei <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html: renderDigestHtml(fullName, pratiche, todayKey),
      subject: `${pratiche.length} pratiche urgenti da seguire`,
      to: [to],
    }),
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const detail = await response.text();
    return { error: `Resend ${response.status}: ${detail}`, sent: false };
  }

  return { sent: true };
}

Deno.serve(async (req) => {
  const expectedSecret = Deno.env.get("DIGEST_CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");

  if (expectedSecret && providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const today = new Date();
  const todayKey = toDateKey(today);
  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + DIGEST_DAYS_AHEAD);
  const thresholdKey = toDateKey(threshold);

  const { data: pratiche, error: praticheError } = await supabase
    .from("crm_pratiche")
    .select(`
      id, titolo, scadenza, responsabile_id,
      crm_settori ( nome ),
      crm_customers ( name )
    `)
    .eq("stato", "aperta")
    .not("scadenza", "is", null)
    .not("responsabile_id", "is", null)
    .lte("scadenza", thresholdKey);

  if (praticheError) {
    return new Response(JSON.stringify({ error: praticheError.message }), { status: 500 });
  }

  const byResponsabile = new Map<string, Array<Record<string, unknown>>>();
  for (const row of pratiche ?? []) {
    const list = byResponsabile.get(row.responsabile_id) || [];
    list.push({
      customerNome: (row as any).crm_customers?.name || "Cliente non collegato",
      id: row.id,
      scadenza: row.scadenza,
      settoreNome: (row as any).crm_settori?.nome || "—",
      titolo: row.titolo,
    });
    byResponsabile.set(row.responsabile_id, list);
  }

  if (byResponsabile.size === 0) {
    return new Response(JSON.stringify({ message: "Nessuna pratica urgente oggi.", sentTo: [] }), { status: 200 });
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("crm_profiles")
    .select("id, email, full_name")
    .in("id", [...byResponsabile.keys()]);

  if (profilesError) {
    return new Response(JSON.stringify({ error: profilesError.message }), { status: 500 });
  }

  const results = [];
  for (const profile of profiles ?? []) {
    const userPratiche = byResponsabile.get(profile.id) || [];
    if (!userPratiche.length || !profile.email) continue;

    userPratiche.sort((first, second) => String(first.scadenza).localeCompare(String(second.scadenza)));
    const outcome = await sendEmail(profile.email, profile.full_name, userPratiche, todayKey);
    results.push({ count: userPratiche.length, email: profile.email, ...outcome });
  }

  return new Response(JSON.stringify({ results, sentTo: results.filter((item) => item.sent).map((item) => item.email) }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
