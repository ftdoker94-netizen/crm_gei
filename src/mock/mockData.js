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

// --- Settori e step di lavorazione (allineati alla migrazione SQL) ---------

export const settori = [
  { id: "settore-edilizia", slug: "edilizia", nome: "Edilizia", colore: "#6f3ff5", posizione: 1 },
  { id: "settore-fotovoltaico", slug: "fotovoltaico", nome: "Fotovoltaico", colore: "#12805c", posizione: 2 },
  { id: "settore-prestiti_mutui", slug: "prestiti_mutui", nome: "Prestiti e Mutui", colore: "#a76500", posizione: 3 },
];

export const praticaSteps = [
  { id: "step-ed-1", settoreId: "settore-edilizia", chiave: "sopralluogo", nome: "Sopralluogo", posizione: 1 },
  { id: "step-ed-2", settoreId: "settore-edilizia", chiave: "preventivo", nome: "Preventivo", posizione: 2 },
  { id: "step-ed-3", settoreId: "settore-edilizia", chiave: "contratto", nome: "Contratto firmato", posizione: 3 },
  { id: "step-ed-4", settoreId: "settore-edilizia", chiave: "cantiere", nome: "Cantiere in corso", posizione: 4 },
  { id: "step-ed-5", settoreId: "settore-edilizia", chiave: "collaudo", nome: "Collaudo", posizione: 5 },
  { id: "step-ed-6", settoreId: "settore-edilizia", chiave: "chiusura", nome: "Chiusura pratica", posizione: 6 },

  { id: "step-fv-1", settoreId: "settore-fotovoltaico", chiave: "sopralluogo", nome: "Sopralluogo tecnico", posizione: 1 },
  { id: "step-fv-2", settoreId: "settore-fotovoltaico", chiave: "progettazione", nome: "Progettazione impianto", posizione: 2 },
  { id: "step-fv-3", settoreId: "settore-fotovoltaico", chiave: "preventivo", nome: "Preventivo", posizione: 3 },
  { id: "step-fv-4", settoreId: "settore-fotovoltaico", chiave: "pratiche_enel", nome: "Pratiche GSE/Enel", posizione: 4 },
  { id: "step-fv-5", settoreId: "settore-fotovoltaico", chiave: "installazione", nome: "Installazione", posizione: 5 },
  { id: "step-fv-6", settoreId: "settore-fotovoltaico", chiave: "collaudo_gse", nome: "Collaudo e connessione", posizione: 6 },
  { id: "step-fv-7", settoreId: "settore-fotovoltaico", chiave: "chiusura", nome: "Chiusura pratica", posizione: 7 },

  { id: "step-pm-1", settoreId: "settore-prestiti_mutui", chiave: "raccolta_documenti", nome: "Raccolta documenti", posizione: 1 },
  { id: "step-pm-2", settoreId: "settore-prestiti_mutui", chiave: "istruttoria", nome: "Istruttoria", posizione: 2 },
  { id: "step-pm-3", settoreId: "settore-prestiti_mutui", chiave: "invio_banca", nome: "Invio in banca", posizione: 3 },
  { id: "step-pm-4", settoreId: "settore-prestiti_mutui", chiave: "delibera", nome: "Delibera", posizione: 4 },
  { id: "step-pm-5", settoreId: "settore-prestiti_mutui", chiave: "perizia", nome: "Perizia", posizione: 5 },
  { id: "step-pm-6", settoreId: "settore-prestiti_mutui", chiave: "rogito_erogazione", nome: "Rogito/Erogazione", posizione: 6 },
  { id: "step-pm-7", settoreId: "settore-prestiti_mutui", chiave: "chiusura", nome: "Chiusura pratica", posizione: 7 },
];

// --- Clienti trasversali ai tre settori -------------------------------------

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

// --- Pratiche multi-settore --------------------------------------------------

