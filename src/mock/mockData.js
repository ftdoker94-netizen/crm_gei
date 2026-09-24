// Dati di esempio usati automaticamente quando Supabase non è configurato
// (vedi src/services/supabaseClient.js -> isSupabaseConfigured).
// Le forme rispecchiano l'output di crmRepository.js, cosi i componenti
// non devono distinguere demo/produzione.

export const DEMO_USER = {
  id: "demo-user",
  email: "demo@dolcera.local",
  user_metadata: { full_name: "Utente Demo" },
};

export const teamMembers = [
  { id: "u1", name: "Anna Bianchi", email: "anna.bianchi@gei.it" },
  { id: "u2", name: "Marco Verdi", email: "marco.verdi@gei.it" },
  { id: "u3", name: "Giulia Neri", email: "giulia.neri@gei.it" },
  { id: "u4", name: "Luca Ferri", email: "luca.ferri@gei.it" },
];

const member = (id) => teamMembers.find((item) => item.id === id);
const assignment = (userId, role = "responsabile") => ({ id: `as-${userId}-${role}`, role, userId, userName: member(userId)?.name || "Team GEI" });

// --- Clienti -----------------------------------------------------------------

export const customers = [
  {
    activities: [
      { id: "act-1", action: "cliente_creato", actor: "Anna Bianchi", createdAt: "2026-06-02T09:00:00.000Z", dateLabel: "2 giugno 2026", detail: "Creata anagrafica cliente Condominio Aurora" },
    ],
    address: "Via Roma 12, Bologna",
    assignedUsers: [assignment("u1")],
    createdAt: "2026-06-02T09:00:00.000Z",
    createdBy: "Anna Bianchi",
    email: "amministrazione@condominioaurora.it",
    id: "cust-1",
    lastContact: "10 luglio 2026",
    name: "Condominio Aurora",
    openValue: "€ 42.000",
    phone: "+39 051 1234567",
    primaryContact: "Amm. Paolo Conti",
    projects: ["Facciata", "Tetto"],
    status: "Cantiere attivo",
    tags: ["Alta priorità"],
    type: "Condominio",
    updatedAt: "2026-07-10T09:00:00.000Z",
    updatedBy: "Marco Verdi",
  },
  {
    activities: [],
    address: "Via dei Mille 45, Modena",
    assignedUsers: [assignment("u2")],
    createdAt: "2026-05-14T09:00:00.000Z",
    createdBy: "Marco Verdi",
    email: "info@rossicostruzioni.it",
    id: "cust-2",
    lastContact: "1 luglio 2026",
    name: "Rossi Costruzioni Srl",
    openValue: "€ 18.500",
    phone: "+39 059 2345678",
    primaryContact: "Sig. Enrico Rossi",
    projects: ["Ristrutturazione capannone"],
    status: "Preventivo",
    tags: [],
    type: "Azienda",
    updatedAt: "2026-07-01T09:00:00.000Z",
    updatedBy: "Marco Verdi",
  },
  {
    activities: [],
    address: "Via Garibaldi 3, Reggio Emilia",
    assignedUsers: [assignment("u3")],
    createdAt: "2026-04-20T09:00:00.000Z",
    createdBy: "Giulia Neri",
    email: "famiglia.ferrari@example.it",
    id: "cust-3",
    lastContact: "18 luglio 2026",
    name: "Famiglia Ferrari",
    openValue: "€ 26.000",
    phone: "+39 0522 345678",
    primaryContact: "Sig.ra Elena Ferrari",
    projects: ["Impianto fotovoltaico 6kW"],
    status: "Cantiere attivo",
    tags: ["Fotovoltaico"],
    type: "Privato",
    updatedAt: "2026-07-18T09:00:00.000Z",
    updatedBy: "Giulia Neri",
  },
  {
    activities: [],
    address: "Via Emilia 210, Parma",
    assignedUsers: [assignment("u4")],
    createdAt: "2026-06-11T09:00:00.000Z",
    createdBy: "Luca Ferri",
    email: "agrisole.parma@example.it",
    id: "cust-4",
    lastContact: "15 luglio 2026",
    name: "Agrisole Parma Srl",
    openValue: "€ 65.000",
    phone: "+39 0521 456789",
    primaryContact: "Sig. Davide Bruni",
    projects: ["Impianto fotovoltaico industriale 100kW"],
    status: "Preventivo",
    tags: ["Fotovoltaico", "Azienda"],
    type: "Azienda",
    updatedAt: "2026-07-15T09:00:00.000Z",
    updatedBy: "Luca Ferri",
  },
  {
    activities: [],
    address: "Via Cavour 8, Bologna",
    assignedUsers: [assignment("u1")],
    createdAt: "2026-05-05T09:00:00.000Z",
    createdBy: "Anna Bianchi",
    email: "mario.galli@example.it",
    id: "cust-5",
    lastContact: "20 luglio 2026",
    name: "Sig. Mario Galli",
    openValue: "€ 180.000",
    phone: "+39 051 5678901",
    primaryContact: "Sig. Mario Galli",
    projects: ["Mutuo prima casa"],
    status: "Nuova richiesta",
    tags: ["Mutuo"],
    type: "Privato",
    updatedAt: "2026-07-20T09:00:00.000Z",
    updatedBy: "Anna Bianchi",
  },
  {
    activities: [],
    address: "Via Indipendenza 60, Bologna",
    assignedUsers: [assignment("u2")],
    createdAt: "2026-03-01T09:00:00.000Z",
    createdBy: "Marco Verdi",
    email: "laura.moretti@example.it",
    id: "cust-6",
    lastContact: "5 luglio 2026",
    name: "Sig.ra Laura Moretti",
    openValue: "€ 35.000",
    phone: "+39 051 6789012",
    primaryContact: "Sig.ra Laura Moretti",
    projects: ["Prestito personale ristrutturazione"],
    status: "Cantiere attivo",
    tags: ["Prestito"],
    type: "Privato",
    updatedAt: "2026-07-05T09:00:00.000Z",
    updatedBy: "Marco Verdi",
  },
];

