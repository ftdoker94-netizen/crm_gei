// Repository "demo": stessa API di src/services/crmRepository.js ma sopra
// uno store in memoria invece di Supabase. Usato automaticamente da
// src/services/dataSource.js quando isSupabaseConfigured è false.

import * as seed from "./mockData.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

const store = {
  agendaEventi: clone(seed.agendaEventi),
  appointments: clone(seed.appointments),
  cantiereCosti: clone(seed.cantiereCosti || []),
  cantiereOre: clone(seed.cantiereOre || []),
  cantieri: clone(seed.cantieri || []),
  cantiereRapportini: clone(seed.cantiereRapportini || []),
  rapportinoFoto: clone(seed.rapportinoFoto || []),
  customers: clone(seed.customers),
  movimentiCassa: clone(seed.movimentiCassa || []),
  opportunities: clone(seed.opportunities),
  opportunityDocumenti: clone(seed.opportunityDocumenti || []),
  opportunityStorico: clone(seed.opportunityStorico || []),
  priceList: clone(seed.priceList),
  quotes: clone(seed.quotes),
};

const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const nowIso = () => new Date().toISOString();
const member = (id) => seed.teamMembers.find((item) => item.id === id);
const memberName = (id) => member(id)?.name || "Team GEI";
const toAssignedUsers = (userIds = []) =>
  userIds.filter(Boolean).map((userId) => ({ id: `as-${userId}`, role: "responsabile", userId, userName: memberName(userId) }));

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export async function saveCurrentProfile() {
  return { id: seed.DEMO_USER.id, email: seed.DEMO_USER.email, full_name: seed.DEMO_USER.user_metadata.full_name, ruolo: seed.DEMO_USER.ruolo };
}

export async function updateDisplayName(_user, displayName) {
  seed.DEMO_USER.user_metadata.full_name = displayName.trim();
  return { id: seed.DEMO_USER.id, email: seed.DEMO_USER.email, full_name: seed.DEMO_USER.user_metadata.full_name };
}

export async function fetchCrmState() {
  const todayKey = toDateKey(new Date());
  const calendarEvents = store.appointments.map((appointment) => ({
    date: appointment.date,
    day: appointment.day,
    id: appointment.id,
    label: `${appointment.time} ${appointment.title}`,
    type: appointment.type,
  }));

  return {
    appointments: store.appointments,
    calendarEvents,
    customers: store.customers,
    opportunities: store.opportunities,
    pipeline: [],
    priceList: store.priceList,
    projects: [],
    quotes: store.quotes,
    tasks: [],
    teamMembers: seed.teamMembers,
    todayAppointments: store.appointments.filter((appointment) => appointment.date === todayKey),
  };
}

// --- Clienti -----------------------------------------------------------------

export async function createCustomer(customer) {
  const now = nowIso();
  const created = {
    activities: [],
    address: customer.address,
    assignedUsers: toAssignedUsers(customer.assignedUserIds),
    createdAt: now,
    createdBy: seed.DEMO_USER.user_metadata.full_name,
    email: customer.email,
    id: uid("cust"),
    lastContact: "Non indicato",
    name: customer.name,
    openValue: customer.openValue,
    phone: customer.phone,
    primaryContact: customer.primaryContact,
    projects: customer.projects,
    status: customer.status,
    tags: customer.tags,
    type: customer.type,
    updatedAt: now,
    updatedBy: seed.DEMO_USER.user_metadata.full_name,
  };
  store.customers = [created, ...store.customers];
  return created;
}

export async function updateCustomer(customer) {
  const now = nowIso();
  store.customers = store.customers.map((item) =>
    item.id === customer.id
      ? {
          ...item,
          address: customer.address,
          assignedUsers: toAssignedUsers(customer.assignedUserIds),
          email: customer.email,
          name: customer.name,
          openValue: customer.openValue,
          phone: customer.phone,
          primaryContact: customer.primaryContact,
          projects: customer.projects,
          status: customer.status,
          tags: customer.tags,
          type: customer.type,
          updatedAt: now,
          updatedBy: seed.DEMO_USER.user_metadata.full_name,
        }
      : item,
  );
  return store.customers.find((item) => item.id === customer.id);
}

export async function setCustomerArchived(customer, archived) {
  const nextStatus = archived ? "Archiviato" : "Nuova richiesta";
  store.customers = store.customers.map((item) =>
    item.id === customer.id ? { ...item, status: nextStatus, updatedAt: nowIso(), updatedBy: seed.DEMO_USER.user_metadata.full_name } : item,
  );
  return store.customers.find((item) => item.id === customer.id);
}