export const pratiche = [
  // Edilizia
  {
    id: "prat-1", settoreId: "settore-edilizia", customerId: "cust-1", titolo: "Rifacimento facciata Condominio Aurora",
    descrizione: "Rifacimento facciata condominiale con cappotto termico.", stepAttualeId: "step-ed-4",
    responsabileId: "u2", priorita: "alta", valore: 42000, scadenza: "2026-09-30", stato: "aperta",
    createdBy: "u1", updatedBy: "u2", createdAt: "2026-06-02T09:00:00.000Z", updatedAt: "2026-07-15T10:00:00.000Z",
  },
  {
    id: "prat-2", settoreId: "settore-edilizia", customerId: "cust-2", titolo: "Ristrutturazione capannone Rossi",
    descrizione: "Ristrutturazione capannone industriale con nuova copertura.", stepAttualeId: "step-ed-2",
    responsabileId: "u2", priorita: "media", valore: 18500, scadenza: "2026-10-15", stato: "aperta",
    createdBy: "u2", updatedBy: "u2", createdAt: "2026-05-14T09:00:00.000Z", updatedAt: "2026-07-01T09:00:00.000Z",
  },
  {
    id: "prat-3", settoreId: "settore-edilizia", customerId: "cust-1", titolo: "Manutenzione tetto Condominio Aurora",
    descrizione: "Verifica e manutenzione straordinaria del tetto.", stepAttualeId: "step-ed-1",
    responsabileId: "u1", priorita: "bassa", valore: 8000, scadenza: "2026-11-01", stato: "aperta",
    createdBy: "u1", updatedBy: "u1", createdAt: "2026-07-10T09:00:00.000Z", updatedAt: "2026-07-10T09:00:00.000Z",
  },

  // Fotovoltaico
  {
    id: "prat-4", settoreId: "settore-fotovoltaico", customerId: "cust-3", titolo: "Impianto 6kW Famiglia Ferrari",
    descrizione: "Impianto fotovoltaico residenziale 6kW con accumulo.", stepAttualeId: "step-fv-5",
    responsabileId: "u3", priorita: "alta", valore: 14500, scadenza: "2026-08-20", stato: "aperta",
    createdBy: "u3", updatedBy: "u3", createdAt: "2026-04-20T09:00:00.000Z", updatedAt: "2026-07-18T09:00:00.000Z",
  },
  {
    id: "prat-5", settoreId: "settore-fotovoltaico", customerId: "cust-4", titolo: "Impianto industriale 100kW Agrisole",
    descrizione: "Impianto fotovoltaico industriale con pratiche GSE.", stepAttualeId: "step-fv-4",
    responsabileId: "u4", priorita: "urgente", valore: 95000, scadenza: "2026-09-05", stato: "aperta",
    createdBy: "u4", updatedBy: "u4", createdAt: "2026-06-11T09:00:00.000Z", updatedAt: "2026-07-15T09:00:00.000Z",
  },
  {
    id: "prat-6", settoreId: "settore-fotovoltaico", customerId: "cust-3", titolo: "Preventivo ampliamento impianto Ferrari",
    descrizione: "Valutazione ampliamento impianto esistente con nuove batterie.", stepAttualeId: "step-fv-1",
    responsabileId: "u3", priorita: "media", valore: 6000, scadenza: "2026-12-01", stato: "aperta",
    createdBy: "u3", updatedBy: "u3", createdAt: "2026-07-19T09:00:00.000Z", updatedAt: "2026-07-19T09:00:00.000Z",
  },

  // Prestiti e mutui
  {
    id: "prat-7", settoreId: "settore-prestiti_mutui", customerId: "cust-5", titolo: "Mutuo prima casa Sig. Galli",
    descrizione: "Richiesta mutuo prima casa 180.000€, in attesa documenti.", stepAttualeId: "step-pm-1",
    responsabileId: "u1", priorita: "alta", valore: 180000, scadenza: "2026-10-01", stato: "aperta",
    createdBy: "u1", updatedBy: "u1", createdAt: "2026-07-20T09:00:00.000Z", updatedAt: "2026-07-20T09:00:00.000Z",
  },
  {
    id: "prat-8", settoreId: "settore-prestiti_mutui", customerId: "cust-6", titolo: "Prestito personale Sig.ra Moretti",
    descrizione: "Prestito personale per ristrutturazione, in istruttoria bancaria.", stepAttualeId: "step-pm-3",
    responsabileId: "u2", priorita: "media", valore: 35000, scadenza: "2026-08-30", stato: "aperta",
    createdBy: "u2", updatedBy: "u2", createdAt: "2026-03-01T09:00:00.000Z", updatedAt: "2026-07-05T09:00:00.000Z",
  },
  {
    id: "prat-9", settoreId: "settore-prestiti_mutui", customerId: "cust-6", titolo: "Mutuo surroga Sig.ra Moretti",
    descrizione: "Surroga mutuo esistente per tasso più favorevole, delibera ottenuta.", stepAttualeId: "step-pm-4",
    responsabileId: "u2", priorita: "bassa", valore: 120000, scadenza: "2026-08-10", stato: "aperta",
    createdBy: "u2", updatedBy: "u1", createdAt: "2026-05-02T09:00:00.000Z", updatedAt: "2026-07-12T09:00:00.000Z",
  },
];