// --- Agenda condivisa ---------------------------------------------------------

export const agendaEventi = [
  { id: "ag-1", titolo: "Sopralluogo tetto Condominio Aurora", descrizione: "Verifica stato tetto con tecnico esterno.", data: "2026-07-24", ora: "09:30", tipo: "sopralluogo", opportunityId: null, creatoDa: "u1", partecipanti: [assignment("u1")] },
  { id: "ag-2", titolo: "Riunione settimanale team", descrizione: "Allineamento sulle opportunità aperte.", data: "2026-07-24", ora: "17:00", tipo: "riunione", opportunityId: null, creatoDa: "u1", partecipanti: [assignment("u1"), assignment("u2"), assignment("u3"), assignment("u4")] },
  { id: "ag-4", titolo: "Firma contratto Rossi Costruzioni", descrizione: "Firma contratto ristrutturazione capannone.", data: "2026-07-25", ora: "15:00", tipo: "riunione", opportunityId: "opp-2", creatoDa: "u2", partecipanti: [assignment("u2")] },
];

// --- Storico opportunità ------------------------------------------------------

export const opportunityStorico = [
  { id: "st-1", opportunityId: "opp-1", tipo: "creazione", statoPrecedente: null, statoNuovo: "nuova", nota: "Opportunità creata.", actorId: "u1", createdAt: "2026-06-15T09:00:00.000Z" },
  { id: "st-2", opportunityId: "opp-1", tipo: "stato", statoPrecedente: "nuova", statoNuovo: "preventivo_inviato", nota: "Preventivo inviato via email.", actorId: "u1", createdAt: "2026-06-20T09:00:00.000Z" },
  { id: "st-3", opportunityId: "opp-2", tipo: "creazione", statoPrecedente: null, statoNuovo: "nuova", nota: "Opportunità creata.", actorId: "u2", createdAt: "2026-05-14T09:00:00.000Z" },
  { id: "st-4", opportunityId: "opp-2", tipo: "stato", statoPrecedente: "nuova", statoNuovo: "analisi_tecnica", nota: "Richiesta ricevuta telefonicamente.", actorId: "u2", createdAt: "2026-05-14T09:00:00.000Z" },
];

// --- Documenti di opportunità (import/OCR riusato dal modulo Preventivi) ----

export const opportunityDocumenti = [
  {
    id: "doc-1",
    opportunityId: "opp-1",
    nome: "Computo metrico facciata",
    tipo: "pdf",
    caricatoDa: "u2",
    createdAt: "2026-06-05T09:00:00.000Z",
    datiEstratti: {
      items: [
        { description: "Rimozione intonaco ammalorato", id: "doc-item-1", quantity: 120, unit: "mq", unitPrice: 18 },
        { description: "Applicazione cappotto termico", id: "doc-item-2", quantity: 120, unit: "mq", unitPrice: 65 },
      ],
      usedOcr: false,
      warnings: [],
    },
  },
];

// --- Opportunità, appuntamenti, preventivi, prezzario -----------------------

