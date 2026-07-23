// Repository "demo": stessa API di src/services/crmRepository.js ma sopra
// uno store in memoria invece di Supabase. Usato automaticamente da
// src/services/dataSource.js quando isSupabaseConfigured è false.

import * as seed from "./mockData.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

const store = {
  agendaEventi: clone(seed.agendaEventi),
  appointments: clone(seed.appointments),
  customers: clone(seed.customers),
  opportunities: clone(seed.opportunities),
  pratiche: clone(seed.pratiche),
  praticaDocumenti: clone(seed.praticaDocumenti || []),
  praticaStorico: clone(seed.praticaStorico),
  priceList: clone(seed.priceList),
  quotes: clone(seed.quotes),
};

// --- Attore demo corrente (simula auth.uid() + crm_profiles.ruolo) ---------
// Di default impersoniamo l'admin (Luca Ferri) cosi la demo resta completamente
// visibile finche' non si sceglie di "vedere come" un altro ruolo dal selettore
// nella pagina Pratiche. Le regole di visibilita' rispecchiano esattamente le
// policy RLS in supabase/migrations/20260723_000001_pratiche_rls_per_ruolo.sql.
let currentActorId = "u4";

export function getCurrentActorId() {
  return currentActorId;
}

export function setCurrentActorId(userId) {
  currentActorId = userId;
}

const getActor = (userId = currentActorId) => seed.teamMembers.find((item) => item.id === userId) || null;

function canViewPratica(pratica, actorId = currentActorId) {
  const actor = getActor(actorId);
  if (!pratica || !actor) return false;
  if (actor.ruolo === "admin") return true;
  if (actor.ruolo === "responsabile_settore") return pratica.settoreId === actor.settorePrincipaleId;
  return pratica.responsabileId === actor.id || (pratica.collaboratoriIds || []).includes(actor.id);
}

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
  return { id: seed.DEMO_USER.id, email: seed.DEMO_USER.email, full_name: seed.DEMO_USER.user_metadata.full_name };
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
  store.opportunities = store.opportunities.map((item) =>
    item.id === opportunityId ? { ...item, status, updatedAt: nowIso(), updatedBy: seed.DEMO_USER.user_metadata.full_name } : item,
  );
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

// --- Pratiche multi-settore -------------------------------------------------------

export async function fetchPraticheData() {
  const pratiche = store.pratiche.filter((pratica) => canViewPratica(pratica));
  const visibleIds = new Set(pratiche.map((pratica) => pratica.id));

  return {
    pratiche,
    praticaStorico: store.praticaStorico.filter((entry) => visibleIds.has(entry.praticaId)),
    praticaSteps: seed.praticaSteps,
    settori: seed.settori,
  };
}

// Simula, in locale, esattamente la stessa logica della Edge Function
// "pratiche-digest" (vedi supabase/functions/pratiche-digest/index.ts):
// pratiche aperte di cui l'utente è responsabile, in ritardo o in scadenza
// entro daysAhead giorni. Nessuna email viene davvero inviata: l'interfaccia
// mostra solo un'anteprima di cosa conterrebbe il digest.
export function buildPraticheDigestPreview(actorId, daysAhead = 3) {
  const actor = getActor(actorId);
  if (!actor) return { actor: null, pratiche: [] };

  const todayKey = toDateKey(new Date());
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + daysAhead);
  const thresholdKey = toDateKey(threshold);

  const pratiche = store.pratiche
    .filter((pratica) => pratica.stato === "aperta" && pratica.responsabileId === actorId && pratica.scadenza)
    .filter((pratica) => pratica.scadenza <= thresholdKey)
    .map((pratica) => ({
      customerNome: store.customers.find((customer) => customer.id === pratica.customerId)?.name || "Cliente non collegato",
      id: pratica.id,
      overdue: pratica.scadenza < todayKey,
      scadenza: pratica.scadenza,
      settoreNome: seed.settori.find((settore) => settore.id === pratica.settoreId)?.nome || "—",
      titolo: pratica.titolo,
    }))
    .sort((first, second) => first.scadenza.localeCompare(second.scadenza));

  return { actor, pratiche };
}

export async function moveToNextStep(praticaId, nuovoStepId, actorId, nota = "") {
  const pratica = store.pratiche.find((item) => item.id === praticaId);
  if (!pratica) throw new Error("Pratica non trovata.");
  if (!canViewPratica(pratica, actorId)) throw new Error("Non hai i permessi per modificare questa pratica.");

  const entry = {
    actorId,
    createdAt: nowIso(),
    id: uid("st"),
    nota,
    praticaId,
    responsabileNuovoId: null,
    responsabilePrecedenteId: null,
    stepNuovoId: nuovoStepId,
    stepPrecedenteId: pratica.stepAttualeId,
    tipo: "step",
  };

  store.pratiche = store.pratiche.map((item) =>
    item.id === praticaId ? { ...item, stepAttualeId: nuovoStepId, updatedAt: nowIso(), updatedBy: actorId } : item,
  );
  store.praticaStorico = [entry, ...store.praticaStorico];
  return { entry, pratica: store.pratiche.find((item) => item.id === praticaId) };
}

