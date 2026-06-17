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
  createdAt: row.created_at,
  createdBy: profileLabel(profilesById, row.created_by),
  customerId: row.customer_id,
  customerName: customersById.get(row.customer_id)?.name || "Cliente non collegato",
  description: row.description || "",
  dueDate: row.due_date,
  dueDateLabel: formatDate(row.due_date),
  estimatedValue: formatCurrency(row.estimated_value),
  estimatedValueNumber: Number(row.estimated_value) || 0,
  id: row.id,
  nextAction: row.next_action || "",
  priority: row.priority,
  source: row.source,
  status: row.status,
  steps: [...steps].sort((first, second) => first.position - second.position),
  title: row.title,
  type: row.type,
  updatedAt: row.updated_at,
  updatedBy: profileLabel(profilesById, row.updated_by || row.created_by),
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
    { data: opportunityRows, error: opportunityError },
    { data: opportunityStepRows, error: opportunityStepError },
  ] =
    await Promise.all([
      supabase.from("crm_customers").select("*").order("created_at", { ascending: false }),
      supabase.from("crm_appointments").select("*").order("appointment_date").order("appointment_time"),
      supabase.from("crm_assignments").select("*").in("target_type", ["cliente", "appuntamento", "opportunita", "opportunita_step"]),
      supabase.from("crm_opportunities").select("*").order("updated_at", { ascending: false }),
      supabase.from("crm_opportunity_steps").select("*").order("position"),
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

  if (opportunityError) {
    throw opportunityError;
  }

  if (opportunityStepError) {
    throw opportunityStepError;
  }

  const profilesById = await fetchProfiles(
    [
      ...customerRows.flatMap((customer) => [customer.created_by, customer.updated_by]),
      ...opportunityRows.flatMap((opportunity) => [opportunity.created_by, opportunity.updated_by]),
      ...opportunityStepRows.flatMap((step) => [step.created_by, step.updated_by]),
      ...assignmentRows.flatMap((assignment) => [assignment.user_id, assignment.created_by]),
    ],
  );
  const assignmentsByTarget = groupAssignments(assignmentRows, profilesById);
  const customersById = new Map(customerRows.map((customer) => [customer.id, customer]));
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
    customers: customerRows.map((customer) =>
      toCustomer(customer, profilesById, assignmentsByTarget.get(assignmentKey("cliente", customer.id)) || []),
    ),
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
    projects: [],
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
    created_by: userId,
    customer_id: opportunity.customerId || null,
    description: opportunity.description,
    due_date: opportunity.dueDate || null,
    estimated_value: parseCurrency(opportunity.estimatedValue),
    next_action: opportunity.nextAction,
    priority: opportunity.priority,
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
