import { appointmentTypes, opportunityPipelineStages } from "./constants.js";

export const parseCurrency = (value) =>
  Number(String(value).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0;

export const formatCurrency = (value) =>
  new Intl.NumberFormat("it-IT", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(value) || 0);

export const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const fromDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const formatLongDate = (date) =>
  new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  }).format(date);

export const formatMonthYear = (date) =>
  new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(date);

export const formatDateLabel = (dateKey) => {
  if (!dateKey) return "Non indicato";
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(fromDateKey(dateKey));
};

export const assignmentSummary = (assignedUsers = []) =>
  assignedUsers.length ? assignedUsers.map((user) => user.userName).join(", ") : "Non assegnato";

export const normalizeSearch = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export const matchesSearch = (query, values) => {
  const normalizedQuery = normalizeSearch(query);
  return !normalizedQuery || values.some((value) => normalizeSearch(value).includes(normalizedQuery));
};

export const userInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export const dueDateTone = (dateKey, soonThresholdDays = 3) => {
  if (!dateKey) return "neutral";
  const days = Math.ceil((fromDateKey(dateKey) - new Date()) / 86400000);
  if (days < 0) return "overdue";
  if (days <= soonThresholdDays) return "soon";
  return "neutral";
};

// Variante a 4 livelli usata dal pannello Pratiche: separa un livello
// "critical" (scadenza entro 48 ore) dal generico "soon", cosi' le pratiche
// davvero imminenti hanno un indicatore distinto invece di sparire dentro
// la stessa fascia "entro 7 giorni".
export const praticaUrgencyTone = (dateKey, { criticalDays = 2, soonDays = 7 } = {}) => {
  if (!dateKey) return "neutral";
  const days = Math.ceil((fromDateKey(dateKey) - new Date()) / 86400000);
  if (days < 0) return "overdue";
  if (days <= criticalDays) return "critical";
  if (days <= soonDays) return "soon";
  return "neutral";
};

export const appointmentTypeLabel = (value) => appointmentTypes.find((type) => type.value === value)?.label || "Appuntamento";
export const opportunityStatusLabel = (status) => opportunityPipelineStages.find((stage) => stage.value === status)?.label || status;
export const opportunityStageIndex = (status) =>
  Math.max(
    0,
    opportunityPipelineStages.findIndex((stage) => stage.value === status),
  );