// --- Storico passaggi (step e responsabile) ---------------------------------

export const praticaStorico = [
  { id: "st-1", praticaId: "prat-1", tipo: "creazione", stepPrecedenteId: null, stepNuovoId: "step-ed-1", responsabilePrecedenteId: null, responsabileNuovoId: "u1", nota: "Pratica aperta dopo richiesta cliente.", actorId: "u1", createdAt: "2026-06-02T09:00:00.000Z" },
  { id: "st-2", praticaId: "prat-1", tipo: "step", stepPrecedenteId: "step-ed-1", stepNuovoId: "step-ed-2", responsabilePrecedenteId: null, responsabileNuovoId: null, nota: "Sopralluogo concluso, preventivo in preparazione.", actorId: "u1", createdAt: "2026-06-10T09:00:00.000Z" },
  { id: "st-3", praticaId: "prat-1", tipo: "responsabile", stepPrecedenteId: null, stepNuovoId: null, responsabilePrecedenteId: "u1", responsabileNuovoId: "u2", nota: "Passaggio a Marco per gestione cantiere.", actorId: "u1", createdAt: "2026-06-25T09:00:00.000Z" },
  { id: "st-4", praticaId: "prat-1", tipo: "step", stepPrecedenteId: "step-ed-2", stepNuovoId: "step-ed-3", responsabilePrecedenteId: null, responsabileNuovoId: null, nota: "Contratto firmato dal cliente.", actorId: "u2", createdAt: "2026-07-01T09:00:00.000Z" },
  { id: "st-5", praticaId: "prat-1", tipo: "step", stepPrecedenteId: "step-ed-3", stepNuovoId: "step-ed-4", responsabilePrecedenteId: null, responsabileNuovoId: null, nota: "Cantiere avviato.", actorId: "u2", createdAt: "2026-07-15T10:00:00.000Z" },

  { id: "st-6", praticaId: "prat-5", tipo: "creazione", stepPrecedenteId: null, stepNuovoId: "step-fv-1", responsabilePrecedenteId: null, responsabileNuovoId: "u3", nota: "Pratica aperta.", actorId: "u3", createdAt: "2026-06-11T09:00:00.000Z" },
  { id: "st-7", praticaId: "prat-5", tipo: "responsabile", stepPrecedenteId: null, stepNuovoId: null, responsabilePrecedenteId: "u3", responsabileNuovoId: "u4", nota: "Passaggio a Luca per gestione pratiche GSE su impianto industriale.", actorId: "u3", createdAt: "2026-06-20T09:00:00.000Z" },
  { id: "st-8", praticaId: "prat-5", tipo: "step", stepPrecedenteId: "step-fv-3", stepNuovoId: "step-fv-4", responsabilePrecedenteId: null, responsabileNuovoId: null, nota: "Preventivo accettato, invio pratiche GSE/Enel.", actorId: "u4", createdAt: "2026-07-15T09:00:00.000Z" },

  { id: "st-9", praticaId: "prat-9", tipo: "creazione", stepPrecedenteId: null, stepNuovoId: "step-pm-1", responsabilePrecedenteId: null, responsabileNuovoId: "u2", nota: "Pratica aperta.", actorId: "u2", createdAt: "2026-05-02T09:00:00.000Z" },
  { id: "st-10", praticaId: "prat-9", tipo: "step", stepPrecedenteId: "step-pm-2", stepNuovoId: "step-pm-3", responsabilePrecedenteId: null, responsabileNuovoId: null, nota: "Documenti inviati in banca.", actorId: "u2", createdAt: "2026-06-15T09:00:00.000Z" },
  { id: "st-11", praticaId: "prat-9", tipo: "responsabile", stepPrecedenteId: null, stepNuovoId: null, responsabilePrecedenteId: "u2", responsabileNuovoId: "u1", nota: "Anna segue la fase di delibera mentre Marco è impegnato su altre pratiche.", actorId: "u2", createdAt: "2026-06-28T09:00:00.000Z" },
  { id: "st-12", praticaId: "prat-9", tipo: "step", stepPrecedenteId: "step-pm-3", stepNuovoId: "step-pm-4", responsabilePrecedenteId: null, responsabileNuovoId: null, nota: "Delibera ottenuta dalla banca.", actorId: "u1", createdAt: "2026-07-12T09:00:00.000Z" },
  { id: "st-13", praticaId: "prat-9", tipo: "responsabile", stepPrecedenteId: null, stepNuovoId: null, responsabilePrecedenteId: "u1", responsabileNuovoId: "u2", nota: "Torna a Marco per chiusura pratica con il cliente.", actorId: "u1", createdAt: "2026-07-12T10:00:00.000Z" },
];

