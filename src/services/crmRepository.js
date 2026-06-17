import { supabase } from "./supabaseClient.js";

const CRM_MONTH = "2026-06";

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

const profileLabel = (profilesById, id) => {
  const profile = profilesById.get(id);
  return profile?.full_name || profile?.email || "Team GEI";
};

const toCustomer = (row, profilesById = new Map()) => ({
  address: row.address || "Indirizzo da completare",
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

const toAppointment = (row) => {
  const [, , day] = row.appointment_date.split("-");

  return {
    day: Number(day),
    detail: row.detail || "Dettagli da completare.",
    id: row.id,
    related: row.related || "",
    time: row.appointment_time.slice(0, 5),
    title: row.title,
    type: row.type,
  };
};

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
  const [{ data: customerRows, error: customerError }, { data: appointmentRows, error: appointmentError }] =
    await Promise.all([
      supabase.from("crm_customers").select("*").order("created_at", { ascending: false }),
      supabase.from("crm_appointments").select("*").order("appointment_date").order("appointment_time"),
    ]);

  if (customerError) {
    throw customerError;
  }

  if (appointmentError) {
    throw appointmentError;
  }

  const profilesById = await fetchProfiles(
    customerRows.flatMap((customer) => [customer.created_by, customer.updated_by]),
  );
  const appointments = appointmentRows.map(toAppointment);

  return {
    calendarEvents: appointments.map((appointment) => ({
      day: appointment.day,
      id: appointment.id,
      label: `${appointment.time} ${appointment.title}`,
      type: appointment.type,
    })),
    customers: customerRows.map((customer) => toCustomer(customer, profilesById)),
    pipeline: [],
    projects: [],
    tasks: [],
    todayAppointments: appointments.filter((appointment) => appointment.day === 16),
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

  const profilesById = await fetchProfiles([data.created_by, data.updated_by]);
  return toCustomer(data, profilesById);
}

export async function createAppointment(appointment, userId) {
  const payload = {
    appointment_date: `${CRM_MONTH}-${String(appointment.day).padStart(2, "0")}`,
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

  return toAppointment(data);
}