export async function addCustomerNote(customerId, detail) {
  const note = {
    action: "nota_aggiunta",
    actor: seed.DEMO_USER.user_metadata.full_name,
    createdAt: nowIso(),
    dateLabel: new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(new Date()),
    detail: detail.trim(),
    id: uid("act"),
  };
  store.customers = store.customers.map((item) =>
    item.id === customerId ? { ...item, activities: [note, ...(item.activities || [])] } : item,
  );
  return note;
}

// --- Preventivi ----------------------------------------------------------------

const computeQuoteTotals = (quote) => {
  const items = quote.items || [];
  const subtotalNumber = items.reduce((total, item) => total + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const discountNumber = subtotalNumber * ((Number(quote.discount) || 0) / 100);
  const taxableNumber = subtotalNumber - discountNumber;
  const vatNumber = taxableNumber * ((Number(quote.vatRate) || 0) / 100);
  const totalNumber = taxableNumber + vatNumber;
  const formatCurrency = (value) => new Intl.NumberFormat("it-IT", { currency: "EUR", maximumFractionDigits: 0, style: "currency" }).format(value);

  return {
    discountValue: formatCurrency(discountNumber),
    subtotal: formatCurrency(subtotalNumber),
    subtotalNumber,
    taxable: formatCurrency(taxableNumber),
    total: formatCurrency(totalNumber),
    totalNumber,
    vat: formatCurrency(vatNumber),
  };
};

export async function createQuote(quote) {
  const customer = store.customers.find((item) => item.id === quote.customerId);
  const opportunity = store.opportunities.find((item) => item.id === quote.opportunityId);
  const now = nowIso();
  const created = {
    ...quote,
    createdAt: now,
    createdBy: seed.DEMO_USER.user_metadata.full_name,
    customerName: customer?.name || "Cliente non collegato",
    id: uid("quote"),
    opportunityTitle: opportunity?.title || "Nessuna opportunità",
    updatedAt: now,
    updatedBy: seed.DEMO_USER.user_metadata.full_name,
    ...computeQuoteTotals(quote),
  };
  store.quotes = [created, ...store.quotes];
  return created;
}

export async function updateQuote(quote) {
  const customer = store.customers.find((item) => item.id === quote.customerId);
  const opportunity = store.opportunities.find((item) => item.id === quote.opportunityId);
  store.quotes = store.quotes.map((item) =>
    item.id === quote.id
      ? {
          ...item,
          ...quote,
          customerName: customer?.name || "Cliente non collegato",
          opportunityTitle: opportunity?.title || "Nessuna opportunità",
          updatedAt: nowIso(),
          updatedBy: seed.DEMO_USER.user_metadata.full_name,
          ...computeQuoteTotals(quote),
        }
      : item,
  );
  return store.quotes.find((item) => item.id === quote.id);
}

export async function deleteQuote(quoteId) {
  store.quotes = store.quotes.filter((item) => item.id !== quoteId);
  return { id: quoteId };
}

// --- Appuntamenti ---------------------------------------------------------------

export async function createAppointment(appointment) {
  const [, , day] = appointment.date.split("-");
  const created = {
    assignedUsers: toAssignedUsers(appointment.assignedUserIds),
    date: appointment.date,
    day: Number(day),
    detail: appointment.detail,
    id: uid("app"),
    related: appointment.related,
    time: appointment.time,
    title: appointment.title,
    type: appointment.type,
  };
  store.appointments = [...store.appointments, created];
  return created;
}

export async function updateAppointment(appointment) {
  const [, , day] = appointment.date.split("-");
  store.appointments = store.appointments.map((item) =>
    item.id === appointment.id
      ? {
          ...item,
          assignedUsers: toAssignedUsers(appointment.assignedUserIds),
          date: appointment.date,
          day: Number(day),
          detail: appointment.detail,
          related: appointment.related,
          time: appointment.time,
          title: appointment.title,
          type: appointment.type,
        }
      : item,
  );
  return store.appointments.find((item) => item.id === appointment.id);
}

// --- Opportunità -----------------------------------------------------------------

export async function createOpportunity(opportunity) {
  const customer = store.customers.find((item) => item.id === opportunity.customerId);
  const now = nowIso();
  const estimatedCostNumber = Number(opportunity.estimatedCost) || 0;
  const estimatedValueNumber = Number(opportunity.estimatedValue) || 0;
  const formatCurrency = (value) => new Intl.NumberFormat("it-IT", { currency: "EUR", maximumFractionDigits: 0, style: "currency" }).format(value);
  const created = {
    assignedUsers: toAssignedUsers(opportunity.assignedUserIds),
    bidDecision: opportunity.bidDecision,
    createdAt: now,
    createdBy: seed.DEMO_USER.user_metadata.full_name,
    customerId: opportunity.customerId,
    customerName: customer?.name || "Cliente non collegato",
    description: opportunity.description,
    dueDate: opportunity.dueDate,
    dueDateLabel: opportunity.dueDate
      ? new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(opportunity.dueDate))
      : "Non indicato",
    estimatedCost: formatCurrency(estimatedCostNumber),
    estimatedCostNumber,
    estimatedValue: formatCurrency(estimatedValueNumber),
    estimatedValueNumber,
    id: uid("opp"),
    lossReason: opportunity.lossReason || "",
    margin: formatCurrency(estimatedValueNumber - estimatedCostNumber),
    marginNumber: estimatedValueNumber - estimatedCostNumber,
    nextAction: opportunity.nextAction,
    probability: Number(opportunity.probability) || 0,
    priority: opportunity.priority,
    source: opportunity.source,
    status: "nuova",
    steps: [],
    title: opportunity.title,
    type: opportunity.type,
    updatedAt: now,
    updatedBy: seed.DEMO_USER.user_metadata.full_name,
  };

  if (opportunity.firstStep?.title) {
    created.steps = [
      {
        assignedUsers: toAssignedUsers(opportunity.firstStep.assignedUserIds?.length ? opportunity.firstStep.assignedUserIds : opportunity.assignedUserIds),
        createdAt: now,
        createdBy: seed.DEMO_USER.user_metadata.full_name,
        detail: opportunity.firstStep.detail || "",
        id: uid("step"),
        opportunityId: created.id,
        parentStepId: null,
        position: 1,
        status: opportunity.firstStep.status || "da_fare",
        title: opportunity.firstStep.title,
        updatedAt: now,
        updatedBy: seed.DEMO_USER.user_metadata.full_name,
      },
    ];
  }

  store.opportunities = [created, ...store.opportunities];
  store.opportunityStorico = [
    {
      actorId: seed.DEMO_USER.id,
      createdAt: now,
      id: uid("st"),
      nota: "Opportunità creata.",
      opportunityId: created.id,
      statoNuovo: created.status,
      statoPrecedente: null,
      tipo: "creazione",
    },
    ...store.opportunityStorico,
  ];
  return created;
}