export const opportunities = [
  {
    assignedUsers: [assignment("u1")], bidDecision: "procedere", createdAt: "2026-06-15T09:00:00.000Z", createdBy: "Anna Bianchi",
    customerId: "cust-1", customerName: "Condominio Aurora", description: "Richiesta computo metrico per rifacimento facciata.",
    dueDate: "2026-08-15", dueDateLabel: "15 agosto 2026", estimatedCost: "€ 30.000", estimatedCostNumber: 30000,
    estimatedValue: "€ 42.000", estimatedValueNumber: 42000, id: "opp-1", lossReason: "", margin: "€ 12.000", marginNumber: 12000,
    nextAction: "Inviare preventivo dettagliato", probability: 70, priority: "alta", source: "Amministratore", status: "preventivo_inviato",
    steps: [
      { assignedUsers: [assignment("u1")], createdAt: "2026-06-15T09:00:00.000Z", createdBy: "Anna Bianchi", detail: "Ricevuto computo metrico dall'amministratore.", id: "step-1", opportunityId: "opp-1", parentStepId: null, position: 1, status: "completato", title: "Opportunità ricevuta", updatedAt: "2026-06-15T09:00:00.000Z", updatedBy: "Anna Bianchi" },
      { assignedUsers: [assignment("u1")], createdAt: "2026-06-20T09:00:00.000Z", createdBy: "Anna Bianchi", detail: "Preventivo inviato via email.", id: "step-2", opportunityId: "opp-1", parentStepId: "step-1", position: 2, status: "completato", title: "Preventivo inviato", updatedAt: "2026-06-20T09:00:00.000Z", updatedBy: "Anna Bianchi" },
    ],
    title: "Rifacimento facciata Condominio Aurora", type: "Preventivo", updatedAt: "2026-06-20T09:00:00.000Z", updatedBy: "Anna Bianchi",
  },
  {
    assignedUsers: [assignment("u2")], bidDecision: "da_valutare", createdAt: "2026-05-14T09:00:00.000Z", createdBy: "Marco Verdi",
    customerId: "cust-2", customerName: "Rossi Costruzioni Srl", description: "Ristrutturazione capannone con nuova copertura.",
    dueDate: "2026-09-01", dueDateLabel: "1 settembre 2026", estimatedCost: "€ 13.000", estimatedCostNumber: 13000,
    estimatedValue: "€ 18.500", estimatedValueNumber: 18500, id: "opp-2", lossReason: "", margin: "€ 5.500", marginNumber: 5500,
    nextAction: "Programmare sopralluogo tecnico", probability: 40, priority: "media", source: "Lead", status: "analisi_tecnica",
    steps: [
      { assignedUsers: [assignment("u2")], createdAt: "2026-05-14T09:00:00.000Z", createdBy: "Marco Verdi", detail: "Richiesta ricevuta telefonicamente.", id: "step-3", opportunityId: "opp-2", parentStepId: null, position: 1, status: "completato", title: "Opportunità ricevuta", updatedAt: "2026-05-14T09:00:00.000Z", updatedBy: "Marco Verdi" },
    ],
    title: "Ristrutturazione capannone Rossi", type: "Sopralluogo", updatedAt: "2026-05-14T09:00:00.000Z", updatedBy: "Marco Verdi",
  },
];

export const appointments = [
  { assignedUsers: [assignment("u1")], date: "2026-07-24", day: 24, detail: "Verifica stato tetto con tecnico esterno.", id: "app-1", related: "Condominio Aurora", time: "09:30", title: "Sopralluogo tetto Condominio Aurora", type: "visit" },
  { assignedUsers: [assignment("u1"), assignment("u2"), assignment("u3"), assignment("u4")], date: "2026-07-24", day: 24, detail: "Allineamento team su opportunità e cantieri aperti.", id: "app-2", related: "", time: "17:00", title: "Riunione settimanale team", type: "appointment" },
  { assignedUsers: [assignment("u2")], date: "2026-07-25", day: 25, detail: "Firma contratto ristrutturazione capannone.", id: "app-3", related: "Rossi Costruzioni Srl", time: "15:00", title: "Firma contratto Rossi Costruzioni", type: "appointment" },
  { assignedUsers: [assignment("u3")], date: "2026-07-30", day: 30, detail: "Sopralluogo tecnico per ampliamento impianto.", id: "app-4", related: "Famiglia Ferrari", time: "10:00", title: "Perizia impianto Ferrari", type: "visit" },
];

export const quotes = [
  {
    createdAt: "2026-06-20T09:00:00.000Z", createdBy: "Anna Bianchi", customerId: "cust-1", customerName: "Condominio Aurora",
    discount: 5, discountValue: "€ 1.890", id: "quote-1", issueDate: "2026-06-20",
    items: [
      { description: "Rimozione intonaco ammalorato", id: "qi-1", quantity: 120, unit: "mq", unitPrice: 18 },
      { description: "Applicazione cappotto termico", id: "qi-2", quantity: 120, unit: "mq", unitPrice: 65 },
      { description: "Tinteggiatura finale", id: "qi-3", quantity: 120, unit: "mq", unitPrice: 12 },
    ],
    notes: "Tempi di consegna: 45 giorni lavorativi dalla firma.", opportunityId: "opp-1", opportunityTitle: "Rifacimento facciata Condominio Aurora",
    quoteNumber: "PREV-2026-001", status: "accettato", subject: "Rifacimento facciata condominiale", subtotal: "€ 37.800", subtotalNumber: 37800,
    taxable: "€ 35.910", total: "€ 43.810", totalNumber: 43810, updatedAt: "2026-06-25T09:00:00.000Z", updatedBy: "Anna Bianchi",
    validUntil: "2026-08-20", vat: "€ 7.900", vatRate: 22,
  },
];

