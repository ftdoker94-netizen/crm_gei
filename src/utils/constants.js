import { BookOpen, CalendarDays, CircleGauge, FileText, HardHat, Landmark, Target, Users } from "lucide-react";

export const navIcons = {
  agenda: CalendarDays,
  cantieri: HardHat,
  clienti: Users,
  dashboard: CircleGauge,
  economia: Landmark,
  opportunita: Target,
  prezzario: BookOpen,
  preventivi: FileText,
};

export const appointmentTypes = [
  { value: "appointment", label: "Appuntamento" },
  { value: "visit", label: "Sopralluogo" },
  { value: "project", label: "Cantiere / progetto" },
  { value: "quote", label: "Preventivo" },
  { value: "call", label: "Telefonata / follow-up" },
];

export const customerTypes = ["Privato", "Condominio", "Amministratore", "Azienda"];
export const customerStatuses = ["Nuova richiesta", "Sopralluogo", "Preventivo", "Cantiere attivo", "Accettato", "Archiviato"];
export const quoteStatuses = [
  { value: "bozza", label: "Bozza" },
  { value: "inviato", label: "Inviato" },
  { value: "accettato", label: "Accettato" },
  { value: "rifiutato", label: "Rifiutato" },
  { value: "scaduto", label: "Scaduto" },
];
export const opportunitySources = ["Lead", "Cliente", "Amministratore", "Passaparola", "Richiesta diretta"];
export const opportunityTypes = ["Computo metrico", "Sopralluogo", "Preventivo", "Manutenzione", "Nuovo cantiere"];
export const opportunityPriorities = ["bassa", "media", "alta"];
export const opportunityPipelineStages = [
  { value: "nuova", label: "Nuova richiesta", tone: "new" },
  { value: "da_qualificare", label: "Da qualificare", tone: "qualify" },
  { value: "computo_documenti", label: "Computo / documenti", tone: "docs" },
  { value: "analisi_tecnica", label: "Analisi tecnica", tone: "analysis" },
  { value: "preventivo_preparazione", label: "Preventivo in preparazione", tone: "quote-draft" },
  { value: "preventivo_inviato", label: "Preventivo inviato", tone: "quote-sent" },
  { value: "follow_up", label: "Follow-up", tone: "follow-up" },
  { value: "vinta", label: "Vinta", tone: "won" },
  { value: "persa", label: "Persa", tone: "lost" },
];
export const closedOpportunityStatuses = ["vinta", "persa"];
export const bidDecisionLabels = {
  da_valutare: "Da valutare",
  procedere: "Procedere",
  non_procedere: "Non procedere",
};
export const stepStatuses = {
  da_fare: "Da fare",
  in_corso: "In corso",
  completato: "Completato",
  bloccato: "Bloccato",
};

export const cantiereStati = ["aperto", "sospeso", "chiuso"];
export const cantiereStatoLabels = {
  aperto: "Aperto",
  sospeso: "Sospeso",
  chiuso: "Chiuso",
};
export const costoCategorie = ["manodopera", "materiali", "subappalti", "attrezzature_noleggi", "altro"];
export const costoCategorieLabels = {
  manodopera: "Manodopera",
  materiali: "Materiali",
  subappalti: "Subappalti",
  attrezzature_noleggi: "Attrezzature/noleggi",
  altro: "Altro",
};
export const costoTipi = ["consuntivo", "previsto"];
export const costoTipiLabels = {
  consuntivo: "Consuntivo",
  previsto: "Previsto",
};
export const movimentoCassaTipi = ["entrata", "uscita"];

export const meteoOpzioni = ["sereno", "nuvolo", "pioggia", "vento", "altro"];
export const meteoLabels = {
  sereno: "Sereno",
  nuvolo: "Nuvolo",
  pioggia: "Pioggia",
  vento: "Vento",
  altro: "Altro",
};

export const agendaEventTypes = [
  { value: "riunione", label: "Riunione" },
  { value: "sopralluogo", label: "Sopralluogo" },
  { value: "scadenza", label: "Scadenza" },
  { value: "altro", label: "Altro" },
];