export async function updateOpportunity(opportunity) {
  const customer = store.customers.find((item) => item.id === opportunity.customerId);
  const estimatedCostNumber = Number(opportunity.estimatedCost) || 0;
  const estimatedValueNumber = Number(opportunity.estimatedValue) || 0;
  const formatCurrency = (value) => new Intl.NumberFormat("it-IT", { currency: "EUR", maximumFractionDigits: 0, style: "currency" }).format(value);
  store.opportunities = store.opportunities.map((item) =>
    item.id === opportunity.id
      ? {
          ...item,
          assignedUsers: toAssignedUsers(opportunity.assignedUserIds),
          bidDecision: opportunity.bidDecision,
          customerId: opportunity.customerId,
          customerName: customer?.name || "Cliente non collegato",
          description: opportunity.description,
          dueDate: opportunity.dueDate,
          dueDateLabel: opportunity.dueDate
            ? new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(opportunity.dueDate))
            : "Non indicato",
          estimatedCost: formatCurrency(estimatedCostNumber),
          estimatedCostNumber,
          estimatedValue: formatCurrency(estimatedValueNumber),
          estimatedValueNumber,
          lossReason: opportunity.lossReason || "",
          margin: formatCurrency(estimatedValueNumber - estimatedCostNumber),
          marginNumber: estimatedValueNumber - estimatedCostNumber,
          nextAction: opportunity.nextAction,
          probability: Number(opportunity.probability) || 0,
          priority: opportunity.priority,
          source: opportunity.source,
          title: opportunity.title,
          type: opportunity.type,
          updatedAt: nowIso(),
          updatedBy: seed.DEMO_USER.user_metadata.full_name,
        }
      : item,
  );
  return store.opportunities.find((item) => item.id === opportunity.id);
}