export const priceList = [
  { active: true, category: "Facciate", code: "FAC-001", createdById: "u1", description: "Rimozione intonaco ammalorato", id: "price-1", unit: "mq", unitPrice: 18, updatedAt: "2026-01-10T09:00:00.000Z" },
  { active: true, category: "Facciate", code: "FAC-002", createdById: "u1", description: "Applicazione cappotto termico", id: "price-2", unit: "mq", unitPrice: 65, updatedAt: "2026-01-10T09:00:00.000Z" },
  { active: true, category: "Facciate", code: "FAC-003", createdById: "u1", description: "Tinteggiatura finale", id: "price-3", unit: "mq", unitPrice: 12, updatedAt: "2026-01-10T09:00:00.000Z" },
  { active: true, category: "Fotovoltaico", code: "FV-001", createdById: "u3", description: "Pannello fotovoltaico 450W", id: "price-4", unit: "cad", unitPrice: 180, updatedAt: "2026-01-10T09:00:00.000Z" },
  { active: true, category: "Fotovoltaico", code: "FV-002", createdById: "u3", description: "Inverter ibrido 6kW", id: "price-5", unit: "cad", unitPrice: 2200, updatedAt: "2026-01-10T09:00:00.000Z" },
];

// --- Cantieri: costi, ore, marginalità ---------------------------------------

export const cantieri = [
  {
    id: "cant-1", opportunityId: "opp-1", clienteId: "cust-1", titolo: "Rifacimento facciata Condominio Aurora",
    indirizzo: "Via Roma 12, Bologna", valoreCommessa: 42000, dataApertura: "2026-07-01", dataChiusuraPrevista: "2026-09-30",
    stato: "aperto", responsabileId: "u2", createdBy: "u1", updatedBy: "u2",
  },
];

export const cantiereCosti = [
  { id: "cc-1", cantiereId: "cant-1", categoria: "materiali", descrizione: "Cappotto termico e intonaco", importo: 14000, data: "2026-07-05", fornitore: "Edilmat Srl", tipo: "consuntivo", createdBy: "u2", createdAt: "2026-07-05T09:00:00.000Z" },
  { id: "cc-2", cantiereId: "cant-1", categoria: "manodopera", descrizione: "Squadra applicazione cappotto", importo: 9000, data: "2026-07-20", fornitore: "", tipo: "consuntivo", createdBy: "u2", createdAt: "2026-07-20T09:00:00.000Z" },
  { id: "cc-3", cantiereId: "cant-1", categoria: "subappalti", descrizione: "Tinteggiatura finale (previsto)", importo: 4500, data: "2026-09-15", fornitore: "Colorificio Bruni", tipo: "previsto", createdBy: "u2", createdAt: "2026-07-20T09:00:00.000Z" },
];

export const cantiereOre = [
  { id: "co-1", cantiereId: "cant-1", collaboratoreId: "u2", data: "2026-07-20", ore: 8, note: "Applicazione cappotto, giorno 1", createdAt: "2026-07-20T18:00:00.000Z" },
  { id: "co-2", cantiereId: "cant-1", collaboratoreId: "u1", data: "2026-07-21", ore: 6, note: "Supporto squadra", createdAt: "2026-07-21T18:00:00.000Z" },
];

// --- Economia: movimenti di cassa --------------------------------------------

export const movimentiCassa = [
  { id: "mc-1", tipo: "entrata", categoria: "Acconto cantiere", importo: 15000, data: "2026-07-10", descrizione: "Acconto 35% Condominio Aurora", cantiereId: "cant-1", createdAt: "2026-07-10T09:00:00.000Z" },
  { id: "mc-2", tipo: "uscita", categoria: "Materiali", importo: 14000, data: "2026-07-05", descrizione: "Fornitura Edilmat Srl", cantiereId: "cant-1", createdAt: "2026-07-05T09:00:00.000Z" },
  { id: "mc-3", tipo: "uscita", categoria: "Utenze", importo: 320, data: "2026-07-15", descrizione: "Utenze ufficio luglio", cantiereId: null, createdAt: "2026-07-15T09:00:00.000Z" },
];
