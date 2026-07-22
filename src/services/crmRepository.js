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
  }).select("id,email,full_name").single();

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

// --- Pratiche multi-settore ------------------------------------------------
// Vedi supabase/migrations/20260722_000001_pratiche_multisettore.sql

const toSettore = (row) => ({
  attivo: row.attivo,
  colore: row.colore,
  id: row.id,
  nome: row.nome,
  posizione: row.posizione,
  slug: row.slug,
});

const toPraticaStep = (row) => ({
  chiave: row.chiave,
  id: row.id,
  nome: row.nome,
  posizione: row.posizione,
  settoreId: row.settore_id,
});

const toPratica = (row) => ({
  createdAt: row.created_at,
  createdBy: row.created_by,
  customerId: row.customer_id,
  descrizione: row.descrizione || "",
  id: row.id,
  priorita: row.priorita,
  responsabileId: row.responsabile_id,
  scadenza: row.scadenza,
  settoreId: row.settore_id,
  stato: row.stato,
  stepAttualeId: row.step_attuale_id,
  titolo: row.titolo,
  updatedAt: row.updated_at,
  updatedBy: row.updated_by,
  valore: Number(row.valore) || 0,
});

const toPraticaStorico = (row) => ({
  actorId: row.actor_id,
  createdAt: row.created_at,
  id: row.id,
  nota: row.nota || "",
  praticaId: row.pratica_id,
  responsabileNuovoId: row.responsabile_nuovo_id,
  responsabilePrecedenteId: row.responsabile_precedente_id,
  stepNuovoId: row.step_nuovo_id,
  stepPrecedenteId: row.step_precedente_id,
  tipo: row.tipo,
});

export async function fetchPraticheData() {
  const [
    { data: settoriRows, error: settoriError },
    { data: stepRows, error: stepError },
    { data: praticheRows, error: praticheError },
    { data: storicoRows, error: storicoError },
  ] = await Promise.all([
    supabase.from("crm_settori").select("*").order("posizione"),
    supabase.from("crm_pratica_steps").select("*").order("posizione"),
    supabase.from("crm_pratiche").select("*").order("updated_at", { ascending: false }),
    supabase.from("crm_pratica_storico").select("*").order("created_at", { ascending: false }),
  ]);

  if (settoriError) throw settoriError;
  if (stepError) throw stepError;
  if (praticheError) throw praticheError;
  if (storicoError) throw storicoError;

  return {
    pratiche: praticheRows.map(toPratica),
    praticaStorico: storicoRows.map(toPraticaStorico),
    praticaSteps: stepRows.map(toPraticaStep),
    settori: settoriRows.map(toSettore),
  };
}

export async function createPratica(pratica, userId) {
  const { data: steps, error: stepsError } = await supabase
    .from("crm_pratica_steps")
    .select("id")
    .eq("settore_id", pratica.settoreId)
    .order("posizione")
    .limit(1);
  if (stepsError) throw stepsError;

  const payload = {
    created_by: userId,
    customer_id: pratica.customerId || null,
    descrizione: pratica.descrizione || "",
    priorita: pratica.priorita || "media",
    responsabile_id: pratica.responsabileId || userId,
    scadenza: pratica.scadenza || null,
    settore_id: pratica.settoreId,
    step_attuale_id: steps?.[0]?.id || null,
    titolo: pratica.titolo,
    updated_by: userId,
    valore: Number(pratica.valore) || 0,
  };

  const { data, error } = await supabase.from("crm_pratiche").insert(payload).select("*").single();
  if (error) throw error;

  const { error: storicoError } = await supabase.from("crm_pratica_storico").insert({
    actor_id: userId,
    nota: "Pratica creata.",
    pratica_id: data.id,
    responsabile_nuovo_id: data.responsabile_id,
    step_nuovo_id: data.step_attuale_id,
    tipo: "creazione",
  });
  if (storicoError) throw storicoError;

  return toPratica(data);
}

export async function moveToNextStep(praticaId, nuovoStepId, userId, nota = "") {
  const { data: pratica, error: fetchError } = await supabase
    .from("crm_pratiche")
    .select("step_attuale_id")
    .eq("id", praticaId)
    .single();
  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from("crm_pratiche")
    .update({ step_attuale_id: nuovoStepId, updated_at: new Date().toISOString(), updated_by: userId })
    .eq("id", praticaId)
    .select("*")
    .single();
  if (error) throw error;

  const { error: storicoError } = await supabase.from("crm_pratica_storico").insert({
    actor_id: userId,
    nota,
    pratica_id: praticaId,
    step_nuovo_id: nuovoStepId,
    step_precedente_id: pratica.step_attuale_id,
    tipo: "step",
  });
  if (storicoError) throw storicoError;

  return toPratica(data);
}

export async function reassignResponsabile(praticaId, nuovoResponsabileId, userId, nota = "") {
  const { data: pratica, error: fetchError } = await supabase
    .from("crm_pratiche")
    .select("responsabile_id")
    .eq("id", praticaId)
    .single();
  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from("crm_pratiche")
    .update({ responsabile_id: nuovoResponsabileId, updated_at: new Date().toISOString(), updated_by: userId })
    .eq("id", praticaId)
    .select("*")
    .single();
  if (error) throw error;

  const { error: storicoError } = await supabase.from("crm_pratica_storico").insert({
    actor_id: userId,
    nota,
    pratica_id: praticaId,
    responsabile_nuovo_id: nuovoResponsabileId,
    responsabile_precedente_id: pratica.responsabile_id,
    tipo: "responsabile",
  });
  if (storicoError) throw storicoError;

  return toPratica(data);
}

// --- Agenda condivisa -------------------------------------------------------

const toAgendaEvento = (row, assignments = []) => ({
  creatoDa: row.creato_da,
  data: row.data,
  descrizione: row.descrizione || "",
  id: row.id,
  ora: row.ora ? row.ora.slice(0, 5) : "",
  partecipanti: assignments,
  praticaId: row.pratica_id,
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
    ora: evento.ora || null,
    pratica_id: evento.praticaId || null,
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