export async function updateOpportunityStage(opportunityId, status) {
  const previous = store.opportunities.find((item) => item.id === opportunityId);
  store.opportunities = store.opportunities.map((item) =>
    item.id === opportunityId ? { ...item, status, updatedAt: nowIso(), updatedBy: seed.DEMO_USER.user_metadata.full_name } : item,
  );
  store.opportunityStorico = [
    {
      actorId: seed.DEMO_USER.id,
      createdAt: nowIso(),
      id: uid("st"),
      nota: "",
      opportunityId,
      statoNuovo: status,
      statoPrecedente: previous?.status || null,
      tipo: "stato",
    },
    ...store.opportunityStorico,
  ];
  return store.opportunities.find((item) => item.id === opportunityId);
}

export async function createOpportunityStep(step) {
  const now = nowIso();
  const created = {
    assignedUsers: toAssignedUsers(step.assignedUserIds),
    createdAt: now,
    createdBy: seed.DEMO_USER.user_metadata.full_name,
    detail: step.detail || "",
    id: uid("step"),
    opportunityId: step.opportunityId,
    parentStepId: step.parentStepId || null,
    position: step.position,
    status: step.status,
    title: step.title,
    updatedAt: now,
    updatedBy: seed.DEMO_USER.user_metadata.full_name,
  };
  store.opportunities = store.opportunities.map((item) =>
    item.id === step.opportunityId ? { ...item, steps: [...item.steps, created] } : item,
  );
  return created;
}

export async function updateOpportunityStep(step) {
  store.opportunities = store.opportunities.map((opportunity) =>
    opportunity.id === step.opportunityId
      ? {
          ...opportunity,
          steps: opportunity.steps.map((item) =>
            item.id === step.id
              ? {
                  ...item,
                  assignedUsers: toAssignedUsers(step.assignedUserIds),
                  detail: step.detail || "",
                  status: step.status,
                  title: step.title,
                  updatedAt: nowIso(),
                  updatedBy: seed.DEMO_USER.user_metadata.full_name,
                }
              : item,
          ),
        }
      : opportunity,
  );

  for (const opportunity of store.opportunities) {
    const found = opportunity.steps.find((item) => item.id === step.id);
    if (found) return found;
  }
  return null;
}

// --- Prezzario -----------------------------------------------------------------

export async function createPriceItem(item) {
  const created = {
    active: item.active !== false,
    category: item.category?.trim() || "Generale",
    code: item.code?.trim() || "",
    createdById: seed.DEMO_USER.id,
    description: item.description.trim(),
    id: uid("price"),
    unit: item.unit?.trim() || "cad",
    unitPrice: Number(item.unitPrice) || 0,
    updatedAt: nowIso(),
  };
  store.priceList = [...store.priceList, created];
  return created;
}

export async function updatePriceItem(item) {
  store.priceList = store.priceList.map((row) =>
    row.id === item.id
      ? {
          ...row,
          active: item.active !== false,
          category: item.category?.trim() || "Generale",
          code: item.code?.trim() || "",
          description: item.description.trim(),
          unit: item.unit?.trim() || "cad",
          unitPrice: Number(item.unitPrice) || 0,
          updatedAt: nowIso(),
        }
      : row,
  );
  return store.priceList.find((row) => row.id === item.id);
}

export async function deletePriceItem(itemId) {
  store.priceList = store.priceList.filter((row) => row.id !== itemId);
}

// --- Storico opportunità -----------------------------------------------------