// --- Agenda condivisa ---------------------------------------------------------

export const agendaEventi = [
  { id: "ag-1", titolo: "Sopralluogo tetto Condominio Aurora", descrizione: "Verifica stato tetto con tecnico esterno.", data: "2026-07-24", ora: "09:30", tipo: "sopralluogo", praticaId: "prat-3", creatoDa: "u1", partecipanti: [assignment("u1")] },
  { id: "ag-2", titolo: "Riunione settimanale team", descrizione: "Allineamento su pratiche aperte nei tre settori.", data: "2026-07-24", ora: "17:00", tipo: "riunione", praticaId: null, creatoDa: "u1", partecipanti: [assignment("u1"), assignment("u2"), assignment("u3"), assignment("u4")] },
  { id: "ag-3", titolo: "Scadenza invio pratica GSE Agrisole", descrizione: "Termine ultimo per invio pratica GSE.", data: "2026-07-28", ora: "12:00", tipo: "scadenza", praticaId: "prat-5", creatoDa: "u4", partecipanti: [assignment("u4")] },
  { id: "ag-4", titolo: "Firma contratto Rossi Costruzioni", descrizione: "Firma contratto ristrutturazione capannone.", data: "2026-07-25", ora: "15:00", tipo: "riunione", praticaId: "prat-2", creatoDa: "u2", partecipanti: [assignment("u2")] },
  { id: "ag-5", titolo: "Perizia impianto Ferrari", descrizione: "Sopralluogo tecnico per ampliamento impianto.", data: "2026-07-30", ora: "10:00", tipo: "sopralluogo", praticaId: "prat-6", creatoDa: "u3", partecipanti: [assignment("u3")] },
  { id: "ag-6", titolo: "Colloquio istruttoria mutuo Galli", descrizione: "Raccolta documenti reddituali per la banca.", data: "2026-07-26", ora: "11:00", tipo: "riunione", praticaId: "prat-7", creatoDa: "u1", partecipanti: [assignment("u1")] },
];

// --- Opportunità, appuntamenti, preventivi, prezzario (modulo edilizia) -----

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
  { assignedUsers: [assignment("u1"), assignment("u2"), assignment("u3"), assignment("u4")], date: "2026-07-24", day: 24, detail: "Allineamento team su pratiche aperte.", id: "app-2", related: "", time: "17:00", title: "Riunione settimanale team", type: "appointment" },
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