export async function reassignResponsabile(praticaId, nuovoResponsabileId, actorId, nota = "") {
  const pratica = store.pratiche.find((item) => item.id === praticaId);
  if (!pratica) throw new Error("Pratica non trovata.");
  if (!canViewPratica(pratica, actorId)) throw new Error("Non hai i permessi per modificare questa pratica.");

  const entry = {
    actorId,
    createdAt: nowIso(),
    id: uid("st"),
    nota,
    praticaId,
    responsabileNuovoId: nuovoResponsabileId,
    responsabilePrecedenteId: pratica.responsabileId,
    stepNuovoId: null,
    stepPrecedenteId: null,
    tipo: "responsabile",
  };

  store.pratiche = store.pratiche.map((item) =>
    item.id === praticaId ? { ...item, responsabileId: nuovoResponsabileId, updatedAt: nowIso(), updatedBy: actorId } : item,
  );
  store.praticaStorico = [entry, ...store.praticaStorico];
  return { entry, pratica: store.pratiche.find((item) => item.id === praticaId) };
}

export async function createPratica(pratica, actorId) {
  const now = nowIso();
  const firstStep = seed.praticaSteps
    .filter((step) => step.settoreId === pratica.settoreId)
    .sort((a, b) => a.posizione - b.posizione)[0];
  const created = {
    createdAt: now,
    createdBy: actorId,
    customerId: pratica.customerId || null,
    descrizione: pratica.descrizione || "",
    id: uid("prat"),
    priorita: pratica.priorita || "media",
    responsabileId: pratica.responsabileId || actorId,
    scadenza: pratica.scadenza || null,
    settoreId: pratica.settoreId,
    stato: "aperta",
    stepAttualeId: firstStep?.id || null,
    titolo: pratica.titolo,
    updatedAt: now,
    updatedBy: actorId,
    valore: Number(pratica.valore) || 0,
  };
  store.pratiche = [created, ...store.pratiche];
  store.praticaStorico = [
    {
      actorId,
      createdAt: now,
      id: uid("st"),
      nota: "Pratica creata.",
      praticaId: created.id,
      responsabileNuovoId: created.responsabileId,
      responsabilePrecedenteId: null,
      stepNuovoId: created.stepAttualeId,
      stepPrecedenteId: null,
      tipo: "creazione",
    },
    ...store.praticaStorico,
  ];
  return created;
}

// --- Agenda condivisa ----------------------------------------------------------

export async function fetchAgendaEventi() {
  return store.agendaEventi.filter((evento) => {
    if (!evento.praticaId) return true;
    const pratica = store.pratiche.find((item) => item.id === evento.praticaId);
    return pratica ? canViewPratica(pratica) : false;
  });
}

export async function createAgendaEvento(evento, actorId) {
  const created = {
    creatoDa: actorId,
    data: evento.data,
    descrizione: evento.descrizione || "",
    id: uid("ag"),
    ora: evento.ora || "",
    partecipanti: toAssignedUsers(evento.partecipantiIds),
    praticaId: evento.praticaId || null,
    tipo: evento.tipo || "altro",
    titolo: evento.titolo,
  };
  store.agendaEventi = [...store.agendaEventi, created];
  return created;
}

export async function deleteAgendaEvento(eventoId) {
  store.agendaEventi = store.agendaEventi.filter((item) => item.id !== eventoId);
}

// --- Documenti di pratica (import/OCR riusato dal modulo Preventivi) --------

export async function fetchPraticaDocumenti(praticaId) {
  const pratica = store.pratiche.find((item) => item.id === praticaId);
  if (!pratica || !canViewPratica(pratica)) return [];
  return store.praticaDocumenti
    .filter((doc) => doc.praticaId === praticaId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function createPraticaDocumento(document, actorId) {
  const pratica = store.pratiche.find((item) => item.id === document.praticaId);
  if (!pratica || !canViewPratica(pratica, actorId)) throw new Error("Non hai visibilità su questa pratica.");

  const created = {
    caricatoDa: actorId,
    createdAt: nowIso(),
    datiEstratti: document.datiEstratti || null,
    id: uid("doc"),
    nome: document.nome,
    praticaId: document.praticaId,
    tipo: document.tipo || null,
  };
  store.praticaDocumenti = [created, ...store.praticaDocumenti];
  return created;
}

export async function deletePraticaDocumento(documentId) {
  store.praticaDocumenti = store.praticaDocumenti.filter((doc) => doc.id !== documentId);
}
