import { formatDateLabel } from "./format.js";

const CSV_HEADERS = ["Settore", "Titolo", "Cliente", "Step attuale", "Responsabile", "Priorità", "Valore", "Scadenza", "Data creazione"];

const escapeCsvCell = (value) => {
  const text = String(value ?? "");
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsvRow = (values) => values.map(escapeCsvCell).join(";");

const formatCreatedAt = (createdAt) => {
  if (!createdAt) return "";
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(createdAt));
};

// Genera il CSV lato client dalle pratiche già caricate (e quindi già
// filtrate per visibilità/ruolo, sia via RLS reale che via mock): nessuna
// nuova query, nessuna differenza di comportamento tra demo e Supabase.
export function buildPraticheCsv(pratiche, { customers = [], praticaSteps = [], settori = [], teamMembers = [] }) {
  const rows = pratiche.map((pratica) => {
    const settoreNome = settori.find((settore) => settore.id === pratica.settoreId)?.nome || "";
    const customerNome = customers.find((customer) => customer.id === pratica.customerId)?.name || "";
    const stepNome = praticaSteps.find((step) => step.id === pratica.stepAttualeId)?.nome || "";
    const responsabileNome = teamMembers.find((member) => member.id === pratica.responsabileId)?.name || "";

    return [
      settoreNome,
      pratica.titolo,
      customerNome,
      stepNome,
      responsabileNome,
      pratica.priorita || "",
      pratica.valore ?? 0,
      pratica.scadenza ? formatDateLabel(pratica.scadenza) : "",
      formatCreatedAt(pratica.createdAt),
    ];
  });

  return [CSV_HEADERS, ...rows].map(toCsvRow).join("\r\n");
}

export function downloadPraticheCsv(pratiche, context, filename = "pratiche.csv") {
  const csv = buildPraticheCsv(pratiche, context);
  // BOM per far riconoscere l'UTF-8 a Excel su Windows.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
