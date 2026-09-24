import { supabase } from "./supabaseClient.js";

const parseCurrency = (value) => Number(String(value).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0;

const formatDate = (value) => {
  if (!value) {
    return "Non indicato";
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("it-IT", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(value) || 0);

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const profileLabel = (profilesById, id) => {
  const profile = profilesById.get(id);
  return profile?.full_name || profile?.email || "Team GEI";
};

const toTeamMember = (profile) => ({
  email: profile.email,
  id: profile.id,
  name: profile.full_name || profile.email || "Utente CRM",
});

const toAssignment = (assignment, profilesById) => ({
  id: assignment.id,
  role: assignment.role,
  userId: assignment.user_id,
  userName: profileLabel(profilesById, assignment.user_id),
});

const assignmentKey = (targetType, targetId) => `${targetType}:${targetId}`;

const groupAssignments = (assignmentRows, profilesById) =>
  assignmentRows.reduce((groups, assignment) => {
    const key = assignmentKey(assignment.target_type, assignment.target_id);
    groups.set(key, [...(groups.get(key) || []), toAssignment(assignment, profilesById)]);
    return groups;
  }, new Map());

const toCustomer = (row, profilesById = new Map(), assignments = []) => ({
  activities: row.activities || [],
  address: row.address || "Indirizzo da completare",
  assignedUsers: assignments,
  createdAt: row.created_at,
  createdBy: profileLabel(profilesById, row.created_by),
  email: row.email || "Non indicata",
  id: row.id,
  lastContact: formatDate(row.updated_at || row.created_at),
  name: row.name,
  openValue: formatCurrency(row.open_value),
  phone: row.phone || "Non indicato",
  primaryContact: row.primary_contact,
  projects: row.projects || [],
  status: row.status,
  tags: row.tags || [],
  type: row.type,
  updatedAt: row.updated_at,
  updatedBy: profileLabel(profilesById, row.updated_by || row.created_by),
});

const toCustomerActivity = (row, profilesById = new Map()) => ({
  action: row.action,
  actor: profileLabel(profilesById, row.actor_id),
  createdAt: row.created_at,
  dateLabel: formatDate(row.created_at),
  detail: row.detail || "Attività registrata",
  id: row.id,
});

const toAppointment = (row, profilesById = new Map(), assignments = []) => {
  const [, , day] = row.appointment_date.split("-");

  return {
    assignedUsers: assignments,
    date: row.appointment_date,
    day: Number(day),
    detail: row.detail || "Dettagli da completare.",
    id: row.id,
    related: row.related || "",
    time: row.appointment_time.slice(0, 5),
    title: row.title,
    type: row.type,
  };
};

const toOpportunityStep = (row, profilesById = new Map(), assignments = []) => ({
  assignedUsers: assignments,
  createdAt: row.created_at,
  createdBy: profileLabel(profilesById, row.created_by),
  detail: row.detail || "",
  id: row.id,
  opportunityId: row.opportunity_id,
  parentStepId: row.parent_step_id,
  position: row.position,
  status: row.status,
  title: row.title,
  updatedAt: row.updated_at,
  updatedBy: profileLabel(profilesById, row.updated_by || row.created_by),
});

const toOpportunity = (row, customersById = new Map(), profilesById = new Map(), assignments = [], steps = []) => ({
  assignedUsers: assignments,
  bidDecision: row.bid_decision || "da_valutare",
  createdAt: row.created_at,
  createdBy: profileLabel(profilesById, row.created_by),
  customerId: row.customer_id,
  customerName: customersById.get(row.customer_id)?.name || "Cliente non collegato",
  description: row.description || "",
  dueDate: row.due_date,
  dueDateLabel: formatDate(row.due_date),
  estimatedCost: formatCurrency(row.estimated_cost),
  estimatedCostNumber: Number(row.estimated_cost) || 0,
  estimatedValue: formatCurrency(row.estimated_value),
  estimatedValueNumber: Number(row.estimated_value) || 0,
  id: row.id,
  lossReason: row.loss_reason || "",
  margin: formatCurrency((Number(row.estimated_value) || 0) - (Number(row.estimated_cost) || 0)),
  marginNumber: (Number(row.estimated_value) || 0) - (Number(row.estimated_cost) || 0),
  nextAction: row.next_action || "",
  probability: Number(row.probability) || 0,
  priority: row.priority,
  source: row.source,
  status: row.status,
  steps: [...steps].sort((first, second) => first.position - second.position),
  title: row.title,
  type: row.type,
  updatedAt: row.updated_at,
  updatedBy: profileLabel(profilesById, row.updated_by || row.created_by),
});

const toQuote = (row, customersById = new Map(), opportunitiesById = new Map(), profilesById = new Map()) => {
  const items = Array.isArray(row.items) ? row.items : [];
  const subtotalNumber = items.reduce((total, item) => total + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const discountNumber = subtotalNumber * ((Number(row.discount) || 0) / 100);
  const taxableNumber = subtotalNumber - discountNumber;
  const vatNumber = taxableNumber * ((Number(row.vat_rate) || 0) / 100);
  const totalNumber = taxableNumber + vatNumber;

  return {
    createdAt: row.created_at,
    createdBy: profileLabel(profilesById, row.created_by),
    customerId: row.customer_id,
    customerName: customersById.get(row.customer_id)?.name || "Cliente non collegato",
    discount: Number(row.discount) || 0,
    discountValue: formatCurrency(discountNumber),
    id: row.id,
    issueDate: row.issue_date,
    items,
    notes: row.notes || "",
    opportunityId: row.opportunity_id,
    opportunityTitle: opportunitiesById.get(row.opportunity_id)?.title || "Nessuna opportunità",
    quoteNumber: row.quote_number,
    status: row.status,
    subject: row.subject,
    subtotal: formatCurrency(subtotalNumber),
    subtotalNumber,
    taxable: formatCurrency(taxableNumber),
    total: formatCurrency(totalNumber),
    totalNumber,
    updatedAt: row.updated_at,
    updatedBy: profileLabel(profilesById, row.updated_by || row.created_by),
    validUntil: row.valid_until,
    vat: formatCurrency(vatNumber),
    vatRate: Number(row.vat_rate) || 0,
  };
};

const toPriceItem = (row) => ({
  active: row.active,
  category: row.category || "Generale",
  code: row.code || "",
  createdById: row.created_by,
  description: row.description,
  id: row.id,
  unit: row.unit || "cad",
  unitPrice: Number(row.unit_price) || 0,
  updatedAt: row.updated_at,
});

async function fetchProfiles(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))];

  if (!ids.length) {
    return new Map();
  }

  const { data, error } = await supabase.from("crm_profiles").select("id,email,full_name").in("id", ids);

  if (error) {
    throw error;
  }

  return new Map(data.map((profile) => [profile.id, profile]));
}

async function fetchTeamMembers() {
  const { data, error } = await supabase
    .from("crm_profiles")
    .select("id,email,full_name")
    .order("full_name")
    .order("email");

  if (error) {
    throw error;
  }

  return data.map(toTeamMember);
}

async function insertAssignments(targetType, targetId, userIds, actorId) {
  const uniqueUserIds = [...new Set((userIds || []).filter(Boolean))];

  if (!uniqueUserIds.length) {
    return [];
  }

  const rows = uniqueUserIds.map((userId, index) => ({
    created_by: actorId,
    role: index === 0 ? "responsabile" : "collaboratore",
    target_id: targetId,
    target_type: targetType,
    user_id: userId,
  }));

  const { data, error } = await supabase
    .from("crm_assignments")
    .upsert(rows, { ignoreDuplicates: true, onConflict: "target_type,target_id,user_id" })
    .select("*");

  if (error) {
    throw error;
  }

  return data || [];
}

export async function saveCurrentProfile(user) {
  const { data: existingProfile, error: fetchError } = await supabase
    .from("crm_profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  const fullName = user.user_metadata?.full_name?.trim() || existingProfile?.full_name || "";

  const { data, error } = await supabase.from("crm_profiles").upsert({
    email: user.email || "",
    full_name: fullName,
    id: user.id,
  }).select("id,email,full_name,ruolo").single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateDisplayName(user, displayName) {
  const fullName = displayName.trim();

  if (!fullName) {
    throw new Error("Inserisci un nome visualizzato.");
  }

  const { data: authData, error: authError } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      full_name: fullName,
    },
  });

  if (authError) {
    throw authError;
  }

  const { data, error } = await supabase
    .from("crm_profiles")
    .upsert({
      email: authData.user.email || user.email || "",
      full_name: fullName,
      id: authData.user.id,
    })
    .select("id,email,full_name")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchCrmState() {
  const [
    { data: customerRows, error: customerError },
    { data: appointmentRows, error: appointmentError },
    { data: assignmentRows, error: assignmentError },
    { data: customerActivityRows, error: customerActivityError },
    { data: opportunityRows, error: opportunityError },
    { data: opportunityStepRows, error: opportunityStepError },
    { data: quoteRows, error: quoteError },
    { data: priceRows, error: priceError },
  ] =
    await Promise.all([
      supabase.from("crm_customers").select("*").order("created_at", { ascending: false }),
      supabase.from("crm_appointments").select("*").order("appointment_date").order("appointment_time"),
      supabase.from("crm_assignments").select("*").in("target_type", ["cliente", "appuntamento", "opportunita", "opportunita_step"]),
      supabase.from("crm_customer_activities").select("*").order("created_at", { ascending: false }),
      supabase.from("crm_opportunities").select("*").order("updated_at", { ascending: false }),
      supabase.from("crm_opportunity_steps").select("*").order("position"),
      supabase.from("crm_quotes").select("*").order("updated_at", { ascending: false }),
      supabase.from("crm_price_list").select("*").order("category").order("description"),
    ]);

  if (customerError) {
    throw customerError;
  }

  if (appointmentError) {
    throw appointmentError;
  }

  if (assignmentError) {
    throw assignmentError;
  }

  if (customerActivityError) {
    throw customerActivityError;
  }

  if (opportunityError) {
    throw opportunityError;
  }

  if (opportunityStepError) {
    throw opportunityStepError;
  }

  if (quoteError) {
    throw quoteError;
  }

  if (priceError) {
    throw priceError;
  }

  const profilesById = await fetchProfiles(
    [
      ...customerRows.flatMap((customer) => [customer.created_by, customer.updated_by]),
      ...opportunityRows.flatMap((opportunity) => [opportunity.created_by, opportunity.updated_by]),
      ...opportunityStepRows.flatMap((step) => [step.created_by, step.updated_by]),
      ...assignmentRows.flatMap((assignment) => [assignment.user_id, assignment.created_by]),
      ...customerActivityRows.map((activity) => activity.actor_id),
      ...quoteRows.flatMap((quote) => [quote.created_by, quote.updated_by]),
    ],
  );
  const assignmentsByTarget = groupAssignments(assignmentRows, profilesById);
  const activitiesByCustomer = customerActivityRows.reduce((groups, activity) => {
    groups.set(activity.customer_id, [...(groups.get(activity.customer_id) || []), toCustomerActivity(activity, profilesById)]);
    return groups;
  }, new Map());
  const customersById = new Map(customerRows.map((customer) => [customer.id, customer]));
  const opportunitiesById = new Map(opportunityRows.map((opportunity) => [opportunity.id, opportunity]));
  const appointments = appointmentRows.map((appointment) =>
    toAppointment(appointment, profilesById, assignmentsByTarget.get(assignmentKey("appuntamento", appointment.id)) || []),
  );
  const opportunityStepsById = opportunityStepRows.map((step) =>
    toOpportunityStep(step, profilesById, assignmentsByTarget.get(assignmentKey("opportunita_step", step.id)) || []),
  );
  const stepsByOpportunity = opportunityStepsById.reduce((groups, step) => {
    groups.set(step.opportunityId, [...(groups.get(step.opportunityId) || []), step]);
    return groups;
  }, new Map());
  const todayKey = toDateKey(new Date());
  const teamMembers = await fetchTeamMembers();

  return {
    appointments,
    calendarEvents: appointments.map((appointment) => ({
      date: appointment.date,
      day: appointment.day,
      id: appointment.id,
      label: `${appointment.time} ${appointment.title}`,
      type: appointment.type,
    })),
    customers: customerRows.map((customer) => toCustomer(
      { ...customer, activities: activitiesByCustomer.get(customer.id) || [] },
      profilesById,
      assignmentsByTarget.get(assignmentKey("cliente", customer.id)) || [],
    )),
    opportunities: opportunityRows.map((opportunity) =>
      toOpportunity(
        opportunity,
        customersById,
        profilesById,
        assignmentsByTarget.get(assignmentKey("opportunita", opportunity.id)) || [],
        stepsByOpportunity.get(opportunity.id) || [],
      ),
    ),
    pipeline: [],
    priceList: priceRows.map(toPriceItem),
    projects: [],
    quotes: quoteRows.map((quote) => toQuote(quote, customersById, opportunitiesById, profilesById)),
    tasks: [],
    teamMembers,
    todayAppointments: appointments.filter((appointment) => appointment.date === todayKey),
  };
}

export async function createCustomer(customer, userId) {
  const payload = {
    address: customer.address,
    created_by: userId,
    email: customer.email,
    name: customer.name,
    open_value: parseCurrency(customer.openValue),
    phone: customer.phone,
    primary_contact: customer.primaryContact,
    projects: customer.projects,
    status: customer.status,
    tags: customer.tags,
    type: customer.type,
    updated_by: userId,
  };

  const { data, error } = await supabase.from("crm_customers").insert(payload).select("*").single();

  if (error) {
    throw error;
  }

  await supabase.from("crm_customer_activities").insert({
    action: "cliente_creato",
    actor_id: userId,
    customer_id: data.id,
    detail: `Creata anagrafica cliente ${data.name}`,
  });

  const assignments = await insertAssignments("cliente", data.id, customer.assignedUserIds, userId);
  const profilesById = await fetchProfiles([data.created_by, data.updated_by, ...assignments.map((item) => item.user_id)]);
  return toCustomer(data, profilesById, assignments.map((assignment) => toAssignment(assignment, profilesById)));
}

export async function updateCustomer(customer, userId) {
  const payload = {
    address: customer.address,
    email: customer.email,
    name: customer.name,
    open_value: parseCurrency(customer.openValue),
    phone: customer.phone,
    primary_contact: customer.primaryContact,
    projects: customer.projects,
    status: customer.status,
    tags: customer.tags,
    type: customer.type,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("crm_customers")
    .update(payload)
    .eq("id", customer.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const { error: deleteError } = await supabase
    .from("crm_assignments")
    .delete()
    .eq("target_type", "cliente")
    .eq("target_id", customer.id);

  if (deleteError) {
    throw deleteError;
  }

  await insertAssignments("cliente", customer.id, customer.assignedUserIds, userId);
  const { error: activityError } = await supabase.from("crm_customer_activities").insert({
    action: "cliente_modificato",
    actor_id: userId,
    customer_id: customer.id,
    detail: `Aggiornata anagrafica cliente ${data.name}`,
  });

  if (activityError) {
    throw activityError;
  }

  return data;
}

export async function setCustomerArchived(customer, archived, userId) {
  const nextStatus = archived ? "Archiviato" : "Nuova richiesta";
  const { data, error } = await supabase
    .from("crm_customers")
    .update({ status: nextStatus, updated_at: new Date().toISOString(), updated_by: userId })
    .eq("id", customer.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const { error: activityError } = await supabase.from("crm_customer_activities").insert({
    action: archived ? "cliente_archiviato" : "cliente_riattivato",
    actor_id: userId,
    customer_id: customer.id,
    detail: archived ? `Archiviato cliente ${customer.name}` : `Riattivato cliente ${customer.name}`,
  });

  if (activityError) {
    throw activityError;
  }

  return data;
}

export async function addCustomerNote(customerId, detail, userId) {
  const note = detail.trim();

  if (!note) {
    throw new Error("Scrivi una nota prima di salvarla.");
  }

  const { data, error } = await supabase.from("crm_customer_activities").insert({
    action: "nota_aggiunta",
    actor_id: userId,
    customer_id: customerId,
    detail: note,
  }).select("*").single();

  if (error) {
    throw error;
  }

  return data;
}

const quotePayload = (quote, userId) => ({
  customer_id: quote.customerId || null,
  discount: Number(quote.discount) || 0,
  issue_date: quote.issueDate,
  items: quote.items.map((item, index) => ({
    description: item.description.trim(),
    id: item.id || crypto.randomUUID(),
    position: index + 1,
    quantity: Number(item.quantity) || 0,
    unit: item.unit || "cad",
    unitPrice: Number(item.unitPrice) || 0,
  })),
  notes: quote.notes || "",
  opportunity_id: quote.opportunityId || null,
  quote_number: quote.quoteNumber.trim(),
  status: quote.status,
  subject: quote.subject.trim(),
  updated_at: new Date().toISOString(),
  updated_by: userId,
  valid_until: quote.validUntil || null,
  vat_rate: Number(quote.vatRate) || 0,
});

export async function createQuote(quote, userId) {
  const payload = { ...quotePayload(quote, userId), created_by: userId };
  const { data, error } = await supabase.from("crm_quotes").insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateQuote(quote, userId) {
  const { data, error } = await supabase
    .from("crm_quotes")
    .update(quotePayload(quote, userId))
    .eq("id", quote.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteQuote(quoteId) {
  const { data, error } = await supabase
    .from("crm_quotes")
    .delete()
    .eq("id", quoteId)
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function createAppointment(appointment, userId) {
  const payload = {
    appointment_date: appointment.date,
    appointment_time: appointment.time,
    created_by: userId,
    detail: appointment.detail,
    related: appointment.related,
    title: appointment.title,
    type: appointment.type,
    updated_by: userId,
  };

  const { data, error } = await supabase.from("crm_appointments").insert(payload).select("*").single();

  if (error) {
    throw error;
  }

  const assignments = await insertAssignments("appuntamento", data.id, appointment.assignedUserIds, userId);
  const profilesById = await fetchProfiles(assignments.map((item) => item.user_id));
  return toAppointment(data, profilesById, assignments.map((assignment) => toAssignment(assignment, profilesById)));
}

export async function updateAppointment(appointment, userId) {
  const payload = {
    appointment_date: appointment.date,
    appointment_time: appointment.time,
    detail: appointment.detail,
    related: appointment.related,
    title: appointment.title,
    type: appointment.type,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from("crm_appointments")
    .update(payload)
    .eq("id", appointment.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const { error: deleteError } = await supabase
    .from("crm_assignments")
    .delete()
    .eq("target_type", "appuntamento")
    .eq("target_id", appointment.id)
    .eq("created_by", userId);

  if (deleteError) {
    throw deleteError;
  }

  const assignments = await insertAssignments("appuntamento", data.id, appointment.assignedUserIds, userId);
  const profilesById = await fetchProfiles(assignments.map((item) => item.user_id));
  return toAppointment(data, profilesById, assignments.map((assignment) => toAssignment(assignment, profilesById)));
}

export async function createOpportunity(opportunity, userId) {
  const payload = {
    bid_decision: opportunity.bidDecision,
    created_by: userId,
    customer_id: opportunity.customerId || null,
    description: opportunity.description,
    due_date: opportunity.dueDate || null,
    estimated_cost: parseCurrency(opportunity.estimatedCost),
    estimated_value: parseCurrency(opportunity.estimatedValue),
    loss_reason: opportunity.lossReason || "",
    next_action: opportunity.nextAction,
    priority: opportunity.priority,
    probability: Number(opportunity.probability) || 0,
    source: opportunity.source,
    status: "nuova",
    title: opportunity.title,
    type: opportunity.type,
    updated_by: userId,
  };

  const { data, error } = await supabase.from("crm_opportunities").insert(payload).select("*").single();

  if (error) {
    throw error;
  }

  await supabase.from("crm_opportunity_storico").insert({
    actor_id: userId,
    nota: "Opportunità creata.",
    opportunity_id: data.id,
    stato_nuovo: data.status,
    tipo: "creazione",
  });

  await insertAssignments("opportunita", data.id, opportunity.assignedUserIds, userId);

  const firstStep = opportunity.firstStep || {};
  if (firstStep.title) {
    await createOpportunityStep(
      {
        assignedUserIds: firstStep.assignedUserIds?.length ? firstStep.assignedUserIds : opportunity.assignedUserIds,
        detail: firstStep.detail,
        opportunityId: data.id,
        parentStepId: null,
        position: 1,
        status: firstStep.status || "da_fare",
        title: firstStep.title,
      },
      userId,
    );
  }

  return data;
}

export async function updateOpportunity(opportunity, userId) {
  const payload = {
    bid_decision: opportunity.bidDecision,
    customer_id: opportunity.customerId || null,
    description: opportunity.description,
    due_date: opportunity.dueDate || null,
    estimated_cost: parseCurrency(opportunity.estimatedCost),
    estimated_value: parseCurrency(opportunity.estimatedValue),
    loss_reason: opportunity.lossReason || "",
    next_action: opportunity.nextAction,
    priority: opportunity.priority,
    probability: Number(opportunity.probability) || 0,
    source: opportunity.source,
    title: opportunity.title,
    type: opportunity.type,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from("crm_opportunities")
    .update(payload)
    .eq("id", opportunity.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const { error: deleteError } = await supabase
    .from("crm_assignments")
    .delete()
    .eq("target_type", "opportunita")
    .eq("target_id", opportunity.id);

  if (deleteError) {
    throw deleteError;
  }

  await insertAssignments("opportunita", data.id, opportunity.assignedUserIds, userId);
  return data;
}

export async function updateOpportunityStage(opportunityId, status, userId) {
  const { data: previous, error: fetchError } = await supabase
    .from("crm_opportunities")
    .select("status")
    .eq("id", opportunityId)
    .single();
  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from("crm_opportunities")
    .update({
      status,
      updated_by: userId,
    })
    .eq("id", opportunityId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await supabase.from("crm_opportunity_storico").insert({
    actor_id: userId,
    opportunity_id: opportunityId,
    stato_nuovo: status,
    stato_precedente: previous.status,
    tipo: "stato",
  });

  return data;
}

export async function createOpportunityStep(step, userId) {
  const payload = {
    created_by: userId,
    detail: step.detail,
    opportunity_id: step.opportunityId,
    parent_step_id: step.parentStepId || null,
    position: step.position,
    status: step.status,
    title: step.title,
    updated_by: userId,
  };

  const { data, error } = await supabase.from("crm_opportunity_steps").insert(payload).select("*").single();

  if (error) {
    throw error;
  }

  const assignments = await insertAssignments("opportunita_step", data.id, step.assignedUserIds, userId);
  const profilesById = await fetchProfiles([data.created_by, data.updated_by, ...assignments.map((item) => item.user_id)]);
  return toOpportunityStep(data, profilesById, assignments.map((assignment) => toAssignment(assignment, profilesById)));
}

export async function updateOpportunityStep(step, userId) {
  const payload = {
    detail: step.detail,
    status: step.status,
    title: step.title,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from("crm_opportunity_steps")
    .update(payload)
    .eq("id", step.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const { error: deleteError } = await supabase
    .from("crm_assignments")
    .delete()
    .eq("target_type", "opportunita_step")
    .eq("target_id", step.id)
    .eq("created_by", userId);

  if (deleteError) {
    throw deleteError;
  }

  const assignments = await insertAssignments("opportunita_step", data.id, step.assignedUserIds, userId);
  const profilesById = await fetchProfiles([data.created_by, data.updated_by, ...assignments.map((item) => item.user_id)]);
  return toOpportunityStep(data, profilesById, assignments.map((assignment) => toAssignment(assignment, profilesById)));
}

const priceItemPayload = (item, userId) => ({
  active: item.active !== false,
  category: item.category?.trim() || "Generale",
  code: item.code?.trim() || "",
  description: item.description.trim(),
  unit: item.unit?.trim() || "cad",
  unit_price: Number(item.unitPrice) || 0,
  updated_at: new Date().toISOString(),
  updated_by: userId,
});

export async function createPriceItem(item, userId) {
  const { data, error } = await supabase.from("crm_price_list").insert({
    ...priceItemPayload(item, userId),
    created_by: userId,
  }).select("*").single();
  if (error) throw error;
  return toPriceItem(data);
}

export async function updatePriceItem(item, userId) {
  const { data, error } = await supabase.from("crm_price_list")
    .update(priceItemPayload(item, userId)).eq("id", item.id).select("*").single();
  if (error) throw error;
  return toPriceItem(data);
}

export async function deletePriceItem(itemId) {
  const { error } = await supabase.from("crm_price_list").delete().eq("id", itemId);
  if (error) throw error;
}

// --- Storico opportunità -----------------------------------------------------
// Vedi supabase/migrations/20260924_000001_fuse_pratiche_into_opportunities.sql

const toOpportunityStorico = (row) => ({
  actorId: row.actor_id,
  createdAt: row.created_at,
  id: row.id,
  nota: row.nota || "",
  opportunityId: row.opportunity_id,
  statoNuovo: row.stato_nuovo,
  statoPrecedente: row.stato_precedente,
  tipo: row.tipo,
});

export async function fetchOpportunityStorico(opportunityId) {
  const { data, error } = await supabase
    .from("crm_opportunity_storico")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(toOpportunityStorico);
}

// --- Documenti di opportunità (import/OCR riusato dal modulo Preventivi) ----
// Non carichiamo il file su uno storage bucket (come i preventivi non lo fanno
// oggi): salviamo solo nome, tipo e le voci estratte dall'OCR/parsing in
// dati_estratti, cosi il pattern resta coerente con importComputoFile.

const toOpportunityDocumento = (row) => ({
  caricatoDa: row.caricato_da,
  createdAt: row.created_at,
  datiEstratti: row.dati_estratti || null,
  id: row.id,
  nome: row.nome,
  opportunityId: row.opportunity_id,
  tipo: row.tipo,
  url: row.url,
});

export async function fetchOpportunityDocumenti(opportunityId) {
  const { data, error } = await supabase
    .from("crm_opportunity_documenti")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(toOpportunityDocumento);
}

export async function createOpportunityDocumento(document, userId) {
  const payload = {
    caricato_da: userId,
    dati_estratti: document.datiEstratti || null,
    nome: document.nome,
    opportunity_id: document.opportunityId,
    tipo: document.tipo || null,
  };

  const { data, error } = await supabase.from("crm_opportunity_documenti").insert(payload).select("*").single();
  if (error) throw error;
  return toOpportunityDocumento(data);
}

export async function deleteOpportunityDocumento(documentId) {
  const { error } = await supabase.from("crm_opportunity_documenti").delete().eq("id", documentId);
  if (error) throw error;
}

// --- Agenda condivisa -------------------------------------------------------

const toAgendaEvento = (row, assignments = []) => ({
  creatoDa: row.creato_da,
  data: row.data,
  descrizione: row.descrizione || "",
  id: row.id,
  opportunityId: row.opportunity_id,
  ora: row.ora ? row.ora.slice(0, 5) : "",
  partecipanti: assignments,
  tipo: row.tipo,
  titolo: row.titolo,
});

export async function fetchAgendaEventi() {
  const { data: rows, error } = await supabase.from("crm_agenda_eventi").select("*").order("data").order("ora");
  if (error) throw error;

  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("crm_assignments")
    .select("*")
    .eq("target_type", "agenda_evento");
  if (assignmentError) throw assignmentError;

  const profilesById = await fetchProfiles(assignmentRows.map((assignment) => assignment.user_id));
  const assignmentsByEvento = groupAssignments(assignmentRows, profilesById);

  return rows.map((row) => toAgendaEvento(row, assignmentsByEvento.get(assignmentKey("agenda_evento", row.id)) || []));
}

export async function createAgendaEvento(evento, userId) {
  const payload = {
    creato_da: userId,
    data: evento.data,
    descrizione: evento.descrizione || "",
    opportunity_id: evento.opportunityId || null,
    ora: evento.ora || null,
    tipo: evento.tipo || "altro",
    titolo: evento.titolo,
  };

  const { data, error } = await supabase.from("crm_agenda_eventi").insert(payload).select("*").single();
  if (error) throw error;

  const assignments = await insertAssignments("agenda_evento", data.id, evento.partecipantiIds, userId);
  const profilesById = await fetchProfiles(assignments.map((item) => item.user_id));
  return toAgendaEvento(data, assignments.map((assignment) => toAssignment(assignment, profilesById)));
}

export async function deleteAgendaEvento(eventoId) {
  const { error } = await supabase.from("crm_agenda_eventi").delete().eq("id", eventoId);
  if (error) throw error;
}

// --- Cantieri: costi, ore, marginalità ---------------------------------------
// Vedi supabase/migrations/20260926_000001_cantieri_costi_marginalita.sql

const toCantiere = (row, marginalita) => ({
  clienteId: row.cliente_id,
  costiConsuntivo: Number(marginalita?.costi_consuntivo) || 0,
  costiPrevisto: Number(marginalita?.costi_previsto) || 0,
  dataApertura: row.data_apertura,
  dataChiusuraPrevista: row.data_chiusura_prevista,
  id: row.id,
  indirizzo: row.indirizzo || "",
  margineAttuale: Number(marginalita?.margine_attuale) || 0,
  marginePrevistoAFinire: Number(marginalita?.margine_previsto_a_finire) || 0,
  opportunityId: row.opportunity_id,
  percentualeMargine: Number(marginalita?.percentuale_margine) || 0,
  responsabileId: row.responsabile_id,
  stato: row.stato,
  titolo: row.titolo,
  valoreCommessa: Number(row.valore_commessa) || 0,
});

export async function fetchCantieri() {
  const [{ data: rows, error }, { data: marginalitaRows, error: marginalitaError }] = await Promise.all([
    supabase.from("crm_cantieri").select("*").order("data_apertura", { ascending: false }),
    supabase.from("crm_cantieri_marginalita").select("*"),
  ]);
  if (error) throw error;
  if (marginalitaError) throw marginalitaError;

  const marginalitaById = new Map(marginalitaRows.map((row) => [row.cantiere_id, row]));
  return rows.map((row) => toCantiere(row, marginalitaById.get(row.id)));
}

export async function createCantiere(cantiere, userId) {
  const payload = {
    cliente_id: cantiere.clienteId || null,
    created_by: userId,
    data_apertura: cantiere.dataApertura || new Date().toISOString().slice(0, 10),
    data_chiusura_prevista: cantiere.dataChiusuraPrevista || null,
    indirizzo: cantiere.indirizzo || "",
    opportunity_id: cantiere.opportunityId || null,
    responsabile_id: cantiere.responsabileId || userId,
    titolo: cantiere.titolo,
    updated_by: userId,
    valore_commessa: Number(cantiere.valoreCommessa) || 0,
  };

  const { data, error } = await supabase.from("crm_cantieri").insert(payload).select("*").single();
  if (error) throw error;
  return toCantiere(data, null);
}

export async function updateCantiere(cantiere, userId) {
  const payload = {
    cliente_id: cantiere.clienteId || null,
    data_chiusura_prevista: cantiere.dataChiusuraPrevista || null,
    indirizzo: cantiere.indirizzo || "",
    responsabile_id: cantiere.responsabileId || null,
    stato: cantiere.stato,
    titolo: cantiere.titolo,
    updated_by: userId,
    valore_commessa: Number(cantiere.valoreCommessa) || 0,
  };

  const { data, error } = await supabase.from("crm_cantieri").update(payload).eq("id", cantiere.id).select("*").single();
  if (error) throw error;
  return toCantiere(data, null);
}

const toCantiereCosto = (row) => ({
  cantiereId: row.cantiere_id,
  categoria: row.categoria,
  createdAt: row.created_at,
  createdBy: row.created_by,
  data: row.data,
  descrizione: row.descrizione,
  fornitore: row.fornitore || "",
  id: row.id,
  importo: Number(row.importo) || 0,
  tipo: row.tipo,
});

export async function fetchCantiereCosti(cantiereId) {
  const { data, error } = await supabase
    .from("crm_cantiere_costi")
    .select("*")
    .eq("cantiere_id", cantiereId)
    .order("data", { ascending: false });
  if (error) throw error;
  return data.map(toCantiereCosto);
}

export async function createCantiereCosto(costo, userId) {
  const payload = {
    cantiere_id: costo.cantiereId,
    categoria: costo.categoria,
    created_by: userId,
    data: costo.data || new Date().toISOString().slice(0, 10),
    descrizione: costo.descrizione,
    fornitore: costo.fornitore || null,
    importo: Number(costo.importo) || 0,
    tipo: costo.tipo,
  };

  const { data, error } = await supabase.from("crm_cantiere_costi").insert(payload).select("*").single();
  if (error) throw error;
  return toCantiereCosto(data);
}

export async function deleteCantiereCosto(costoId) {
  const { error } = await supabase.from("crm_cantiere_costi").delete().eq("id", costoId);
  if (error) throw error;
}

// --- Giornale di cantiere: rapportini giornalieri ----------------------------
// Vedi supabase/migrations/20260929_000001_rapportino_giornaliero.sql

const RAPPORTINO_FOTO_BUCKET = "rapportini-cantiere";

const toRapportino = (row) => ({
  autoreId: row.autore_id,
  cantiereId: row.cantiere_id,
  createdAt: row.created_at,
  data: row.data,
  foto: [],
  id: row.id,
  lavorazioniSvolte: row.lavorazioni_svolte || "",
  meteo: row.meteo || null,
  note: row.note || "",
  ore: [],
  updatedAt: row.updated_at,
});

const toCantiereOra = (row) => ({
  collaboratoreId: row.collaboratore_id,
  createdAt: row.created_at,
  id: row.id,
  mansione: row.mansione || "",
  ore: Number(row.ore) || 0,
  rapportinoId: row.rapportino_id,
});

const toRapportinoFoto = (row, url) => ({
  caricatoDa: row.caricato_da,
  createdAt: row.created_at,
  id: row.id,
  rapportinoId: row.rapportino_id,
  storagePath: row.storage_path,
  url,
});

// Il bucket è privato: le foto si mostrano tramite URL firmati generati al
// volo, così restano valide dopo un refresh senza dover rendere il bucket
// pubblico. La scadenza (1 ora) è più che sufficiente per una sessione di
// consultazione del giornale di cantiere.
async function signRapportinoFotoUrls(fotoRows) {
  if (!fotoRows.length) return [];
  const { data: signed, error } = await supabase.storage
    .from(RAPPORTINO_FOTO_BUCKET)
    .createSignedUrls(fotoRows.map((row) => row.storage_path), 3600);
  if (error) throw error;
  return fotoRows.map((row, index) => toRapportinoFoto(row, signed[index]?.signedUrl || null));
}

export async function fetchCantiereRapportini(cantiereId) {
  const { data: rapportiniRows, error } = await supabase
    .from("crm_cantiere_rapportini")
    .select("*")
    .eq("cantiere_id", cantiereId)
    .order("data", { ascending: false });
  if (error) throw error;

  if (!rapportiniRows.length) return [];

  const rapportinoIds = rapportiniRows.map((row) => row.id);

  const [{ data: oreRows, error: oreError }, { data: fotoRows, error: fotoError }] = await Promise.all([
    supabase.from("crm_cantiere_ore").select("*").in("rapportino_id", rapportinoIds),
    supabase.from("crm_rapportino_foto").select("*").in("rapportino_id", rapportinoIds).order("created_at"),
  ]);
  if (oreError) throw oreError;
  if (fotoError) throw fotoError;

  const foto = await signRapportinoFotoUrls(fotoRows);

  return rapportiniRows.map((row) => {
    const rapportino = toRapportino(row);
    rapportino.ore = oreRows.filter((ora) => ora.rapportino_id === row.id).map(toCantiereOra);
    rapportino.foto = foto.filter((item) => item.rapportinoId === row.id);
    return rapportino;
  });
}

// Un solo rapportino per cantiere per giorno (vincolo unique(cantiere_id,
// data) in DB): se esiste già, restituiamo un errore con un codice
// riconoscibile così il frontend può proporre di aprirlo in modifica invece
// di mostrare un generico errore Postgres.
export async function createRapportino(rapportino, oreRows, userId) {
  const payload = {
    autore_id: userId,
    cantiere_id: rapportino.cantiereId,
    data: rapportino.data,
    lavorazioni_svolte: rapportino.lavorazioniSvolte || "",
    meteo: rapportino.meteo || null,
    note: rapportino.note || "",
  };

  const { data, error } = await supabase.from("crm_cantiere_rapportini").insert(payload).select("*").single();
  if (error) {
    if (error.code === "23505") {
      const duplicateError = new Error("Esiste già un rapportino per questo cantiere in questa data.");
      duplicateError.code = "RAPPORTINO_DUPLICATE";
      throw duplicateError;
    }
    throw error;
  }

  const rows = (oreRows || [])
    .filter((riga) => riga.collaboratoreId && Number(riga.ore) > 0)
    .map((riga) => ({
      collaboratore_id: riga.collaboratoreId,
      created_by: userId,
      mansione: riga.mansione || null,
      ore: Number(riga.ore) || 0,
      rapportino_id: data.id,
    }));

  if (rows.length) {
    const { error: oreError } = await supabase.from("crm_cantiere_ore").insert(rows);
    if (oreError) throw oreError;
  }

  const [created] = await fetchCantiereRapportini(rapportino.cantiereId).then((list) => list.filter((item) => item.id === data.id));
  return created || toRapportino(data);
}

export async function updateRapportino(rapportino, oreRows, userId) {
  const payload = {
    lavorazioni_svolte: rapportino.lavorazioniSvolte || "",
    meteo: rapportino.meteo || null,
    note: rapportino.note || "",
  };

  const { error } = await supabase.from("crm_cantiere_rapportini").update(payload).eq("id", rapportino.id);
  if (error) throw error;

  const { error: deleteError } = await supabase.from("crm_cantiere_ore").delete().eq("rapportino_id", rapportino.id);
  if (deleteError) throw deleteError;

  const rows = (oreRows || [])
    .filter((riga) => riga.collaboratoreId && Number(riga.ore) > 0)
    .map((riga) => ({
      collaboratore_id: riga.collaboratoreId,
      created_by: userId,
      mansione: riga.mansione || null,
      ore: Number(riga.ore) || 0,
      rapportino_id: rapportino.id,
    }));

  if (rows.length) {
    const { error: insertError } = await supabase.from("crm_cantiere_ore").insert(rows);
    if (insertError) throw insertError;
  }

  const [updated] = await fetchCantiereRapportini(rapportino.cantiereId).then((list) => list.filter((item) => item.id === rapportino.id));
  return updated;
}

export async function uploadRapportinoFoto(file, rapportinoId, userId) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${rapportinoId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(RAPPORTINO_FOTO_BUCKET).upload(path, file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("crm_rapportino_foto")
    .insert({ caricato_da: userId, rapportino_id: rapportinoId, storage_path: path })
    .select("*")
    .single();
  if (error) throw error;

  const [signed] = await signRapportinoFotoUrls([data]);
  return signed;
}

export async function deleteRapportinoFoto(fotoId, storagePath) {
  const { error: storageError } = await supabase.storage.from(RAPPORTINO_FOTO_BUCKET).remove([storagePath]);
  if (storageError) throw storageError;

  const { error } = await supabase.from("crm_rapportino_foto").delete().eq("id", fotoId);
  if (error) throw error;
}

// --- Economia: movimenti di cassa --------------------------------------------
// Vedi supabase/migrations/20260927_000001_movimenti_cassa.sql

const toMovimentoCassa = (row) => ({
  cantiereId: row.cantiere_id,
  categoria: row.categoria,
  createdAt: row.created_at,
  data: row.data,
  descrizione: row.descrizione || "",
  id: row.id,
  importo: Number(row.importo) || 0,
  tipo: row.tipo,
});

export async function fetchMovimentiCassa() {
  const { data, error } = await supabase.from("crm_movimenti_cassa").select("*").order("data", { ascending: false });
  if (error) throw error;
  return data.map(toMovimentoCassa);
}

export async function createMovimentoCassa(movimento, userId) {
  const payload = {
    cantiere_id: movimento.cantiereId || null,
    categoria: movimento.categoria,
    created_by: userId,
    data: movimento.data || new Date().toISOString().slice(0, 10),
    descrizione: movimento.descrizione || "",
    importo: Number(movimento.importo) || 0,
    tipo: movimento.tipo,
  };

  const { data, error } = await supabase.from("crm_movimenti_cassa").insert(payload).select("*").single();
  if (error) throw error;
  return toMovimentoCassa(data);
}

export async function deleteMovimentoCassa(movimentoId) {
  const { error } = await supabase.from("crm_movimenti_cassa").delete().eq("id", movimentoId);
  if (error) throw error;
}