export async function fetchOpportunityStorico(opportunityId) {
  return store.opportunityStorico
    .filter((entry) => entry.opportunityId === opportunityId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// --- Documenti di opportunità (import/OCR riusato dal modulo Preventivi) ----

export async function fetchOpportunityDocumenti(opportunityId) {
  return store.opportunityDocumenti
    .filter((doc) => doc.opportunityId === opportunityId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function createOpportunityDocumento(document, actorId) {
  const created = {
    caricatoDa: actorId,
    createdAt: nowIso(),
    datiEstratti: document.datiEstratti || null,
    id: uid("doc"),
    nome: document.nome,
    opportunityId: document.opportunityId,
    tipo: document.tipo || null,
  };
  store.opportunityDocumenti = [created, ...store.opportunityDocumenti];
  return created;
}

export async function deleteOpportunityDocumento(documentId) {
  store.opportunityDocumenti = store.opportunityDocumenti.filter((doc) => doc.id !== documentId);
}

// --- Agenda condivisa ----------------------------------------------------------

export async function fetchAgendaEventi() {
  return store.agendaEventi;
}

export async function createAgendaEvento(evento, actorId) {
  const created = {
    creatoDa: actorId,
    data: evento.data,
    descrizione: evento.descrizione || "",
    id: uid("ag"),
    opportunityId: evento.opportunityId || null,
    ora: evento.ora || "",
    partecipanti: toAssignedUsers(evento.partecipantiIds),
    tipo: evento.tipo || "altro",
    titolo: evento.titolo,
  };
  store.agendaEventi = [...store.agendaEventi, created];
  return created;
}

export async function deleteAgendaEvento(eventoId) {
  store.agendaEventi = store.agendaEventi.filter((item) => item.id !== eventoId);
}

// --- Cantieri: costi, ore, marginalità ---------------------------------------

const cantiereMarginalita = (cantiereId) => {
  const costi = store.cantiereCosti.filter((costo) => costo.cantiereId === cantiereId);
  const costiConsuntivo = costi.filter((costo) => costo.tipo === "consuntivo").reduce((total, costo) => total + Number(costo.importo), 0);
  const costiPrevisto = costi.filter((costo) => costo.tipo === "previsto").reduce((total, costo) => total + Number(costo.importo), 0);
  return { costiConsuntivo, costiPrevisto };
};

const toCantiereWithMarginalita = (cantiere) => {
  const { costiConsuntivo, costiPrevisto } = cantiereMarginalita(cantiere.id);
  const valoreCommessa = Number(cantiere.valoreCommessa) || 0;
  const margineAttuale = valoreCommessa - costiConsuntivo;
  return {
    ...cantiere,
    costiConsuntivo,
    costiPrevisto,
    margineAttuale,
    marginePrevistoAFinire: margineAttuale - costiPrevisto,
    percentualeMargine: valoreCommessa === 0 ? 0 : Math.round((margineAttuale / valoreCommessa) * 1000) / 10,
  };
};

export async function fetchCantieri() {
  return store.cantieri.map(toCantiereWithMarginalita);
}

export async function createCantiere(cantiere, actorId) {
  const now = nowIso();
  const created = {
    clienteId: cantiere.clienteId || null,
    dataApertura: cantiere.dataApertura || now.slice(0, 10),
    dataChiusuraPrevista: cantiere.dataChiusuraPrevista || null,
    id: uid("cant"),
    indirizzo: cantiere.indirizzo || "",
    opportunityId: cantiere.opportunityId || null,
    responsabileId: cantiere.responsabileId || actorId,
    stato: "aperto",
    titolo: cantiere.titolo,
    valoreCommessa: Number(cantiere.valoreCommessa) || 0,
  };
  store.cantieri = [created, ...store.cantieri];
  return toCantiereWithMarginalita(created);
}

export async function updateCantiere(cantiere) {
  store.cantieri = store.cantieri.map((item) =>
    item.id === cantiere.id
      ? {
          ...item,
          clienteId: cantiere.clienteId || null,
          dataChiusuraPrevista: cantiere.dataChiusuraPrevista || null,
          indirizzo: cantiere.indirizzo || "",
          responsabileId: cantiere.responsabileId || null,
          stato: cantiere.stato,
          titolo: cantiere.titolo,
          valoreCommessa: Number(cantiere.valoreCommessa) || 0,
        }
      : item,
  );
  return toCantiereWithMarginalita(store.cantieri.find((item) => item.id === cantiere.id));
}

export async function fetchCantiereCosti(cantiereId) {
  return store.cantiereCosti
    .filter((costo) => costo.cantiereId === cantiereId)
    .sort((a, b) => new Date(b.data) - new Date(a.data));
}

export async function createCantiereCosto(costo, actorId) {
  const created = {
    cantiereId: costo.cantiereId,
    categoria: costo.categoria,
    createdAt: nowIso(),
    createdBy: actorId,
    data: costo.data || nowIso().slice(0, 10),
    descrizione: costo.descrizione,
    fornitore: costo.fornitore || "",
    id: uid("cc"),
    importo: Number(costo.importo) || 0,
    tipo: costo.tipo,
  };
  store.cantiereCosti = [created, ...store.cantiereCosti];
  return created;
}

export async function deleteCantiereCosto(costoId) {
  store.cantiereCosti = store.cantiereCosti.filter((costo) => costo.id !== costoId);
}

// --- Giornale di cantiere: rapportini giornalieri ----------------------------

const assembleRapportino = (rapportino) => ({
  ...rapportino,
  foto: store.rapportinoFoto.filter((foto) => foto.rapportinoId === rapportino.id),
  ore: store.cantiereOre.filter((ora) => ora.rapportinoId === rapportino.id),
});

export async function fetchCantiereRapportini(cantiereId) {
  return store.cantiereRapportini
    .filter((rapportino) => rapportino.cantiereId === cantiereId)
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .map(assembleRapportino);
}

const insertOreRows = (rapportinoId, oreRows, actorId) => {
  const rows = (oreRows || [])
    .filter((riga) => riga.collaboratoreId && Number(riga.ore) > 0)
    .map((riga) => ({
      collaboratoreId: riga.collaboratoreId,
      createdAt: nowIso(),
      createdBy: actorId,
      id: uid("co"),
      mansione: riga.mansione || "",
      ore: Number(riga.ore) || 0,
      rapportinoId,
    }));
  store.cantiereOre = [...rows, ...store.cantiereOre];
};

// Un solo rapportino per cantiere per giorno, stesso vincolo del DB reale
// (unique(cantiere_id, data)), così la demo si comporta come Supabase.
export async function createRapportino(rapportino, oreRows, actorId) {
  const existing = store.cantiereRapportini.find(
    (item) => item.cantiereId === rapportino.cantiereId && item.data === rapportino.data,
  );
  if (existing) {
    const duplicateError = new Error("Esiste già un rapportino per questo cantiere in questa data.");
    duplicateError.code = "RAPPORTINO_DUPLICATE";
    throw duplicateError;
  }

  const now = nowIso();
  const created = {
    autoreId: actorId,
    cantiereId: rapportino.cantiereId,
    createdAt: now,
    data: rapportino.data,
    id: uid("rap"),
    lavorazioniSvolte: rapportino.lavorazioniSvolte || "",
    meteo: rapportino.meteo || null,
    note: rapportino.note || "",
    updatedAt: now,
  };
  store.cantiereRapportini = [created, ...store.cantiereRapportini];
  insertOreRows(created.id, oreRows, actorId);
  return assembleRapportino(created);
}

export async function updateRapportino(rapportino, oreRows, actorId) {
  store.cantiereRapportini = store.cantiereRapportini.map((item) =>
    item.id === rapportino.id
      ? {
          ...item,
          lavorazioniSvolte: rapportino.lavorazioniSvolte || "",
          meteo: rapportino.meteo || null,
          note: rapportino.note || "",
          updatedAt: nowIso(),
        }
      : item,
  );
  store.cantiereOre = store.cantiereOre.filter((ora) => ora.rapportinoId !== rapportino.id);
  insertOreRows(rapportino.id, oreRows, actorId);
  return assembleRapportino(store.cantiereRapportini.find((item) => item.id === rapportino.id));
}

// In demo non c'è uno storage reale: leggiamo il file come data URL cosi'
// la foto resta visibile per il resto della sessione (come tutti gli altri
// dati demo, non sopravvive a un refresh completo della pagina).
const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export async function uploadRapportinoFoto(file, rapportinoId, actorId) {
  const url = await readFileAsDataUrl(file);
  const created = {
    caricatoDa: actorId,
    createdAt: nowIso(),
    id: uid("foto"),
    rapportinoId,
    storagePath: file.name,
    url,
  };
  store.rapportinoFoto = [...store.rapportinoFoto, created];
  return created;
}

export async function deleteRapportinoFoto(fotoId) {
  store.rapportinoFoto = store.rapportinoFoto.filter((foto) => foto.id !== fotoId);
}

// --- Economia: movimenti di cassa --------------------------------------------

export async function fetchMovimentiCassa() {
  return [...store.movimentiCassa].sort((a, b) => new Date(b.data) - new Date(a.data));
}

export async function createMovimentoCassa(movimento, actorId) {
  const created = {
    cantiereId: movimento.cantiereId || null,
    categoria: movimento.categoria,
    createdAt: nowIso(),
    createdBy: actorId,
    data: movimento.data || nowIso().slice(0, 10),
    descrizione: movimento.descrizione || "",
    id: uid("mc"),
    importo: Number(movimento.importo) || 0,
    tipo: movimento.tipo,
  };
  store.movimentiCassa = [created, ...store.movimentiCassa];
  return created;
}

export async function deleteMovimentoCassa(movimentoId) {
  store.movimentiCassa = store.movimentiCassa.filter((movimento) => movimento.id !== movimentoId);
}
