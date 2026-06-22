import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleGauge,
  ContactRound,
  Download,
  Calculator,
  FileText,
  FileSpreadsheet,
  GripVertical,
  HardHat,
  History,
  Link2,
  LogOut,
  Mail,
  MapPin,
  MessageSquarePlus,
  Pencil,
  Phone,
  Send,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  StickyNote,
  Target,
  Trash2,
  UploadCloud,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { navItems } from "./data.js";
import {
  addCustomerNote,
  createAppointment,
  createCustomer,
  createPriceItem,
  createQuote,
  deletePriceItem,
  deleteQuote,
  createOpportunity,
  createOpportunityStep,
  fetchCrmState,
  saveCurrentProfile,
  setCustomerArchived,
  updateDisplayName,
  updateAppointment,
  updateCustomer,
  updateOpportunity,
  updateOpportunityStage,
  updateOpportunityStep,
  updatePriceItem,
  updateQuote,
} from "./services/crmRepository.js";
import { isSupabaseConfigured, supabase } from "./services/supabaseClient.js";
import { initialCrmState } from "./store/seedData.js";
import { importComputoFile } from "./utils/computoImport.js";
import { downloadQuotePdf } from "./utils/quotePdf.js";

const navIcons = {
  agenda: CalendarDays,
  cantieri: HardHat,
  clienti: Users,
  dashboard: CircleGauge,
  opportunita: Target,
  prezzario: BookOpen,
  preventivi: FileText,
};

function Sidebar({ activeView, onViewChange, userLabel }) {
  return (
    <aside className="sidebar" aria-label="Navigazione principale">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <Building2 size={22} strokeWidth={2.2} />
        </div>
        <div>
          <strong>CRM Gei</strong>
          <span>Gestionale cantieri</span>
        </div>
      </div>

      <nav className="nav-list">
        {navItems.map((item) => {
          const NavIcon = navIcons[item.id] || CircleGauge;
          return (
            <button
              className={`nav-item ${activeView === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => onViewChange(item.id)}
              type="button"
            >
              <span aria-hidden="true"><NavIcon size={18} strokeWidth={2} /></span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <span className="status-dot"></span>
        <div>
          <strong>Team operativo</strong>
          <span>{userLabel || "Accesso Supabase"}</span>
        </div>
      </div>
    </aside>
  );
}

const appointmentTypes = [
  { value: "appointment", label: "Appuntamento" },
  { value: "visit", label: "Sopralluogo" },
  { value: "project", label: "Cantiere / progetto" },
  { value: "quote", label: "Preventivo" },
  { value: "call", label: "Telefonata / follow-up" },
];

const customerTypes = ["Privato", "Condominio", "Amministratore", "Azienda"];
const customerStatuses = ["Nuova richiesta", "Sopralluogo", "Preventivo", "Cantiere attivo", "Accettato", "Archiviato"];
const quoteStatuses = [
  { value: "bozza", label: "Bozza" },
  { value: "inviato", label: "Inviato" },
  { value: "accettato", label: "Accettato" },
  { value: "rifiutato", label: "Rifiutato" },
  { value: "scaduto", label: "Scaduto" },
];
const opportunitySources = ["Lead", "Cliente", "Amministratore", "Passaparola", "Richiesta diretta"];
const opportunityTypes = ["Computo metrico", "Sopralluogo", "Preventivo", "Manutenzione", "Nuovo cantiere"];
const opportunityPriorities = ["bassa", "media", "alta"];
const opportunityPipelineStages = [
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
const closedOpportunityStatuses = ["vinta", "persa"];
const bidDecisionLabels = {
  da_valutare: "Da valutare",
  procedere: "Procedere",
  non_procedere: "Non procedere",
};
const stepStatuses = {
  da_fare: "Da fare",
  in_corso: "In corso",
  completato: "Completato",
  bloccato: "Bloccato",
};

const parseCurrency = (value) => Number(value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0;

const formatCurrency = (value) =>
  new Intl.NumberFormat("it-IT", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatLongDate = (date) =>
  new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  }).format(date);

const formatMonthYear = (date) =>
  new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(date);

const assignmentSummary = (assignedUsers = []) =>
  assignedUsers.length ? assignedUsers.map((user) => user.userName).join(", ") : "Non assegnato";

const normalizeSearch = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const matchesSearch = (query, values) => {
  const normalizedQuery = normalizeSearch(query);
  return !normalizedQuery || values.some((value) => normalizeSearch(value).includes(normalizedQuery));
};

const userInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const dueDateTone = (dateKey) => {
  if (!dateKey) return "neutral";
  const days = Math.ceil((fromDateKey(dateKey) - new Date()) / 86400000);
  if (days < 0) return "overdue";
  if (days <= 3) return "soon";
  return "neutral";
};

const appointmentTypeLabel = (value) => appointmentTypes.find((type) => type.value === value)?.label || "Appuntamento";
const opportunityStatusLabel = (status) => opportunityPipelineStages.find((stage) => stage.value === status)?.label || status;
const opportunityStageIndex = (status) =>
  Math.max(
    0,
    opportunityPipelineStages.findIndex((stage) => stage.value === status),
  );

function AssignmentSelector({ selectedUserIds = [], teamMembers = [], onChange }) {
  const toggleUser = (userId) => {
    onChange(
      selectedUserIds.includes(userId)
        ? selectedUserIds.filter((selectedId) => selectedId !== userId)
        : [...selectedUserIds, userId],
    );
  };

  return (
    <fieldset className="assignment-fieldset">
      <legend>Assegna a</legend>
      {teamMembers.length ? (
        <div className="assignment-options">
          {teamMembers.map((member) => (
            <label className="assignment-option" key={member.id}>
              <input
                checked={selectedUserIds.includes(member.id)}
                onChange={() => toggleUser(member.id)}
                type="checkbox"
              />
              <span>{member.name}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="field-help">Gli utenti compariranno qui dopo il primo accesso al CRM.</p>
      )}
    </fieldset>
  );
}

function CenteredState({ children }) {
  return (
    <main className="centered-state">
      <section className="panel auth-panel">{children}</section>
    </main>
  );
}

function ConfigMissing() {
  return (
    <CenteredState>
      <p className="eyebrow">Configurazione</p>
      <h1>Supabase non configurato</h1>
      <p className="auth-copy">Aggiungi URL e publishable key nelle variabili ambiente del progetto.</p>
    </CenteredState>
  );
}

function LoadingState() {
  return (
    <CenteredState>
      <p className="eyebrow">CRM Gei</p>
      <h1>Caricamento dati</h1>
      <p className="auth-copy">Sto preparando il gestionale con i dati Supabase.</p>
    </CenteredState>
  );
}

function AuthPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage("Credenziali non valide o utente non ancora attivo.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-hero" aria-label="Accesso CRM Gei">
        <div className="brand large-brand">
          <div className="brand-mark" aria-hidden="true">
            <Building2 size={26} strokeWidth={2.2} />
          </div>
          <div>
            <strong>CRM Gei</strong>
            <span>Accesso riservato al team</span>
          </div>
        </div>
      </section>
      <section className="panel auth-panel">
        <p className="eyebrow">Supabase</p>
        <h1>Accedi al CRM</h1>
        <p className="auth-copy">Usa il tuo account aziendale per lavorare su clienti, agenda e cantieri.</p>

        <form className="appointment-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {errorMessage && <p className="form-error">{errorMessage}</p>}
          <button className="primary-button full-width" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Accesso in corso" : "Accedi"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Topbar({ currentDateLabel, onEditProfile, onNewAppointment, onSearchChange, onSignOut, searchPlaceholder, searchQuery, title, userEmail, userLabel }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{currentDateLabel}</p>
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        <label className="search">
          <Search aria-hidden="true" size={17} />
          <input onChange={(event) => onSearchChange(event.target.value)} type="search" placeholder={searchPlaceholder} value={searchQuery} />
          {searchQuery && (
            <button aria-label="Cancella ricerca" className="search-clear" onClick={() => onSearchChange("")} type="button">
              <X size={15} />
            </button>
          )}
        </label>
        <button className="icon-button" type="button" aria-label="Notifiche" title="Notifiche">
          <Bell size={18} />
        </button>
        <button className="ghost-button profile-button" onClick={onEditProfile} type="button" title={userEmail}>
          <UserRound aria-hidden="true" size={17} />
          <span><strong>{userLabel}</strong><small>Profilo</small></span>
        </button>
        <button className="ghost-button user-button" onClick={onSignOut} type="button" title={userEmail}>
          <LogOut aria-hidden="true" size={17} /><span>Esci</span>
        </button>
        <button className="primary-button" onClick={onNewAppointment} type="button">
          <Plus aria-hidden="true" size={18} /><span>Nuovo lavoro</span>
        </button>
      </div>
    </header>
  );
}

function ProfileModal({ currentName, email, isOpen, onClose, onSave }) {
  const [displayName, setDisplayName] = useState(currentName || "");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentName || "");
      setErrorMessage("");
    }
  }, [currentName, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    try {
      await onSave(displayName);
      onClose();
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a salvare il nome.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="appointment-modal profile-modal" aria-labelledby="profile-title" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Profilo</p>
            <h2 id="profile-title">Nome visualizzato</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Chiudi">
            x
          </button>
        </div>

        <form className="appointment-form" onSubmit={handleSubmit}>
          <label>
            <span>Email account</span>
            <input disabled value={email || ""} />
          </label>
          <label>
            <span>Nome visualizzato nel CRM</span>
            <input
              autoComplete="name"
              maxLength="80"
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Es. Flaviano Gei"
              required
              value={displayName}
            />
          </label>
          {errorMessage && <p className="form-error">{errorMessage}</p>}
          <div className="modal-actions">
            <button className="ghost-button" onClick={onClose} type="button">
              Annulla
            </button>
            <button className="primary-button" disabled={isSaving} type="submit">
              {isSaving ? "Salvataggio" : "Salva nome"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CalendarPanel({
  appointments,
  currentDate,
  events,
  onEditAppointment,
  onMonthChange,
  onNewAppointment,
  onSelectAppointment,
  selectedAppointment,
  selectedAppointmentId,
  searchQuery = "",
  teamMembers = [],
  todayKey,
  visibleMonth,
}) {
  const [appointmentTypeFilter, setAppointmentTypeFilter] = useState("tutti");
  const [appointmentAssigneeFilter, setAppointmentAssigneeFilter] = useState("tutti");
  const monthStart = useMemo(
    () => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1),
    [visibleMonth],
  );
  const monthLabel = formatMonthYear(monthStart);
  const focusDateLabel = formatLongDate(currentDate);
  const selectedAppointmentDateLabel = selectedAppointment ? formatLongDate(fromDateKey(selectedAppointment.date)) : "";
  const filterAppointment = (appointment) =>
    (appointmentTypeFilter === "tutti" || appointment.type === appointmentTypeFilter) &&
    (appointmentAssigneeFilter === "tutti" || appointment.assignedUsers?.some((user) => user.userId === appointmentAssigneeFilter)) &&
    matchesSearch(searchQuery, [
      appointment.title || appointment.label,
      appointment.detail,
      appointment.related,
      assignmentSummary(appointment.assignedUsers),
    ]);
  const filteredAppointments = appointments.filter(filterAppointment);
  const filteredEvents = events.filter(filterAppointment);
  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const mondayOffset = (monthStart.getDay() + 6) % 7;
    const days = Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), index + 1);
      return {
        date,
        dateKey: toDateKey(date),
        day: index + 1,
      };
    });
    const cells = [...Array.from({ length: mondayOffset }, () => null), ...days];
    const trailingCells = (7 - (cells.length % 7)) % 7;
    return [...cells, ...Array.from({ length: trailingCells }, () => null)];
  }, [monthStart]);
  const eventsByDate = useMemo(
    () =>
      filteredEvents.reduce((days, event) => {
        const dateKey = event.date || (event.day ? toDateKey(new Date(monthStart.getFullYear(), monthStart.getMonth(), event.day)) : "");
        if (!dateKey) {
          return days;
        }

        days[dateKey] = [...(days[dateKey] || []), event];
        return days;
      }, {}),
    [filteredEvents, monthStart],
  );
  const changeMonth = (offset) => {
    onMonthChange(new Date(monthStart.getFullYear(), monthStart.getMonth() + offset, 1));
  };

  return (
    <section className="panel calendar-panel" aria-label="Calendario operativo">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Agenda lavori</p>
          <h2>{monthLabel}</h2>
        </div>
        <div className="calendar-actions">
          <div className="calendar-nav" aria-label="Navigazione calendario">
            <button className="icon-button calendar-nav-button" onClick={() => changeMonth(-1)} type="button" aria-label="Mese precedente">
              ‹
            </button>
            <button
              className="ghost-button"
              onClick={() => onMonthChange(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))}
              type="button"
            >
              Oggi
            </button>
            <button className="icon-button calendar-nav-button" onClick={() => changeMonth(1)} type="button" aria-label="Mese successivo">
              ›
            </button>
          </div>
          <button className="ghost-button" type="button">
            Mese
          </button>
          <button className="primary-button" onClick={onNewAppointment} type="button">
            Nuovo appuntamento
          </button>
        </div>
      </div>

      <div className="filter-strip" aria-label="Filtri agenda">
        <span className="filter-count">{filteredEvents.length} risultati nel calendario</span>
        <label className="filter-field">
          <span>Tipo</span>
          <select onChange={(event) => setAppointmentTypeFilter(event.target.value)} value={appointmentTypeFilter}>
            <option value="tutti">Tutti i tipi</option>
            {appointmentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Assegnato a</span>
          <select onChange={(event) => setAppointmentAssigneeFilter(event.target.value)} value={appointmentAssigneeFilter}>
            <option value="tutti">Tutto il team</option>
            {teamMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
        </label>
        {(appointmentTypeFilter !== "tutti" || appointmentAssigneeFilter !== "tutti") && (
          <button className="filter-reset" onClick={() => { setAppointmentTypeFilter("tutti"); setAppointmentAssigneeFilter("tutti"); }} type="button">
            Azzera filtri
          </button>
        )}
      </div>

      <div className="calendar-layout">
        <div className="calendar-board" aria-label={`Mese di ${monthLabel}`}>
          {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((day) => (
            <div className="weekday" key={day}>
              {day}
            </div>
          ))}

          {calendarCells.map((cell, index) => {
            if (!cell) {
              return <article className="calendar-day muted-day empty-calendar-cell" key={`empty-${index}`} />;
            }

            return (
              <article
                className={`calendar-day ${cell.dateKey === todayKey ? "today" : ""}`}
                key={cell.dateKey}
              >
                <time dateTime={cell.dateKey}>{cell.day}</time>
                {(eventsByDate[cell.dateKey] || []).map((event) => (
                  <button
                    className={`event-pill ${event.type} ${selectedAppointmentId === event.id ? "selected" : ""}`}
                    key={event.id || `${event.type}-${event.label}`}
                    onClick={() => onSelectAppointment(event.id)}
                    type="button"
                  >
                    {event.label}
                  </button>
                ))}
              </article>
            );
          })}
        </div>

        <aside className="today-focus" aria-label="Dettaglio appuntamento">
          {selectedAppointment ? (
            <div className="appointment-detail">
              <p className="eyebrow">{appointmentTypeLabel(selectedAppointment.type)}</p>
              <h2>{selectedAppointment.title}</h2>
              <div className="detail-meta">
                <span>{selectedAppointmentDateLabel}</span>
                <strong>{selectedAppointment.time}</strong>
              </div>
              {selectedAppointment.related && (
                <div className="detail-block">
                  <span>Cliente o progetto</span>
                  <strong>{selectedAppointment.related}</strong>
                </div>
              )}
              <div className="detail-block">
                <span>Descrizione</span>
                <p>{selectedAppointment.detail}</p>
              </div>
              <div className="detail-block">
                <span>Assegnato a</span>
                <strong>{assignmentSummary(selectedAppointment.assignedUsers)}</strong>
              </div>
              <button className="primary-button full-width" onClick={() => onEditAppointment(selectedAppointment)} type="button">
                Modifica
              </button>
            </div>
          ) : (
            <>
          <p className="eyebrow">Focus di oggi</p>
          <h2>{focusDateLabel}</h2>
          <ol className="focus-list">
            {filteredAppointments.length ? (
              filteredAppointments.map((appointment) => (
                <li key={appointment.id || `${appointment.time}-${appointment.title}`}>
                  <button className="focus-item" onClick={() => onSelectAppointment(appointment.id)} type="button">
                    <time>{appointment.time}</time>
                    <div>
                      <strong>{appointment.title}</strong>
                      <span>{appointment.detail}</span>
                      <small>Assegnato a: {assignmentSummary(appointment.assignedUsers)}</small>
                    </div>
                  </button>
                </li>
              ))
            ) : (
              <li className="empty-list-item">
                <div>
                  <strong>Nessun appuntamento oggi</strong>
                  <span>Inserisci il primo appuntamento reale dal pulsante “Nuovo appuntamento”.</span>
                </div>
              </li>
            )}
          </ol>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

function StatsGrid({ appointments, crmState }) {
  const events = crmState.calendarEvents;
  const visitAppointments = appointments.filter((item) => item.type === "visit").length;
  const otherAppointments = appointments.length - visitAppointments;
  const projectEvents = events.filter((event) => event.type === "project").length;
  const quoteEvents = events.filter((event) => event.type === "quote").length;
  const activeSites =
    crmState.projects.length + crmState.customers.filter((customer) => customer.status === "Cantiere attivo").length;
  const dynamicStats = [
    {
      label: "Appuntamenti oggi",
      value: appointments.length,
      note: `${visitAppointments} sopralluoghi, ${otherAppointments} follow-up/attività`,
    },
    { label: "Progetti da seguire", value: projectEvents, note: "Inserisci appuntamenti o cantieri reali" },
    { label: "Preventivi in attesa", value: quoteEvents, note: "Valori collegati ai dati inseriti" },
    { label: "Cantieri attivi", value: activeSites, note: "Clienti o progetti in stato cantiere" },
  ];

  return (
    <section className="quick-stats compact-stats" aria-label="Indicatori principali">
      {dynamicStats.map((stat) => (
        <article className="stat-card" key={stat.label}>
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
          <small>{stat.note}</small>
        </article>
      ))}
    </section>
  );
}

function PipelinePanel({ pipelineItems }) {
  const [filter, setFilter] = useState("Tutte");

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h2>Opportunità di lavoro</h2>
        </div>
        <div className="segmented-control" role="tablist" aria-label="Filtro opportunità">
          {["Tutte", "Calde", "Da richiamare"].map((option) => (
            <button
              className={filter === option ? "selected" : ""}
              key={option}
              onClick={() => setFilter(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="pipeline" aria-label="Fasi commerciali">
        {pipelineItems.length ? (
          pipelineItems.map((column) => (
            <article className="pipeline-column" key={column.stage}>
              <header>
                <span>{column.stage}</span>
                <strong>{column.count}</strong>
              </header>
              {column.deals.map((deal) => (
                <div className={`deal-card ${deal.tone || ""}`} key={deal.title}>
                  <strong>{deal.title}</strong>
                  <span>{deal.subtitle}</span>
                  <small>{deal.note}</small>
                </div>
              ))}
            </article>
          ))
        ) : (
          <div className="empty-state wide-empty">
            <strong>Nessuna opportunità inserita</strong>
            <span>Quando creeremo il modulo opportunità, qui compariranno richieste, sopralluoghi e preventivi.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function ProjectsPanel({ projectItems }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Cantieri</p>
          <h2>Avanzamento lavori</h2>
        </div>
        <button className="ghost-button" type="button">
          Vedi tutti
        </button>
      </div>

      <div className="project-list">
        {projectItems.length ? (
          projectItems.map((project) => (
            <article className="project-row" key={project.name}>
              <div>
                <strong>{project.name}</strong>
                <span>{project.work}</span>
              </div>
              <div className="progress-wrap" aria-label={`Avanzamento ${project.progress} percento`}>
                <span style={{ width: `${project.progress}%` }}></span>
              </div>
              <small>{project.progress}%</small>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <strong>Nessun cantiere inserito</strong>
            <span>Imposta un cliente su “Cantiere attivo” o aggiungi il modulo cantieri nel prossimo step.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function SideColumn({ appointments, taskItems }) {
  return (
    <aside className="side-column" aria-label="Attività e agenda">
      <section className="panel compact-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Oggi</p>
            <h2>Agenda</h2>
          </div>
        </div>
        <ol className="timeline">
          {appointments.length ? (
            appointments.map((appointment) => (
              <li key={appointment.id || `${appointment.time}-${appointment.title}`}>
                <time>{appointment.time}</time>
                <div>
                  <strong>{appointment.title}</strong>
                  <span>{appointment.detail}</span>
                  <small>Assegnato a: {assignmentSummary(appointment.assignedUsers)}</small>
                </div>
              </li>
            ))
          ) : (
            <li className="empty-list-item">
              <div>
                <strong>Nessun appuntamento oggi</strong>
                <span>Usa “Nuovo appuntamento” per inserire attività reali.</span>
              </div>
            </li>
          )}
        </ol>
      </section>

      <section className="panel compact-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Priorità</p>
            <h2>Da fare</h2>
          </div>
        </div>
        <div className="task-list">
          {taskItems.length ? (
            taskItems.map((task) => (
              <label key={task.label}>
                <input type="checkbox" defaultChecked={task.done} />
                <span>{task.label}</span>
              </label>
            ))
          ) : (
            <div className="empty-state compact-empty">
              <strong>Nessuna attività</strong>
              <span>Le attività operative saranno collegate ai clienti reali.</span>
            </div>
          )}
        </div>
      </section>

      <section className="panel compact-panel highlight-panel">
        <p className="eyebrow">Suggerimento</p>
        <h2>Inserisci i primi dati reali</h2>
        <p>Parti da una nuova anagrafica cliente e collega appuntamenti, sopralluoghi e preventivi.</p>
        <button className="primary-button full-width" type="button">
          Crea promemoria
        </button>
      </section>
    </aside>
  );
}

function DashboardView({
  appointments,
  crmState,
  currentDate,
  onEditAppointment,
  onMonthChange,
  onNewAppointment,
  onSelectAppointment,
  selectedAppointment,
  selectedAppointmentId,
  searchQuery = "",
  todayKey,
  visibleMonth,
}) {
  return (
    <>
      <CalendarPanel
        appointments={appointments}
        currentDate={currentDate}
        events={crmState.calendarEvents}
        onEditAppointment={onEditAppointment}
        onMonthChange={onMonthChange}
        onNewAppointment={onNewAppointment}
        onSelectAppointment={onSelectAppointment}
        selectedAppointment={selectedAppointment}
        selectedAppointmentId={selectedAppointmentId}
        searchQuery={searchQuery}
        teamMembers={crmState.teamMembers}
        todayKey={todayKey}
        visibleMonth={visibleMonth}
      />
      <StatsGrid appointments={appointments} crmState={crmState} />
      <section className="content-grid">
        <div className="main-column">
          <PipelinePanel pipelineItems={crmState.pipeline} />
          <ProjectsPanel projectItems={crmState.projects} />
        </div>
        <SideColumn appointments={appointments} taskItems={crmState.tasks} />
      </section>
    </>
  );
}

function OpportunitiesPage({
  actionError,
  customers,
  onCreateOpportunity,
  onCreateStep,
  onUpdateOpportunity,
  onUpdateOpportunityStage,
  onUpdateStep,
  opportunities,
  searchQuery = "",
  teamMembers = [],
}) {
  const [filter, setFilter] = useState("aperte");
  const [opportunityPriorityFilter, setOpportunityPriorityFilter] = useState("tutte");
  const [opportunityDecisionFilter, setOpportunityDecisionFilter] = useState("tutte");
  const [opportunityAssigneeFilter, setOpportunityAssigneeFilter] = useState("tutti");
  const [draggedOpportunityId, setDraggedOpportunityId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [movingOpportunityId, setMovingOpportunityId] = useState(null);
  const [editingOpportunity, setEditingOpportunity] = useState(null);
  const [isOpportunityModalOpen, setIsOpportunityModalOpen] = useState(false);
  const [stepModalState, setStepModalState] = useState({ isOpen: false, mode: "create", opportunity: null, step: null });
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(opportunities[0]?.id);
  const visibleOpportunities = useMemo(() => {
    let filtered = opportunities;

    if (filter === "calde") filtered = filtered.filter((opportunity) => opportunity.priority === "alta");
    if (filter === "chiuse") filtered = filtered.filter((opportunity) => closedOpportunityStatuses.includes(opportunity.status));
    if (filter === "aperte") filtered = filtered.filter((opportunity) => !closedOpportunityStatuses.includes(opportunity.status));

    return filtered.filter((opportunity) =>
      (opportunityPriorityFilter === "tutte" || opportunity.priority === opportunityPriorityFilter) &&
      (opportunityDecisionFilter === "tutte" || opportunity.bidDecision === opportunityDecisionFilter) &&
      (opportunityAssigneeFilter === "tutti" || opportunity.assignedUsers.some((user) => user.userId === opportunityAssigneeFilter)) &&
      matchesSearch(searchQuery, [
        opportunity.title,
        opportunity.customerName,
        opportunity.description,
        opportunity.nextAction,
        opportunity.source,
        assignmentSummary(opportunity.assignedUsers),
      ]),
    );
  }, [filter, opportunities, opportunityAssigneeFilter, opportunityDecisionFilter, opportunityPriorityFilter, searchQuery]);
  const opportunitiesByStage = useMemo(
    () =>
      opportunityPipelineStages.reduce((groups, stage) => {
        groups[stage.value] = visibleOpportunities.filter((opportunity) => opportunity.status === stage.value);
        return groups;
      }, {}),
    [visibleOpportunities],
  );
  const selectedOpportunity =
    visibleOpportunities.find((opportunity) => opportunity.id === selectedOpportunityId) || visibleOpportunities[0];
  const openOpportunities = opportunities.filter((opportunity) => !closedOpportunityStatuses.includes(opportunity.status)).length;
  const hotOpportunities = opportunities.filter((opportunity) => opportunity.priority === "alta").length;
  const estimatedTotal = opportunities.reduce((total, opportunity) => total + opportunity.estimatedValueNumber, 0);
  const weightedTotal = opportunities.reduce(
    (total, opportunity) => total + opportunity.estimatedValueNumber * (opportunity.probability / 100),
    0,
  );
  const currentStageIndex = opportunityStageIndex(selectedOpportunity?.status);
  const previousStage = opportunityPipelineStages[currentStageIndex - 1];
  const nextStage = opportunityPipelineStages[currentStageIndex + 1];

  useEffect(() => {
    if (!selectedOpportunity && opportunities[0]) {
      setSelectedOpportunityId(opportunities[0].id);
    }
  }, [opportunities, selectedOpportunity]);

  const openCreateStep = () => {
    if (!selectedOpportunity) {
      return;
    }

    setStepModalState({ isOpen: true, mode: "create", opportunity: selectedOpportunity, step: null });
  };

  const openEditStep = (step) => {
    setStepModalState({ isOpen: true, mode: "edit", opportunity: selectedOpportunity, step });
  };

  const closeStepModal = () => {
    setStepModalState({ isOpen: false, mode: "create", opportunity: null, step: null });
  };

  const handleSaveOpportunity = async (opportunity) => {
    const savedOpportunity = opportunity.id
      ? await onUpdateOpportunity(opportunity)
      : await onCreateOpportunity(opportunity);
    setSelectedOpportunityId(savedOpportunity.id);
    setIsOpportunityModalOpen(false);
    setEditingOpportunity(null);
  };

  const handleSaveStep = async (step) => {
    if (step.id) {
      await onUpdateStep(step);
    } else {
      await onCreateStep(step);
    }

    closeStepModal();
  };

  const handleMoveOpportunity = async (status) => {
    if (!selectedOpportunity || selectedOpportunity.status === status) {
      return;
    }

    setMovingOpportunityId(selectedOpportunity.id);
    try {
      await onUpdateOpportunityStage(selectedOpportunity.id, status);
    } finally {
      setMovingOpportunityId(null);
    }
  };

  const handleDrop = async (event, status) => {
    event.preventDefault();
    const opportunityId = draggedOpportunityId || event.dataTransfer.getData("text/plain");
    const opportunity = opportunities.find((item) => item.id === opportunityId);
    setDraggedOpportunityId(null);
    setDragOverStage(null);

    if (!opportunity || opportunity.status === status) return;
    setSelectedOpportunityId(opportunity.id);
    setMovingOpportunityId(opportunity.id);
    try {
      await onUpdateOpportunityStage(opportunity.id, status);
    } finally {
      setMovingOpportunityId(null);
    }
  };

  return (
    <section className="opportunities-page">
      <section className="quick-stats compact-stats" aria-label="Indicatori opportunità">
        <article className="stat-card">
          <span>Opportunità aperte</span>
          <strong>{openOpportunities}</strong>
          <small>Richieste da seguire</small>
        </article>
        <article className="stat-card">
          <span>Calde</span>
          <strong>{hotOpportunities}</strong>
          <small>Priorità alta</small>
        </article>
        <article className="stat-card">
          <span>Valore stimato</span>
          <strong>{formatCurrency(estimatedTotal)}</strong>
          <small>Somma opportunità inserite</small>
        </article>
        <article className="stat-card">
          <span>Previsione ponderata</span>
          <strong>{formatCurrency(weightedTotal)}</strong>
          <small>Valore × probabilità</small>
        </article>
      </section>

      <section className="opportunities-toolbar panel compact-panel">
        <div>
          <p className="eyebrow">Pipeline lavori</p>
          <h2>Opportunità</h2>
          <p className="toolbar-support">Trascina una scheda per aggiornarne la fase.</p>
        </div>
        <div className="opportunities-toolbar-actions">
          <div className="segmented-control opportunity-filters" role="tablist" aria-label="Filtro opportunità">
            {[
              ["aperte", "Aperte"],
              ["calde", "Calde"],
              ["chiuse", "Chiuse"],
              ["tutte", "Tutte"],
            ].map(([value, label]) => (
              <button className={filter === value ? "selected" : ""} key={value} onClick={() => setFilter(value)} type="button">
                {label}
              </button>
            ))}
          </div>
          <button className="primary-button" onClick={() => { setEditingOpportunity(null); setIsOpportunityModalOpen(true); }} type="button">
            Nuova opportunità
          </button>
        </div>
      </section>

      <div className="filter-strip opportunity-filter-strip" aria-label="Filtri opportunità">
        <span className="filter-count">{visibleOpportunities.length} di {opportunities.length} opportunità</span>
        <label className="filter-field">
          <span>Priorità</span>
          <select onChange={(event) => setOpportunityPriorityFilter(event.target.value)} value={opportunityPriorityFilter}>
            <option value="tutte">Tutte</option>
            {opportunityPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Decisione</span>
          <select onChange={(event) => setOpportunityDecisionFilter(event.target.value)} value={opportunityDecisionFilter}>
            <option value="tutte">Tutte</option>
            {Object.entries(bidDecisionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Responsabile</span>
          <select onChange={(event) => setOpportunityAssigneeFilter(event.target.value)} value={opportunityAssigneeFilter}>
            <option value="tutti">Tutto il team</option>
            {teamMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
        </label>
        {(opportunityPriorityFilter !== "tutte" || opportunityDecisionFilter !== "tutte" || opportunityAssigneeFilter !== "tutti") && (
          <button className="filter-reset" onClick={() => { setOpportunityPriorityFilter("tutte"); setOpportunityDecisionFilter("tutte"); setOpportunityAssigneeFilter("tutti"); }} type="button">Azzera</button>
        )}
      </div>

      {actionError && <p className="form-error workspace-error">{actionError}</p>}

      <section className="opportunities-workspace">
        <div className="opportunity-kanban" aria-label="Pipeline opportunità">
          {opportunityPipelineStages.map((stage) => {
            const stageOpportunities = opportunitiesByStage[stage.value] || [];
            return (
              <section
                className={`opportunity-stage stage-${stage.tone} ${dragOverStage === stage.value ? "drag-over" : ""}`}
                key={stage.value}
                aria-label={stage.label}
                onDragEnter={() => setDragOverStage(stage.value)}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setDragOverStage(null);
                }}
                onDrop={(event) => handleDrop(event, stage.value)}
              >
                <header>
                  <span><i aria-hidden="true" />{stage.label}</span>
                  <strong>{stageOpportunities.length}</strong>
                </header>
                <div className="opportunity-stage-list">
                  {stageOpportunities.length ? (
                    stageOpportunities.map((opportunity) => {
                      const nextActivity = opportunity.steps.find((step) => step.status !== "completato") || opportunity.steps.at(-1);
                      return (
                        <button
                          aria-grabbed={draggedOpportunityId === opportunity.id}
                          className={`opportunity-card ${selectedOpportunity?.id === opportunity.id ? "selected" : ""} ${movingOpportunityId === opportunity.id ? "moving" : ""}`}
                          draggable
                          key={opportunity.id}
                          onClick={() => setSelectedOpportunityId(opportunity.id)}
                          onDragEnd={() => {
                            setDraggedOpportunityId(null);
                            setDragOverStage(null);
                          }}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", opportunity.id);
                            setDraggedOpportunityId(opportunity.id);
                            setSelectedOpportunityId(opportunity.id);
                          }}
                          type="button"
                        >
                          <div className="opportunity-card-heading">
                            <strong>{opportunity.title}</strong>
                            <span>{opportunity.customerName}</span>
                          </div>
                          <div className="next-action">
                            <span>Prossima azione</span>
                            <strong>{opportunity.nextAction || nextActivity?.title || "Da definire"}</strong>
                          </div>
                          <footer>
                            <div className="assignee-stack" aria-label={assignmentSummary(opportunity.assignedUsers)}>
                              {opportunity.assignedUsers.slice(0, 3).map((user) => (
                                <span key={user.userId || user.userName} title={user.userName}>{userInitials(user.userName)}</span>
                              ))}
                              {!opportunity.assignedUsers.length && <span title="Non assegnato">?</span>}
                            </div>
                            <span className={`due-date due-${dueDateTone(opportunity.dueDate)}`}>{opportunity.dueDateLabel}</span>
                          </footer>
                          <div className="card-value-row">
                            <span className={`priority-dot priority-${opportunity.priority}`}>{opportunity.priority}</span>
                            <span className="probability-label">{opportunity.probability}%</span>
                            <strong>{opportunity.estimatedValue}</strong>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="empty-stage">Nessuna opportunità</div>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="panel opportunity-detail-panel" aria-label="Dettaglio opportunità">
          {selectedOpportunity ? (
            <>
              <div className="opportunity-detail-header">
                <div>
                  <p className="eyebrow">{selectedOpportunity.customerName}</p>
                  <h2>{selectedOpportunity.title}</h2>
                </div>
                <div className="detail-header-actions">
                  <span className={`decision-badge decision-${selectedOpportunity.bidDecision}`}>
                    {bidDecisionLabels[selectedOpportunity.bidDecision]}
                  </span>
                  <button className="ghost-button compact-button" onClick={() => { setEditingOpportunity(selectedOpportunity); setIsOpportunityModalOpen(true); }} type="button">
                    Modifica
                  </button>
                </div>
              </div>

              <div className="pipeline-progress" aria-label={`Fase ${currentStageIndex + 1} di ${opportunityPipelineStages.length}`}>
                {opportunityPipelineStages.map((stage, index) => (
                  <button
                    aria-label={stage.label}
                    className={index < currentStageIndex ? "complete" : index === currentStageIndex ? "current" : ""}
                    key={stage.value}
                    onClick={() => handleMoveOpportunity(stage.value)}
                    title={stage.label}
                    type="button"
                  />
                ))}
              </div>

              <div className="stage-control">
                <label>
                  <span>Fase pipeline</span>
                  <select disabled={movingOpportunityId === selectedOpportunity.id} value={selectedOpportunity.status} onChange={(event) => handleMoveOpportunity(event.target.value)}>
                    {opportunityPipelineStages.map((stage) => (
                      <option key={stage.value} value={stage.value}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="stage-buttons">
                  <button className="ghost-button" disabled={!previousStage || movingOpportunityId === selectedOpportunity.id} onClick={() => previousStage && handleMoveOpportunity(previousStage.value)} type="button">
                    Indietro
                  </button>
                  <button className="primary-button" disabled={!nextStage || movingOpportunityId === selectedOpportunity.id} onClick={() => nextStage && handleMoveOpportunity(nextStage.value)} type="button">
                    Avanti
                  </button>
                </div>
              </div>

              <section className="commercial-health" aria-label="Valutazione commerciale">
                <div className="commercial-health-heading">
                  <div>
                    <span>Probabilità di acquisizione</span>
                    <strong>{selectedOpportunity.probability}%</strong>
                  </div>
                  <div className="probability-track" aria-hidden="true">
                    <span style={{ width: `${selectedOpportunity.probability}%` }} />
                  </div>
                </div>
                <div className="commercial-metrics">
                  <div>
                    <span>Valore offerta</span>
                    <strong>{selectedOpportunity.estimatedValue}</strong>
                  </div>
                  <div>
                    <span>Costo stimato</span>
                    <strong>{selectedOpportunity.estimatedCost}</strong>
                  </div>
                  <div className={selectedOpportunity.marginNumber < 0 ? "negative" : "positive"}>
                    <span>Margine previsto</span>
                    <strong>{selectedOpportunity.margin}</strong>
                  </div>
                </div>
              </section>

              <div className="opportunity-summary-grid compact-summary">
                <div>
                  <span>Stato</span>
                  <strong>{opportunityStatusLabel(selectedOpportunity.status)}</strong>
                </div>
                <div>
                  <span>Decisione</span>
                  <strong>{bidDecisionLabels[selectedOpportunity.bidDecision]}</strong>
                </div>
                <div>
                  <span>Scadenza</span>
                  <strong>{selectedOpportunity.dueDateLabel}</strong>
                </div>
                <div>
                  <span>Assegnato a</span>
                  <strong>{assignmentSummary(selectedOpportunity.assignedUsers)}</strong>
                </div>
              </div>

              {selectedOpportunity.description && <p className="opportunity-description">{selectedOpportunity.description}</p>}
              {selectedOpportunity.lossReason && <p className="loss-reason"><strong>Motivazione:</strong> {selectedOpportunity.lossReason}</p>}

              <div className="activity-heading">
                <div>
                  <p className="eyebrow">Timeline</p>
                  <h3>Attività opportunità</h3>
                </div>
                <button className="primary-button" onClick={openCreateStep} type="button">
                  Nuova attività
                </button>
              </div>

              <ol className="opportunity-activity-list">
                {selectedOpportunity.steps.length ? (
                  selectedOpportunity.steps.map((step) => (
                    <li key={step.id}>
                      <button className={`activity-card ${step.status}`} onClick={() => openEditStep(step)} type="button">
                        <div>
                          <strong>{step.title}</strong>
                          <span>{step.detail || "Dettagli da aggiornare."}</span>
                          <small>{assignmentSummary(step.assignedUsers)} · ultimo aggiornamento: {step.updatedBy}</small>
                        </div>
                        <span>{stepStatuses[step.status]}</span>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="empty-list-item">
                    <div>
                      <strong>Nessuna attività</strong>
                      <span>Aggiungi il prossimo compito collegato a questa opportunità.</span>
                    </div>
                  </li>
                )}
              </ol>
            </>
          ) : (
            <div className="empty-state wide-empty">
              <strong>Nessuna opportunità inserita</strong>
              <span>Crea la prima opportunità commerciale collegata a un cliente.</span>
            </div>
          )}
        </aside>
      </section>
      {false && (
      <section className="opportunities-layout">
        <div className="panel opportunities-list-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Pipeline</p>
              <h2>Opportunità</h2>
            </div>
            <button className="primary-button" onClick={() => setIsOpportunityModalOpen(true)} type="button">
              Nuova opportunità
            </button>
          </div>
          <div className="segmented-control opportunity-filters" role="tablist" aria-label="Filtro opportunità">
            {[
              ["aperte", "Aperte"],
              ["calde", "Calde"],
              ["chiuse", "Chiuse"],
              ["tutte", "Tutte"],
            ].map(([value, label]) => (
              <button className={filter === value ? "selected" : ""} key={value} onClick={() => setFilter(value)} type="button">
                {label}
              </button>
            ))}
          </div>
          {actionError && <p className="form-error">{actionError}</p>}

          <div className="opportunity-list" role="list">
            {filteredOpportunities.length ? (
              filteredOpportunities.map((opportunity) => {
                const lastStep = opportunity.steps.at(-1);
                const displayStatus = opportunityStatusValue(opportunity);
                return (
                  <button
                    className={`opportunity-row ${selectedOpportunity?.id === opportunity.id ? "selected" : ""}`}
                    key={opportunity.id}
                    onClick={() => setSelectedOpportunityId(opportunity.id)}
                    type="button"
                  >
                    <div>
                      <strong>{opportunity.title}</strong>
                      <span>{opportunity.customerName}</span>
                      <small>{lastStep ? lastStep.title : "Nessun passaggio ancora creato"}</small>
                    </div>
                    <span className={`status-badge priority-${opportunity.priority}`}>
                      {opportunityStatuses[displayStatus] || displayStatus}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="empty-state">
                <strong>Nessuna opportunità in questo filtro</strong>
                <span>Inserisci una nuova richiesta e collegala al cliente corretto.</span>
              </div>
            )}
          </div>
        </div>

        <article className="panel opportunity-detail-panel">
          {selectedOpportunity ? (
            <>
              <div className="opportunity-detail-header">
                <div>
                  <p className="eyebrow">{selectedOpportunity.customerName}</p>
                  <h2>{selectedOpportunity.title}</h2>
                </div>
                <button className="primary-button" onClick={openCreateStep} type="button">
                  Nuovo passaggio
                </button>
              </div>

              <div className="opportunity-summary-grid">
                <div>
                  <span>Stato</span>
                  <strong>{opportunityStatuses[opportunityStatusValue(selectedOpportunity)] || opportunityStatusValue(selectedOpportunity)}</strong>
                </div>
                <div>
                  <span>Priorità</span>
                  <strong>{selectedOpportunity.priority}</strong>
                </div>
                <div>
                  <span>Valore stimato</span>
                  <strong>{selectedOpportunity.estimatedValue}</strong>
                </div>
                <div>
                  <span>Scadenza</span>
                  <strong>{selectedOpportunity.dueDateLabel}</strong>
                </div>
                <div>
                  <span>Assegnato a</span>
                  <strong>{assignmentSummary(selectedOpportunity.assignedUsers)}</strong>
                </div>
                <div>
                  <span>Prossima azione</span>
                  <strong>{selectedOpportunity.nextAction || "Da definire"}</strong>
                </div>
              </div>

              {selectedOpportunity.description && <p className="opportunity-description">{selectedOpportunity.description}</p>}

              <div className="opportunity-map" aria-label="Mappa passaggi opportunità">
                {selectedOpportunity.steps.length ? (
                  selectedOpportunity.steps.map((step, index) => (
                    <button className={`opportunity-step-card ${step.status}`} key={step.id} onClick={() => openEditStep(step)} type="button">
                      <span className="step-number">{index + 1}</span>
                      <strong>{step.title}</strong>
                      <p>{step.detail || "Dettagli da aggiornare."}</p>
                      <small>{stepStatuses[step.status]} · {assignmentSummary(step.assignedUsers)}</small>
                    </button>
                  ))
                ) : (
                  <div className="empty-state wide-empty">
                    <strong>Nessun passaggio creato</strong>
                    <span>Aggiungi il primo riquadro operativo per iniziare la mappa.</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state wide-empty">
              <strong>Nessuna opportunità inserita</strong>
              <span>Crea la prima opportunità commerciale collegata a un cliente.</span>
            </div>
          )}
        </article>
      </section>

      )}
      <OpportunityModal
        customers={customers}
        isOpen={isOpportunityModalOpen}
        onClose={() => { setIsOpportunityModalOpen(false); setEditingOpportunity(null); }}
        onSave={handleSaveOpportunity}
        opportunity={editingOpportunity}
        teamMembers={teamMembers}
      />
      <OpportunityStepModal
        isOpen={stepModalState.isOpen}
        mode={stepModalState.mode}
        onClose={closeStepModal}
        onSave={handleSaveStep}
        opportunity={stepModalState.opportunity}
        step={stepModalState.step}
        teamMembers={teamMembers}
      />
    </section>
  );
}

function OpportunityModal({ customers, isOpen, onClose, onSave, opportunity, teamMembers = [] }) {
  const [formData, setFormData] = useState({
    assignedUserIds: [],
    bidDecision: "da_valutare",
    customerId: "",
    description: "",
    dueDate: "",
    estimatedCost: "",
    estimatedValue: "",
    firstStepAssignedUserIds: [],
    firstStepDetail: "",
    firstStepTitle: "Opportunità ricevuta",
    lossReason: "",
    nextAction: "",
    priority: "media",
    probability: "20",
    source: "Lead",
    title: "",
    type: "Computo metrico",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      setFormData({
        assignedUserIds: opportunity?.assignedUsers?.map((user) => user.userId) || [],
        bidDecision: opportunity?.bidDecision || "da_valutare",
        customerId: opportunity?.customerId || customers[0]?.id || "",
        description: opportunity?.description || "",
        dueDate: opportunity?.dueDate || "",
        estimatedCost: opportunity?.estimatedCostNumber ? String(opportunity.estimatedCostNumber) : "",
        estimatedValue: opportunity?.estimatedValueNumber ? String(opportunity.estimatedValueNumber) : "",
        firstStepAssignedUserIds: [],
        firstStepDetail: "",
        firstStepTitle: "Opportunità ricevuta",
        lossReason: opportunity?.lossReason || "",
        nextAction: opportunity?.nextAction || "",
        priority: opportunity?.priority || "media",
        probability: String(opportunity?.probability ?? 20),
        source: opportunity?.source || "Lead",
        title: opportunity?.title || "",
        type: opportunity?.type || "Computo metrico",
      });
    }
  }, [customers, isOpen, opportunity]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      assignedUserIds: [],
      bidDecision: "da_valutare",
      customerId: customers[0]?.id || "",
      description: "",
      dueDate: "",
      estimatedCost: "",
      estimatedValue: "",
      firstStepAssignedUserIds: [],
      firstStepDetail: "",
      firstStepTitle: "Opportunità ricevuta",
      lossReason: "",
      nextAction: "",
      priority: "media",
      probability: "20",
      source: "Lead",
      title: "",
      type: "Computo metrico",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    const title = formData.title.trim();
    const firstStepTitle = formData.firstStepTitle.trim();

    if (!title || !firstStepTitle) {
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        assignedUserIds: formData.assignedUserIds,
        bidDecision: formData.bidDecision,
        customerId: formData.customerId,
        description: formData.description.trim(),
        dueDate: formData.dueDate,
        estimatedCost: formData.estimatedCost.trim(),
        estimatedValue: formData.estimatedValue.trim(),
        firstStep: {
          assignedUserIds: formData.firstStepAssignedUserIds,
          detail: formData.firstStepDetail.trim(),
          status: "da_fare",
          title: firstStepTitle,
        },
        id: opportunity?.id,
        lossReason: formData.lossReason.trim(),
        nextAction: formData.nextAction.trim(),
        priority: formData.priority,
        probability: formData.probability,
        source: formData.source,
        title,
        type: formData.type,
      });

      resetForm();
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a salvare l'opportunità.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="appointment-modal wide-modal" aria-labelledby="opportunity-title" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Opportunità</p>
            <h2 id="opportunity-title">{opportunity ? "Modifica opportunità" : "Nuova opportunità"}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Chiudi">
            x
          </button>
        </div>

        <form className="appointment-form" onSubmit={handleSubmit}>
          <label>
            <span>Titolo opportunità</span>
            <input
              name="title"
              onChange={handleChange}
              placeholder="Es. Computo metrico Condominio Verdi"
              required
              value={formData.title}
            />
          </label>

          <div className="form-grid">
            <label>
              <span>Cliente collegato</span>
              <select name="customerId" onChange={handleChange} value={formData.customerId}>
                <option value="">Nessun cliente</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Tipo richiesta</span>
              <select name="type" onChange={handleChange} value={formData.type}>
                {opportunityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span>Origine</span>
              <select name="source" onChange={handleChange} value={formData.source}>
                {opportunitySources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Priorità</span>
              <select name="priority" onChange={handleChange} value={formData.priority}>
                {opportunityPriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span>Valore offerta</span>
              <input name="estimatedValue" onChange={handleChange} placeholder="Es. 18000" value={formData.estimatedValue} />
            </label>
            <label>
              <span>Costo stimato</span>
              <input name="estimatedCost" onChange={handleChange} placeholder="Es. 12500" value={formData.estimatedCost} />
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span>Probabilità di acquisizione</span>
              <div className="probability-input">
                <input max="100" min="0" name="probability" onChange={handleChange} type="range" value={formData.probability} />
                <strong>{formData.probability}%</strong>
              </div>
            </label>
            <label>
              <span>Decisione commerciale</span>
              <select name="bidDecision" onChange={handleChange} value={formData.bidDecision}>
                {Object.entries(bidDecisionLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            <span>Scadenza</span>
            <input name="dueDate" onChange={handleChange} type="date" value={formData.dueDate} />
          </label>

          <label>
            <span>Descrizione richiesta</span>
            <textarea
              name="description"
              onChange={handleChange}
              placeholder="Cosa è arrivato dal cliente, documenti ricevuti, contesto del lavoro..."
              rows="3"
              value={formData.description}
            />
          </label>

          <label>
            <span>Prossima azione</span>
            <input name="nextAction" onChange={handleChange} placeholder="Es. Preparare bozza preventivo" value={formData.nextAction} />
          </label>

          {(formData.bidDecision === "non_procedere" || opportunity?.status === "persa") && (
            <label>
              <span>Motivazione mancata acquisizione</span>
              <textarea name="lossReason" onChange={handleChange} placeholder="Es. Margine insufficiente, tempi incompatibili, cliente non raggiungibile..." rows="2" value={formData.lossReason} />
            </label>
          )}

          <AssignmentSelector
            onChange={(assignedUserIds) => setFormData((current) => ({ ...current, assignedUserIds }))}
            selectedUserIds={formData.assignedUserIds}
            teamMembers={teamMembers}
          />

          {!opportunity && <div className="modal-subsection">
            <p className="eyebrow">Prima attività</p>
            <label>
              <span>Titolo attività</span>
              <input name="firstStepTitle" onChange={handleChange} required value={formData.firstStepTitle} />
            </label>
            <label>
              <span>Dettaglio attività</span>
              <textarea
                name="firstStepDetail"
                onChange={handleChange}
                placeholder="Es. Ricevuto computo metrico dall'amministratore, da analizzare."
                rows="3"
                value={formData.firstStepDetail}
              />
            </label>
            <AssignmentSelector
              onChange={(firstStepAssignedUserIds) => setFormData((current) => ({ ...current, firstStepAssignedUserIds }))}
              selectedUserIds={formData.firstStepAssignedUserIds}
              teamMembers={teamMembers}
            />
          </div>}

          <div className="modal-actions">
            <button className="ghost-button" onClick={onClose} type="button">
              Annulla
            </button>
            <button className="primary-button" disabled={isSaving} type="submit">
              {isSaving ? "Salvataggio" : opportunity ? "Salva modifiche" : "Crea opportunità"}
            </button>
          </div>
          {errorMessage && <p className="form-error">{errorMessage}</p>}
        </form>
      </section>
    </div>
  );
}

function OpportunityStepModal({ isOpen, mode, onClose, onSave, opportunity, step, teamMembers = [] }) {
  const [formData, setFormData] = useState({
    assignedUserIds: [],
    detail: "",
    status: "da_fare",
    title: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = mode === "edit";

  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      setFormData({
        assignedUserIds: step?.assignedUsers?.map((user) => user.userId) || [],
        detail: step?.detail || "",
        status: step?.status || "da_fare",
        title: step?.title || "",
      });
    }
  }, [isOpen, step]);

  if (!isOpen || !opportunity) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    const title = formData.title.trim();

    if (!title) {
      return;
    }

    setIsSaving(true);

    try {
      const lastStep = opportunity.steps.at(-1);
      await onSave({
        assignedUserIds: formData.assignedUserIds,
        detail: formData.detail.trim(),
        id: step?.id,
        opportunityId: opportunity.id,
        parentStepId: isEditing ? step.parentStepId : lastStep?.id || null,
        position: isEditing ? step.position : opportunity.steps.length + 1,
        status: formData.status,
        title,
      });
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a salvare l'attività.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="appointment-modal" aria-labelledby="step-title" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{opportunity.title}</p>
            <h2 id="step-title">{isEditing ? "Modifica attività" : "Nuova attività"}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Chiudi">
            x
          </button>
        </div>

        <form className="appointment-form" onSubmit={handleSubmit}>
          <label>
            <span>Titolo attività</span>
            <input name="title" onChange={handleChange} required value={formData.title} />
          </label>
          <label>
            <span>Stato</span>
            <select name="status" onChange={handleChange} value={formData.status}>
              {Object.entries(stepStatuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Descrizione aggiornamento</span>
            <textarea
              name="detail"
              onChange={handleChange}
              placeholder="Scrivi cosa è stato fatto o cosa va fatto nella prossima attività."
              rows="4"
              value={formData.detail}
            />
          </label>
          <AssignmentSelector
            onChange={(assignedUserIds) => setFormData((current) => ({ ...current, assignedUserIds }))}
            selectedUserIds={formData.assignedUserIds}
            teamMembers={teamMembers}
          />

          <div className="modal-actions">
            <button className="ghost-button" onClick={onClose} type="button">
              Annulla
            </button>
            <button className="primary-button" disabled={isSaving} type="submit">
              {isSaving ? "Salvataggio" : isEditing ? "Salva attività" : "Aggiungi attività"}
            </button>
          </div>
          {errorMessage && <p className="form-error">{errorMessage}</p>}
        </form>
      </section>
    </div>
  );
}

function PriceListPage({ onCreate, onDelete, onUpdate, priceList, searchQuery = "" }) {
  const blankItem = { active: true, category: "Generale", code: "", description: "", unit: "cad", unitPrice: 0 };
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("tutte");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const categories = [...new Set(priceList.map((item) => item.category))].sort();
  const visibleItems = priceList.filter((item) =>
    (categoryFilter === "tutte" || item.category === categoryFilter) &&
    matchesSearch(searchQuery, [item.code, item.description, item.category, item.unit]),
  );
  const averagePrice = priceList.length ? priceList.reduce((sum, item) => sum + item.unitPrice, 0) / priceList.length : 0;

  const openForm = (item = null) => {
    setEditingItem(item);
    setFormData(item ? { ...item } : { ...blankItem });
    setErrorMessage("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!formData.description.trim()) return setErrorMessage("Inserisci la descrizione della lavorazione.");
    setIsSaving(true); setErrorMessage("");
    try {
      if (editingItem) await onUpdate({ ...formData, id: editingItem.id });
      else await onCreate(formData);
      setEditingItem(null); setFormData(null);
    } catch (error) { setErrorMessage(error.message || "Non sono riuscito a salvare la voce."); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    setErrorMessage("");
    try { await onDelete(pendingDelete.id); setPendingDelete(null); }
    catch (error) { setErrorMessage(error.message || "Non sono riuscito a eliminare la voce."); }
  };

  return <section className="price-list-page">
    <section className="quick-stats compact-stats" aria-label="Indicatori prezzario">
      <article className="stat-card"><div className="stat-card-heading"><span>Voci disponibili</span><BookOpen size={19} /></div><strong>{priceList.length}</strong><small>Lavorazioni archiviate</small></article>
      <article className="stat-card"><div className="stat-card-heading"><span>Categorie</span><FileSpreadsheet size={19} /></div><strong>{categories.length}</strong><small>Gruppi merceologici</small></article>
      <article className="stat-card"><div className="stat-card-heading"><span>Prezzo medio</span><WalletCards size={19} /></div><strong>{formatCurrency(averagePrice)}</strong><small>Media costi unitari</small></article>
      <article className="stat-card"><div className="stat-card-heading"><span>Voci attive</span><UserCheck size={19} /></div><strong>{priceList.filter((item) => item.active).length}</strong><small>Utilizzabili nei preventivi</small></article>
    </section>
    <section className="panel price-list-panel">
      <div className="section-heading"><div><p className="eyebrow">Archivio aziendale</p><h2>Lavorazioni e prezzi</h2></div><button className="primary-button" onClick={() => openForm()} type="button"><Plus size={17} /> Nuova voce</button></div>
      <div className="price-list-toolbar"><label><SlidersHorizontal size={15} /><select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}><option value="tutte">Tutte le categorie</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><span>{visibleItems.length} risultati</span></div>
      {errorMessage && !formData && <p className="form-error">{errorMessage}</p>}
      <div className="price-list-table">
        <div className="price-list-head"><span>Codice</span><span>Descrizione</span><span>Categoria</span><span>U.M.</span><span>Prezzo</span><span></span></div>
        {visibleItems.length ? visibleItems.map((item) => <div className={`price-list-row ${!item.active ? "inactive" : ""}`} key={item.id}><strong>{item.code || "—"}</strong><div><strong>{item.description}</strong>{!item.active && <small>Non attiva</small>}</div><span>{item.category}</span><span>{item.unit}</span><strong>{formatCurrency(item.unitPrice)}</strong><div><button className="icon-button" aria-label="Modifica voce" onClick={() => openForm(item)} type="button"><Pencil size={15} /></button><button className="icon-button danger-button" aria-label="Elimina voce" onClick={() => setPendingDelete(item)} type="button"><Trash2 size={15} /></button></div></div>) : <div className="empty-state large-empty"><BookOpen size={32} /><strong>Nessuna voce nel prezzario</strong><span>Aggiungi la prima lavorazione con unità di misura e costo.</span></div>}
      </div>
    </section>
    {formData && <div className="modal-backdrop" role="presentation"><section className="appointment-modal price-item-modal" aria-modal="true" role="dialog"><div className="modal-heading"><div><p className="eyebrow">Prezzario</p><h2>{editingItem ? "Modifica lavorazione" : "Nuova lavorazione"}</h2></div><button className="icon-button" onClick={() => setFormData(null)} type="button"><X size={18} /></button></div><form className="appointment-form" onSubmit={handleSave}><div className="form-grid"><label><span>Codice</span><input onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="Es. FAC-001" value={formData.code} /></label><label><span>Categoria</span><input list="price-categories" onChange={(e) => setFormData({ ...formData, category: e.target.value })} value={formData.category} /><datalist id="price-categories">{categories.map((category) => <option key={category} value={category} />)}</datalist></label></div><label><span>Descrizione lavorazione</span><textarea onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows="4" value={formData.description} /></label><div className="form-grid"><label><span>Unità di misura</span><input onChange={(e) => setFormData({ ...formData, unit: e.target.value })} value={formData.unit} /></label><label><span>Prezzo unitario €</span><input min="0" onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })} step="0.01" type="number" value={formData.unitPrice} /></label></div><label className="price-active-toggle"><input checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} type="checkbox" /> Voce attiva nei preventivi</label>{errorMessage && <p className="form-error">{errorMessage}</p>}<div className="modal-actions"><button className="ghost-button" onClick={() => setFormData(null)} type="button">Annulla</button><button className="primary-button" disabled={isSaving} type="submit">{isSaving ? "Salvataggio..." : "Salva voce"}</button></div></form></section></div>}
    {pendingDelete && <div className="modal-backdrop" role="presentation"><section className="delete-confirm-modal" aria-modal="true" role="dialog"><div className="delete-confirm-icon"><Trash2 size={24} /></div><div><p className="eyebrow">Conferma eliminazione</p><h2>Eliminare questa voce?</h2><p><strong>{pendingDelete.description}</strong></p><span>I preventivi già salvati non verranno modificati.</span></div><div className="delete-confirm-actions"><button className="icon-label-button" onClick={() => setPendingDelete(null)} type="button">Annulla</button><button className="danger-confirm-button" onClick={handleDelete} type="button"><Trash2 size={16} /> Elimina definitivamente</button></div></section></div>}
  </section>;
}

const quoteStatusLabel = (status) => quoteStatuses.find((item) => item.value === status)?.label || status;

function QuotesPage({ customers, onCreateQuote, onDeleteQuote, onSavePriceItems, onUpdateQuote, opportunities, priceList, quotes, searchQuery = "" }) {
  const [selectedQuoteId, setSelectedQuoteId] = useState(quotes[0]?.id);
  const [editingQuote, setEditingQuote] = useState(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quotePendingDelete, setQuotePendingDelete] = useState(null);
  const [isDeletingQuote, setIsDeletingQuote] = useState(false);
  const [exportingQuoteId, setExportingQuoteId] = useState(null);
  const [deleteQuoteError, setDeleteQuoteError] = useState("");
  const [quoteExportError, setQuoteExportError] = useState("");
  const [statusFilter, setStatusFilter] = useState("tutti");
  const visibleQuotes = quotes.filter((quote) =>
    (statusFilter === "tutti" || quote.status === statusFilter) &&
    matchesSearch(searchQuery, [quote.quoteNumber, quote.subject, quote.customerName, quote.status]),
  );
  const selectedQuote = visibleQuotes.find((quote) => quote.id === selectedQuoteId) || visibleQuotes[0];
  const openTotal = quotes.filter((quote) => ["bozza", "inviato"].includes(quote.status)).reduce((sum, quote) => sum + quote.totalNumber, 0);
  const acceptedTotal = quotes.filter((quote) => quote.status === "accettato").reduce((sum, quote) => sum + quote.totalNumber, 0);
  const today = new Date().toISOString().slice(0, 10);
  const defaultQuoteNumber = `PREV-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(3, "0")}`;

  const handleSave = async (quote) => {
    const saved = quote.id ? await onUpdateQuote(quote) : await onCreateQuote(quote);
    setSelectedQuoteId(saved.id);
    setEditingQuote(null);
    setIsQuoteModalOpen(false);
  };

  const handleDelete = async () => {
    if (!quotePendingDelete) return;
    setIsDeletingQuote(true);
    setDeleteQuoteError("");
    try {
      await onDeleteQuote(quotePendingDelete.id);
      setSelectedQuoteId(null);
      setQuotePendingDelete(null);
    } catch (error) {
      setDeleteQuoteError(error.message || "Non sono riuscito a eliminare il preventivo.");
    } finally {
      setIsDeletingQuote(false);
    }
  };

  const handlePdfExport = async (quote) => {
    setExportingQuoteId(quote.id);
    setQuoteExportError("");
    try {
      const customer = customers.find((item) => item.id === quote.customerId);
      await downloadQuotePdf(quote, customer);
    } catch (error) {
      setQuoteExportError(error.message || "Non sono riuscito a generare il PDF.");
    } finally {
      setExportingQuoteId(null);
    }
  };

  return (
    <section className="quotes-page">
      <section className="quick-stats compact-stats" aria-label="Indicatori preventivi">
        <article className="stat-card"><div className="stat-card-heading"><span>Preventivi totali</span><FileText size={19} /></div><strong>{quotes.length}</strong><small>Documenti commerciali</small></article>
        <article className="stat-card"><div className="stat-card-heading"><span>In attesa</span><History size={19} /></div><strong>{quotes.filter((quote) => quote.status === "inviato").length}</strong><small>Inviati da seguire</small></article>
        <article className="stat-card"><div className="stat-card-heading"><span>Valore aperto</span><WalletCards size={19} /></div><strong>{formatCurrency(openTotal)}</strong><small>Bozze e inviati</small></article>
        <article className="stat-card"><div className="stat-card-heading"><span>Accettato</span><UserCheck size={19} /></div><strong>{formatCurrency(acceptedTotal)}</strong><small>Valore acquisito</small></article>
      </section>

      <section className="quotes-layout">
        <div className="panel quotes-list-panel">
          <div className="section-heading">
            <div><p className="eyebrow">Offerte</p><h2>Preventivi</h2></div>
            <button className="primary-button" onClick={() => { setEditingQuote(null); setIsQuoteModalOpen(true); }} type="button"><Plus size={17} /> Nuovo</button>
          </div>
          <label className="quote-status-filter"><SlidersHorizontal size={15} /><select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="tutti">Tutti gli stati</option>{quoteStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
          <div className="quotes-list">
            {visibleQuotes.length ? visibleQuotes.map((quote) => (
              <button className={`quote-row ${selectedQuote?.id === quote.id ? "selected" : ""}`} key={quote.id} onClick={() => setSelectedQuoteId(quote.id)} type="button">
                <span className="quote-row-icon"><FileText size={17} /></span>
                <div><small>{quote.quoteNumber}</small><strong>{quote.subject}</strong><span>{quote.customerName}</span></div>
                <div><span className={`quote-status status-${quote.status}`}>{quoteStatusLabel(quote.status)}</span><strong>{quote.total}</strong></div>
              </button>
            )) : <div className="empty-state"><strong>Nessun preventivo</strong><span>Crea la prima offerta collegata a un cliente.</span></div>}
          </div>
        </div>

        <article className="panel quote-detail-panel">
          {selectedQuote ? <>
            <div className="quote-detail-header">
              <div><p className="eyebrow">{selectedQuote.quoteNumber}</p><h2>{selectedQuote.subject}</h2><span>{selectedQuote.customerName}</span></div>
              <div className="detail-header-actions"><span className={`quote-status status-${selectedQuote.status}`}>{quoteStatusLabel(selectedQuote.status)}</span><button className="icon-label-button pdf-button" disabled={exportingQuoteId === selectedQuote.id} onClick={() => handlePdfExport(selectedQuote)} type="button"><Download size={15} /> {exportingQuoteId === selectedQuote.id ? "Creazione PDF..." : "Scarica PDF"}</button><button className="icon-label-button" onClick={() => { setEditingQuote(selectedQuote); setIsQuoteModalOpen(true); }} type="button"><Pencil size={15} /> Modifica</button><button className="icon-label-button danger-button" onClick={() => { setDeleteQuoteError(""); setQuotePendingDelete(selectedQuote); }} type="button"><Trash2 size={15} /> Elimina</button></div>
            </div>
            {quoteExportError && <div className="form-error quote-export-error">{quoteExportError}</div>}
            <div className="quote-meta-grid">
              <div><span>Emissione</span><strong>{new Date(selectedQuote.issueDate).toLocaleDateString("it-IT")}</strong></div>
              <div><span>Validità</span><strong>{selectedQuote.validUntil ? new Date(selectedQuote.validUntil).toLocaleDateString("it-IT") : "Non indicata"}</strong></div>
              <div><span>Opportunità</span><strong>{selectedQuote.opportunityTitle}</strong></div>
              <div><span>Aggiornato da</span><strong>{selectedQuote.updatedBy}</strong></div>
            </div>
            <div className="quote-items-table"><div className="quote-items-head"><span>Descrizione</span><span>Qtà</span><span>Prezzo</span><span>Totale</span></div>{selectedQuote.items.map((item) => <div className="quote-item-row" key={item.id}><strong>{item.description}</strong><span>{item.quantity} {item.unit}</span><span>{formatCurrency(item.unitPrice)}</span><strong>{formatCurrency(item.quantity * item.unitPrice)}</strong></div>)}</div>
            <div className="quote-totals"><div><span>Imponibile</span><strong>{selectedQuote.subtotal}</strong></div>{selectedQuote.discount > 0 && <div><span>Sconto {selectedQuote.discount}%</span><strong>- {selectedQuote.discountValue}</strong></div>}<div><span>IVA {selectedQuote.vatRate}%</span><strong>{selectedQuote.vat}</strong></div><div className="quote-grand-total"><span>Totale preventivo</span><strong>{selectedQuote.total}</strong></div></div>
            {selectedQuote.notes && <div className="quote-notes"><StickyNote size={16} /><p>{selectedQuote.notes}</p></div>}
          </> : <div className="empty-state large-empty"><Calculator size={32} /><strong>Nessun preventivo selezionato</strong><span>Crea un preventivo per iniziare.</span></div>}
        </article>
      </section>
      <QuoteModal customers={customers} defaultIssueDate={today} defaultQuoteNumber={defaultQuoteNumber} isOpen={isQuoteModalOpen} onClose={() => { setEditingQuote(null); setIsQuoteModalOpen(false); }} onSave={handleSave} onSavePriceItems={onSavePriceItems} opportunities={opportunities} priceList={priceList} quote={editingQuote} />
      {quotePendingDelete && <div className="modal-backdrop" role="presentation"><section aria-labelledby="delete-quote-title" aria-modal="true" className="delete-confirm-modal" role="dialog"><div className="delete-confirm-icon"><Trash2 size={24} /></div><div><p className="eyebrow">Conferma eliminazione</p><h2 id="delete-quote-title">Eliminare definitivamente il preventivo?</h2><p><strong>{quotePendingDelete.quoteNumber}</strong> · {quotePendingDelete.subject}</p><span>L’operazione non può essere annullata.</span></div>{deleteQuoteError && <div className="form-error">{deleteQuoteError}</div>}<div className="delete-confirm-actions"><button className="icon-label-button" disabled={isDeletingQuote} onClick={() => setQuotePendingDelete(null)} type="button">Annulla</button><button className="danger-confirm-button" disabled={isDeletingQuote} onClick={handleDelete} type="button"><Trash2 size={16} /> {isDeletingQuote ? "Eliminazione..." : "Elimina definitivamente"}</button></div></section></div>}
    </section>
  );
}

const normalizePriceText = (value) => String(value || "").toLocaleLowerCase("it-IT").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const priceStopWords = new Set(["a", "al", "alla", "con", "da", "dei", "del", "della", "di", "e", "ed", "in", "la", "le", "per", "su", "un", "una"]);
const priceTokens = (value) => normalizePriceText(value).split(" ").filter((token) => token.length > 2 && !priceStopWords.has(token));
const findPriceMatch = (description, priceList) => {
  const normalized = normalizePriceText(description);
  const sourceTokens = new Set(priceTokens(description));
  let best = null;
  priceList.filter((item) => item.active).forEach((item) => {
    const code = normalizePriceText(item.code);
    const targetTokens = priceTokens(item.description);
    const score = code && normalized.includes(code) ? 1 : targetTokens.length
      ? targetTokens.filter((token) => sourceTokens.has(token)).length / Math.min(Math.max(targetTokens.length, 1), 8)
      : 0;
    if (!best || score > best.score) best = { item, score };
  });
  return best?.score >= 0.55 ? best.item : null;
};

function QuoteModal({ customers, defaultIssueDate, defaultQuoteNumber, isOpen, onClose, onSave, onSavePriceItems, opportunities, priceList = [], quote }) {
  const emptyItem = () => ({ description: "", id: crypto.randomUUID(), quantity: 1, unit: "cad", unitPrice: 0 });
  const [formData, setFormData] = useState({ customerId: "", discount: 0, issueDate: defaultIssueDate, items: [emptyItem()], notes: "", opportunityId: "", quoteNumber: defaultQuoteNumber, status: "bozza", subject: "", validUntil: "", vatRate: 22 });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importWarnings, setImportWarnings] = useState([]);
  const [priceMessage, setPriceMessage] = useState("");
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [dragOverItemId, setDragOverItemId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage("");
    setImportMessage("");
    setImportWarnings([]);
    setPriceMessage("");
    setFormData({ customerId: quote?.customerId || customers[0]?.id || "", discount: quote?.discount || 0, issueDate: quote?.issueDate || defaultIssueDate, items: quote?.items?.length ? quote.items : [emptyItem()], notes: quote?.notes || "", opportunityId: quote?.opportunityId || "", quoteNumber: quote?.quoteNumber || defaultQuoteNumber, status: quote?.status || "bozza", subject: quote?.subject || "", validUntil: quote?.validUntil || "", vatRate: quote?.vatRate ?? 22 });
  }, [customers, defaultIssueDate, defaultQuoteNumber, isOpen, quote]);

  if (!isOpen) return null;
  const subtotal = formData.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const total = (subtotal * (1 - (Number(formData.discount) || 0) / 100)) * (1 + (Number(formData.vatRate) || 0) / 100);
  const updateItem = (id, field, value) => setFormData((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, [field]: value } : item) }));
  const moveItem = (sourceId, targetId) => setFormData((current) => {
    const sourceIndex = current.items.findIndex((item) => item.id === sourceId);
    const targetIndex = current.items.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;
    const items = [...current.items];
    const [moved] = items.splice(sourceIndex, 1);
    items.splice(targetIndex, 0, moved);
    return { ...current, items };
  });

  const applyPriceList = () => {
    let matched = 0;
    setFormData((current) => ({ ...current, items: current.items.map((item) => {
      if (Number(item.unitPrice) > 0) return item;
      const match = findPriceMatch(item.description, priceList);
      if (!match) return item;
      matched += 1;
      return { ...item, unit: match.unit, unitPrice: match.unitPrice };
    }) }));
    setPriceMessage(matched ? `${matched} prezzi applicati dal prezzario` : "Nessuna corrispondenza sicura trovata");
  };

  const savePricesToArchive = async () => {
    const existing = new Set(priceList.map((item) => normalizePriceText(item.description)));
    const items = formData.items.filter((item) => item.description.trim() && Number(item.unitPrice) > 0 && !existing.has(normalizePriceText(item.description)));
    if (!items.length) return setPriceMessage("Tutte le voci con prezzo sono già nel prezzario");
    try { await onSavePriceItems(items); setPriceMessage(`${items.length} nuove voci salvate nel prezzario`); }
    catch (error) { setPriceMessage(error.message || "Non sono riuscito a salvare i prezzi"); }
  };

  const handleComputoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true); setErrorMessage(""); setImportWarnings([]); setImportMessage("Analisi del file in corso...");
    try {
      const imported = await importComputoFile(file, ({ progress, status }) => {
        const percentage = Math.round((Number(progress) || 0) * 100);
        setImportMessage(`OCR ${percentage}% · ${status || "riconoscimento in corso"}`);
      });
      setFormData((current) => {
        return { ...current, items: imported.items, subject: current.subject || `Computo metrico - ${imported.fileName}` };
      });
      setImportWarnings(imported.warnings || []);
      setImportMessage(`${imported.items.length} voci importate da ${file.name}${imported.usedOcr ? " tramite OCR" : ""}`);
    } catch (error) {
      setImportMessage("");
      setErrorMessage(error.message || "Non sono riuscito a leggere il computo metrico.");
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const items = formData.items.filter((item) => item.description.trim() && Number(item.quantity) > 0);
    if (!formData.quoteNumber.trim() || !formData.subject.trim() || !items.length) { setErrorMessage("Inserisci numero, oggetto e almeno una voce valida."); return; }
    setIsSaving(true); setErrorMessage("");
    try { await onSave({ ...formData, id: quote?.id, items }); } catch (error) { setErrorMessage(error.message || "Non sono riuscito a salvare il preventivo."); } finally { setIsSaving(false); }
  };

  return <div className="modal-backdrop" role="presentation"><section className="appointment-modal quote-modal" aria-labelledby="quote-modal-title" role="dialog" aria-modal="true"><div className="modal-heading"><div><p className="eyebrow">Preventivo</p><h2 id="quote-modal-title">{quote ? "Modifica preventivo" : "Nuovo preventivo"}</h2></div><button className="icon-button" onClick={onClose} type="button" aria-label="Chiudi"><X size={18} /></button></div><form className="appointment-form" onSubmit={handleSubmit}>
    <div className="form-grid"><label><span>Numero</span><input name="quoteNumber" onChange={(e) => setFormData({ ...formData, quoteNumber: e.target.value })} required value={formData.quoteNumber} /></label><label><span>Stato</span><select onChange={(e) => setFormData({ ...formData, status: e.target.value })} value={formData.status}>{quoteStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label></div>
    <label><span>Oggetto del preventivo</span><input onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="Es. Rifacimento facciata condominiale" required value={formData.subject} /></label>
    <div className="form-grid"><label><span>Cliente</span><select onChange={(e) => setFormData({ ...formData, customerId: e.target.value, opportunityId: "" })} value={formData.customerId}><option value="">Nessun cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><label><span>Opportunità</span><select onChange={(e) => setFormData({ ...formData, opportunityId: e.target.value })} value={formData.opportunityId}><option value="">Nessuna opportunità</option>{opportunities.filter((item) => !formData.customerId || item.customerId === formData.customerId).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>
    <div className="form-grid"><label><span>Data emissione</span><input onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} type="date" value={formData.issueDate} /></label><label><span>Valido fino al</span><input onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })} type="date" value={formData.validUntil} /></label></div>
    <div className="quote-editor-items"><div className="quote-editor-heading"><div><strong>Voci del preventivo</strong><span>Inserisci manualmente oppure importa un computo. I PDF scansionati e le immagini usano l’OCR a doppio controllo.</span></div><div className="quote-editor-actions"><input accept=".pdf,.xlsx,.csv,.jpg,.jpeg,.png,.webp,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,image/jpeg,image/png,image/webp" aria-label="Carica computo metrico" className="visually-hidden" onChange={handleComputoUpload} ref={fileInputRef} type="file" /><button className="computo-upload-button" disabled={isImporting} onClick={() => fileInputRef.current?.click()} type="button"><UploadCloud size={15} /> {isImporting ? "Doppia lettura OCR..." : "Carica computo"}</button><button className="filter-reset" disabled={!priceList.length} onClick={applyPriceList} type="button"><BookOpen size={14} /> Applica prezzario</button><button className="filter-reset" onClick={savePricesToArchive} type="button"><Plus size={14} /> Salva prezzi</button><button className="filter-reset" disabled={isImporting} onClick={() => setFormData({ ...formData, items: [...formData.items, emptyItem()] })} type="button"><Plus size={14} /> Aggiungi voce</button></div></div>{importMessage && <div className="computo-import-success"><FileSpreadsheet size={16} /> {importMessage}</div>}{priceMessage && <div className="price-match-message"><BookOpen size={15} /> {priceMessage}</div>}{importWarnings.map((warning) => <div className="computo-import-warning" key={warning}>{warning}. Verifica il documento prima di salvarlo.</div>)}<div className="quote-editor-columns"><span></span><span>Descrizione</span><span>Quantità</span><span>U.M.</span><span>Costo unitario</span><span></span></div>{formData.items.map((item) => <div className={`quote-editor-row ${draggedItemId === item.id ? "dragging" : ""} ${dragOverItemId === item.id ? "drag-over" : ""}`} key={item.id} onDragOver={(event) => { event.preventDefault(); setDragOverItemId(item.id); }} onDrop={(event) => { event.preventDefault(); moveItem(draggedItemId, item.id); setDraggedItemId(null); setDragOverItemId(null); }}><button aria-label={`Trascina ${item.description || "voce"}`} className="quote-drag-handle" draggable onDragEnd={() => { setDraggedItemId(null); setDragOverItemId(null); }} onDragStart={(event) => { setDraggedItemId(item.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.id); }} title="Trascina sopra o sotto" type="button"><GripVertical size={17} /></button><input aria-label="Descrizione voce" onChange={(e) => updateItem(item.id, "description", e.target.value)} placeholder="Descrizione lavorazione" value={item.description} /><input aria-label="Quantità" min="0.01" onChange={(e) => updateItem(item.id, "quantity", e.target.value)} step="0.01" type="number" value={item.quantity} /><input aria-label="Unità" onChange={(e) => updateItem(item.id, "unit", e.target.value)} value={item.unit} /><input aria-label="Costo unitario" min="0" onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)} step="0.01" type="number" value={item.unitPrice} /><button aria-label="Rimuovi voce" className="quote-remove-item" disabled={formData.items.length === 1} onClick={() => setFormData({ ...formData, items: formData.items.filter((row) => row.id !== item.id) })} type="button"><Trash2 size={15} /></button></div>)}</div>
    <div className="form-grid"><label><span>Sconto %</span><input max="100" min="0" onChange={(e) => setFormData({ ...formData, discount: e.target.value })} type="number" value={formData.discount} /></label><label><span>IVA %</span><input max="100" min="0" onChange={(e) => setFormData({ ...formData, vatRate: e.target.value })} type="number" value={formData.vatRate} /></label></div>
    <label><span>Note e condizioni</span><textarea onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Tempi di consegna, modalità di pagamento..." rows="3" value={formData.notes} /></label>
    <div className="quote-modal-total"><span>Totale calcolato</span><strong>{formatCurrency(total)}</strong></div>
    <div className="modal-actions"><button className="ghost-button" onClick={onClose} type="button">Annulla</button><button className="primary-button" disabled={isSaving} type="submit">{isSaving ? "Salvataggio" : "Salva preventivo"}</button></div>{errorMessage && <p className="form-error">{errorMessage}</p>}
  </form></section></div>;
}

function CustomersPage({
  actionError,
  customers,
  onAddCustomerNote,
  onArchiveCustomer,
  onCreateCustomer,
  onOpenOpportunities,
  onUpdateCustomer,
  opportunities = [],
  searchQuery = "",
  teamMembers = [],
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerNote, setCustomerNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [inlineActionError, setInlineActionError] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("tutti");
  const [customerStatusFilter, setCustomerStatusFilter] = useState("tutti");
  const [customerAssigneeFilter, setCustomerAssigneeFilter] = useState("tutti");
  const filteredCustomers = customers.filter((customer) =>
    (customerTypeFilter === "tutti" || customer.type === customerTypeFilter) &&
    (customerStatusFilter === "tutti" || customer.status === customerStatusFilter) &&
    (customerAssigneeFilter === "tutti" || customer.assignedUsers.some((user) => user.userId === customerAssigneeFilter)) &&
    matchesSearch(searchQuery, [customer.name, customer.primaryContact, customer.email, customer.phone, customer.address, customer.status]),
  );
  const selectedCustomer = filteredCustomers.find((customer) => customer.id === selectedCustomerId) || filteredCustomers[0];
  const customerOpportunities = opportunities.filter((opportunity) => opportunity.customerId === selectedCustomer?.id);
  const activeCustomers = customers.filter((customer) => customer.status.includes("attivo")).length;
  const condomini = customers.filter((customer) => customer.type === "Condominio").length;
  const openValueTotal = customers.reduce((total, customer) => total + parseCurrency(customer.openValue), 0);

  const handleSaveCustomer = async (customer) => {
    const savedCustomer = customer.id ? await onUpdateCustomer(customer) : await onCreateCustomer(customer);
    setSelectedCustomerId(savedCustomer.id);
    setEditingCustomer(null);
    setIsCustomerModalOpen(false);
  };

  const openCreateCustomer = () => {
    setEditingCustomer(null);
    setIsCustomerModalOpen(true);
  };

  const openEditCustomer = () => {
    setEditingCustomer(selectedCustomer);
    setIsCustomerModalOpen(true);
  };

  const handleArchiveCustomer = async () => {
    if (!selectedCustomer) return;
    setIsArchiving(true);
    setInlineActionError("");
    try {
      await onArchiveCustomer(selectedCustomer, selectedCustomer.status !== "Archiviato");
    } catch (error) {
      setInlineActionError(error.message || "Non sono riuscito ad aggiornare lo stato del cliente.");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleAddNote = async (event) => {
    event.preventDefault();
    if (!selectedCustomer || !customerNote.trim()) return;
    setIsSavingNote(true);
    setInlineActionError("");
    try {
      await onAddCustomerNote(selectedCustomer.id, customerNote);
      setCustomerNote("");
    } catch (error) {
      setInlineActionError(error.message || "Non sono riuscito a salvare la nota.");
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <section className="customers-page">
      <section className="quick-stats compact-stats" aria-label="Indicatori clienti">
        <article className="stat-card">
          <div className="stat-card-heading"><span>Clienti totali</span><ContactRound aria-hidden="true" size={19} /></div>
          <strong>{customers.length}</strong>
          <small>Anagrafiche operative</small>
        </article>
        <article className="stat-card">
          <div className="stat-card-heading"><span>Cantieri collegati</span><BriefcaseBusiness aria-hidden="true" size={19} /></div>
          <strong>{activeCustomers}</strong>
          <small>Clienti con lavori attivi</small>
        </article>
        <article className="stat-card">
          <div className="stat-card-heading"><span>Condomini</span><Building2 aria-hidden="true" size={19} /></div>
          <strong>{condomini}</strong>
          <small>Amministratori da seguire</small>
        </article>
        <article className="stat-card">
          <div className="stat-card-heading"><span>Valore aperto</span><WalletCards aria-hidden="true" size={19} /></div>
          <strong>{formatCurrency(openValueTotal)}</strong>
          <small>Somma dei valori inseriti</small>
        </article>
      </section>

      <section className="customers-layout">
        <div className="panel customers-list-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Anagrafiche</p>
              <h2>Clienti</h2>
            </div>
            <button className="primary-button" onClick={openCreateCustomer} type="button">
              <UserPlus aria-hidden="true" size={17} /> Nuovo cliente
            </button>
          </div>
          <div className="filter-strip list-filters" aria-label="Filtri clienti">
            <div className="filter-summary">
              <span className="filter-summary-icon" aria-hidden="true"><SlidersHorizontal size={16} /></span>
              <div>
                <strong>Filtra clienti</strong>
                <span className="filter-count">{filteredCustomers.length} di {customers.length} risultati</span>
              </div>
              {(customerTypeFilter !== "tutti" || customerStatusFilter !== "tutti" || customerAssigneeFilter !== "tutti") && (
                <button className="filter-reset" onClick={() => { setCustomerTypeFilter("tutti"); setCustomerStatusFilter("tutti"); setCustomerAssigneeFilter("tutti"); }} type="button">
                  <RotateCcw aria-hidden="true" size={13} /> Azzera
                </button>
              )}
            </div>
            <label className="filter-field">
              <span>Tipo</span>
              <select onChange={(event) => setCustomerTypeFilter(event.target.value)} value={customerTypeFilter}>
                <option value="tutti">Tutti</option>
                {customerTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="filter-field">
              <span>Stato</span>
              <select onChange={(event) => setCustomerStatusFilter(event.target.value)} value={customerStatusFilter}>
                <option value="tutti">Tutti</option>
                {customerStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label className="filter-field">
              <span>Responsabile</span>
              <select onChange={(event) => setCustomerAssigneeFilter(event.target.value)} value={customerAssigneeFilter}>
                <option value="tutti">Tutto il team</option>
                {teamMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
          </div>
          {actionError && <p className="form-error">{actionError}</p>}

          <div className="customers-list" role="list">
            {filteredCustomers.length ? (
              filteredCustomers.map((customer) => (
                <button
                  className={`customer-row ${selectedCustomer?.id === customer.id ? "selected" : ""}`}
                  key={customer.id}
                  onClick={() => setSelectedCustomerId(customer.id)}
                  type="button"
                >
                  <span className="customer-avatar" aria-hidden="true">{customer.name.charAt(0).toUpperCase()}</span>
                  <div>
                    <strong>{customer.name}</strong>
                    <span>{customer.primaryContact}</span>
                  </div>
                  <div className="customer-row-trailing">
                    <small>{customer.status}</small>
                    <ChevronRight aria-hidden="true" size={17} />
                  </div>
                </button>
              ))
            ) : (
              <div className="empty-state">
                <strong>Nessuna anagrafica cliente</strong>
                <span>Inserisci il primo cliente reale della tua azienda.</span>
              </div>
            )}
          </div>
        </div>

        {selectedCustomer && (
          <article className="panel customer-detail-panel">
            <div className="customer-detail-header">
              <div>
                <p className="eyebrow">{selectedCustomer.type}</p>
                <h2>{selectedCustomer.name}</h2>
              </div>
              <div className="detail-header-actions">
                <span className="status-badge">{selectedCustomer.status}</span>
                <button className="icon-label-button" onClick={openEditCustomer} type="button">
                  <Pencil aria-hidden="true" size={15} /> Modifica
                </button>
                <button className="icon-label-button" disabled={isArchiving} onClick={handleArchiveCustomer} type="button">
                  {selectedCustomer.status === "Archiviato" ? <ArchiveRestore aria-hidden="true" size={15} /> : <Archive aria-hidden="true" size={15} />}
                  {isArchiving ? "Salvataggio" : selectedCustomer.status === "Archiviato" ? "Riattiva" : "Archivia"}
                </button>
              </div>
            </div>

            <div className="customer-quick-actions" aria-label="Azioni rapide cliente">
              <a className={`quick-action ${selectedCustomer.phone === "Non indicato" ? "disabled" : ""}`} href={selectedCustomer.phone === "Non indicato" ? undefined : `tel:${selectedCustomer.phone.replace(/\s/g, "")}`}>
                <Phone aria-hidden="true" size={16} /> Chiama
              </a>
              <a className={`quick-action ${selectedCustomer.email === "Non indicata" ? "disabled" : ""}`} href={selectedCustomer.email === "Non indicata" ? undefined : `mailto:${selectedCustomer.email}`}>
                <Mail aria-hidden="true" size={16} /> Scrivi email
              </a>
              <button className="quick-action" onClick={onOpenOpportunities} type="button">
                <Target aria-hidden="true" size={16} /> Opportunità
              </button>
            </div>
            {inlineActionError && <p className="form-error">{inlineActionError}</p>}

            <div className="customer-contact-grid">
              <div>
                <span><UserRound aria-hidden="true" size={14} /> Referente</span>
                <strong>{selectedCustomer.primaryContact}</strong>
              </div>
              <div>
                <span><Phone aria-hidden="true" size={14} /> Telefono</span>
                <strong>{selectedCustomer.phone}</strong>
              </div>
              <div>
                <span><Mail aria-hidden="true" size={14} /> Email</span>
                <strong>{selectedCustomer.email}</strong>
              </div>
              <div>
                <span><MapPin aria-hidden="true" size={14} /> Indirizzo</span>
                <strong>{selectedCustomer.address}</strong>
              </div>
            </div>

            <div className="customer-work-grid">
              <div>
                <span><History aria-hidden="true" size={14} /> Ultimo contatto</span>
                <strong>{selectedCustomer.lastContact}</strong>
              </div>
              <div>
                <span><WalletCards aria-hidden="true" size={14} /> Valore aperto</span>
                <strong>{selectedCustomer.openValue}</strong>
              </div>
              <div>
                <span>Inserito da</span>
                <strong>{selectedCustomer.createdBy}</strong>
              </div>
              <div>
                <span>Ultima modifica</span>
                <strong>{selectedCustomer.updatedBy}</strong>
              </div>
              <div>
                <span><UserCheck aria-hidden="true" size={14} /> Assegnato a</span>
                <strong>{assignmentSummary(selectedCustomer.assignedUsers)}</strong>
              </div>
            </div>

            <div className="linked-section">
              <h3><Link2 aria-hidden="true" size={16} /> Lavori collegati</h3>
              <div className="tag-list">
                {(selectedCustomer.projects.length ? selectedCustomer.projects : ["Nessun lavoro collegato"]).map((project) => (
                  <span className="work-tag" key={project}>
                    {project}
                  </span>
                ))}
              </div>
            </div>

            <div className="linked-section">
              <h3><StickyNote aria-hidden="true" size={16} /> Note operative</h3>
              <div className="tag-list">
                {(selectedCustomer.tags.length ? selectedCustomer.tags : ["Nessuna nota"]).map((tag) => (
                  <span className="note-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="linked-section">
              <div className="linked-section-heading">
                <h3><Target aria-hidden="true" size={16} /> Opportunità collegate</h3>
                <span>{customerOpportunities.length}</span>
              </div>
              <div className="linked-opportunities">
                {customerOpportunities.length ? customerOpportunities.map((opportunity) => (
                  <button className="linked-opportunity-card" key={opportunity.id} onClick={onOpenOpportunities} type="button">
                    <div>
                      <strong>{opportunity.title}</strong>
                      <span>{opportunity.nextAction || opportunity.type}</span>
                    </div>
                    <div>
                      <small>{opportunity.estimatedValue}</small>
                      <ChevronRight aria-hidden="true" size={16} />
                    </div>
                  </button>
                )) : <p className="empty-inline">Nessuna opportunità collegata a questo cliente.</p>}
              </div>
            </div>

            <div className="linked-section customer-history-section">
              <div className="linked-section-heading">
                <h3><History aria-hidden="true" size={16} /> Cronologia cliente</h3>
                <span>{selectedCustomer.activities?.length || 0}</span>
              </div>
              <form className="customer-note-form" onSubmit={handleAddNote}>
                <MessageSquarePlus aria-hidden="true" size={17} />
                <input aria-label="Nuova nota cliente" onChange={(event) => setCustomerNote(event.target.value)} placeholder="Aggiungi una nota o un aggiornamento..." value={customerNote} />
                <button aria-label="Salva nota" disabled={isSavingNote || !customerNote.trim()} type="submit">
                  <Send aria-hidden="true" size={16} />
                </button>
              </form>
              <ol className="customer-timeline">
                {(selectedCustomer.activities || []).length ? selectedCustomer.activities.map((activity) => (
                  <li key={activity.id}>
                    <span className="timeline-dot" aria-hidden="true"></span>
                    <div>
                      <strong>{activity.detail}</strong>
                      <small>{activity.dateLabel} · {activity.actor}</small>
                    </div>
                  </li>
                )) : <li className="empty-inline">Nessuna attività registrata.</li>}
              </ol>
            </div>
          </article>
        )}
      </section>
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => { setEditingCustomer(null); setIsCustomerModalOpen(false); }}
        onSave={handleSaveCustomer}
        customer={editingCustomer}
        teamMembers={teamMembers}
      />
    </section>
  );
}

function CustomerModal({ customer, isOpen, onClose, onSave, teamMembers = [] }) {
  const [formData, setFormData] = useState({
    address: "",
    assignedUserIds: [],
    email: "",
    name: "",
    openValue: "",
    phone: "",
    primaryContact: "",
    projects: "",
    status: "Nuova richiesta",
    tags: "",
    type: "Privato",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage("");
    setFormData({
      address: customer?.address === "Indirizzo da completare" ? "" : customer?.address || "",
      assignedUserIds: customer?.assignedUsers?.map((user) => user.userId) || [],
      email: customer?.email === "Non indicata" ? "" : customer?.email || "",
      name: customer?.name || "",
      openValue: customer?.openValue || "",
      phone: customer?.phone === "Non indicato" ? "" : customer?.phone || "",
      primaryContact: customer?.primaryContact || "",
      projects: customer?.projects?.join(", ") || "",
      status: customer?.status || "Nuova richiesta",
      tags: customer?.tags?.join(", ") || "",
      type: customer?.type || "Privato",
    });
  }, [customer, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const splitField = (value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    const name = formData.name.trim();
    const primaryContact = formData.primaryContact.trim();

    if (!name || !primaryContact) {
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        address: formData.address.trim() || "Indirizzo da completare",
        assignedUserIds: formData.assignedUserIds,
        email: formData.email.trim() || "Non indicata",
        id: customer?.id,
        name,
        openValue: formData.openValue.trim() || "€ 0",
        phone: formData.phone.trim() || "Non indicato",
        primaryContact,
        projects: splitField(formData.projects),
        status: formData.status,
        tags: splitField(formData.tags),
        type: formData.type,
      });

    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a salvare il cliente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="appointment-modal" aria-labelledby="customer-title" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Anagrafica</p>
            <h2 id="customer-title">{customer ? "Modifica cliente" : "Nuovo cliente"}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Chiudi">
            x
          </button>
        </div>

        <form className="appointment-form" onSubmit={handleSubmit}>
          <label>
            <span>Nome cliente</span>
            <input
              name="name"
              onChange={handleChange}
              placeholder="Es. Condominio Verdi"
              required
              value={formData.name}
            />
          </label>

          <div className="form-grid">
            <label>
              <span>Tipo</span>
              <select name="type" onChange={handleChange} value={formData.type}>
                {customerTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Stato</span>
              <select name="status" onChange={handleChange} value={formData.status}>
                {customerStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            <span>Referente principale</span>
            <input
              name="primaryContact"
              onChange={handleChange}
              placeholder="Es. Amm. Mario Rossi"
              required
              value={formData.primaryContact}
            />
          </label>

          <div className="form-grid">
            <label>
              <span>Telefono</span>
              <input name="phone" onChange={handleChange} placeholder="+39 ..." value={formData.phone} />
            </label>

            <label>
              <span>Email</span>
              <input name="email" onChange={handleChange} placeholder="cliente@example.it" value={formData.email} />
            </label>
          </div>

          <label>
            <span>Indirizzo</span>
            <input
              name="address"
              onChange={handleChange}
              placeholder="Via, civico, città"
              value={formData.address}
            />
          </label>

          <div className="form-grid">
            <label>
              <span>Valore aperto</span>
              <input name="openValue" onChange={handleChange} placeholder="€ 25.000" value={formData.openValue} />
            </label>

            <label>
              <span>Lavori collegati</span>
              <input
                name="projects"
                onChange={handleChange}
                placeholder="Facciata, tetto, bagno"
                value={formData.projects}
              />
            </label>
          </div>

          <label>
            <span>Note operative</span>
            <input
              name="tags"
              onChange={handleChange}
              placeholder="Alta priorità, da richiamare"
              value={formData.tags}
            />
          </label>

          <AssignmentSelector
            onChange={(assignedUserIds) => setFormData((current) => ({ ...current, assignedUserIds }))}
            selectedUserIds={formData.assignedUserIds}
            teamMembers={teamMembers}
          />

          <div className="modal-actions">
            <button className="ghost-button" onClick={onClose} type="button">
              Annulla
            </button>
            <button className="primary-button" disabled={isSaving} type="submit">
              {isSaving ? "Salvataggio" : customer ? "Salva modifiche" : "Salva cliente"}
            </button>
          </div>
          {errorMessage && <p className="form-error">{errorMessage}</p>}
        </form>
      </section>
    </div>
  );
}

function AppointmentModal({ appointment, defaultDate, isOpen, onClose, onSave, teamMembers = [] }) {
  const [formData, setFormData] = useState({
    assignedUserIds: [],
    date: defaultDate,
    time: "10:00",
    type: "appointment",
    title: "",
    related: "",
    detail: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(appointment?.id);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        assignedUserIds: appointment?.assignedUsers?.map((user) => user.userId) || [],
        date: appointment?.date || defaultDate,
        time: appointment?.time || "10:00",
        type: appointment?.type || "appointment",
        title: appointment?.title || "",
        related: appointment?.related || "",
        detail: appointment?.detail === "Dettagli da completare." ? "" : appointment?.detail || "",
      });
      setErrorMessage("");
    }
  }, [appointment, defaultDate, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    const title = formData.title.trim();

    if (!title) {
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        id: appointment?.id,
        assignedUserIds: formData.assignedUserIds,
        date: formData.date,
        detail: formData.detail.trim() || "Dettagli da completare.",
        related: formData.related.trim(),
        time: formData.time,
        title,
        type: formData.type,
      });

      setFormData({
        assignedUserIds: [],
        date: defaultDate,
        time: "10:00",
        type: "appointment",
        title: "",
        related: "",
        detail: "",
      });
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a salvare l'appuntamento.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="appointment-modal" aria-labelledby="appointment-title" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Calendario</p>
            <h2 id="appointment-title">{isEditing ? "Modifica appuntamento" : "Nuovo appuntamento"}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Chiudi">
            x
          </button>
        </div>

        <form className="appointment-form" onSubmit={handleSubmit}>
          <label>
            <span>Titolo</span>
            <input
              name="title"
              onChange={handleChange}
              placeholder="Es. Sopralluogo Condominio Verdi"
              required
              value={formData.title}
            />
          </label>

          <div className="form-grid">
            <label>
              <span>Data</span>
              <input name="date" onChange={handleChange} required type="date" value={formData.date} />
            </label>

            <label>
              <span>Ora</span>
              <input
                inputMode="numeric"
                name="time"
                onChange={handleChange}
                pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$"
                placeholder="14:30"
                title="Usa il formato HH:MM, ad esempio 14:30"
                value={formData.time}
              />
            </label>
          </div>

          <label>
            <span>Tipo</span>
            <select name="type" onChange={handleChange} value={formData.type}>
              {appointmentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Cliente o progetto collegato</span>
            <input
              name="related"
              onChange={handleChange}
              placeholder="Es. Amministratore Neri"
              value={formData.related}
            />
          </label>

          <label>
            <span>Note operative</span>
            <textarea
              name="detail"
              onChange={handleChange}
              placeholder="Misure da prendere, documenti da portare, tecnico assegnato..."
              rows="4"
              value={formData.detail}
            />
          </label>

          <AssignmentSelector
            onChange={(assignedUserIds) => setFormData((current) => ({ ...current, assignedUserIds }))}
            selectedUserIds={formData.assignedUserIds}
            teamMembers={teamMembers}
          />

          <div className="modal-actions">
            <button className="ghost-button" onClick={onClose} type="button">
              Annulla
            </button>
            <button className="primary-button" disabled={isSaving} type="submit">
              {isSaving ? "Salvataggio" : isEditing ? "Salva modifiche" : "Salva appuntamento"}
            </button>
          </div>
          {errorMessage && <p className="form-error">{errorMessage}</p>}
        </form>
      </section>
    </div>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setActionError] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [currentDate] = useState(() => new Date());
  const [crmState, setCrmState] = useState(initialCrmState);
  const [dataLoading, setDataLoading] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const todayKey = useMemo(() => toDateKey(currentDate), [currentDate]);
  const currentDateLabel = useMemo(() => formatLongDate(currentDate), [currentDate]);
  const pageTitle = navItems.find((item) => item.id === activeView)?.title || "Calendario operativo";
  const searchPlaceholder = {
    agenda: "Cerca nell'agenda",
    cantieri: "Cerca cantiere o referente",
    clienti: "Cerca cliente, referente o indirizzo",
    dashboard: "Cerca appuntamento, cliente o attività",
    opportunita: "Cerca opportunità o cliente",
    prezzario: "Cerca codice, lavorazione o categoria",
    preventivi: "Cerca preventivo o cliente",
  }[activeView] || "Cerca nel CRM";
  const userLabel = userProfile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email || "Profilo";
  const sortedAppointments = useMemo(
    () => [...crmState.todayAppointments].sort((first, second) => first.time.localeCompare(second.time)),
    [crmState.todayAppointments],
  );
  const selectedAppointment = useMemo(
    () => crmState.appointments.find((appointment) => appointment.id === selectedAppointmentId) || null,
    [crmState.appointments, selectedAppointmentId],
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return undefined;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session);
        setAuthLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setCrmState(initialCrmState);
      setEditingAppointment(null);
      setSelectedAppointmentId(null);
      setUserProfile(null);
      return;
    }

    let isMounted = true;

    async function loadData() {
      setDataLoading(true);
      setActionError("");

      try {
        const profile = await saveCurrentProfile(session.user);
        const nextState = await fetchCrmState();

        if (isMounted) {
          setUserProfile(profile);
          setCrmState(nextState);
        }
      } catch (error) {
        if (isMounted) {
          setActionError(error.message || "Non sono riuscito a caricare i dati Supabase.");
        }
      } finally {
        if (isMounted) {
          setDataLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [session]);

  useEffect(() => {
    if (selectedAppointmentId && !selectedAppointment) {
      setSelectedAppointmentId(null);
    }
  }, [selectedAppointment, selectedAppointmentId]);

  const openNewAppointment = () => {
    setEditingAppointment(null);
    setIsAppointmentModalOpen(true);
  };

  const openEditAppointment = (appointment) => {
    setEditingAppointment(appointment);
    setIsAppointmentModalOpen(true);
  };

  const closeAppointmentModal = () => {
    setEditingAppointment(null);
    setIsAppointmentModalOpen(false);
  };

  const handleSelectAppointment = (appointmentId) => {
    const appointment = crmState.appointments.find((item) => item.id === appointmentId);
    setSelectedAppointmentId(appointmentId);

    if (appointment?.date) {
      const appointmentDate = fromDateKey(appointment.date);
      setVisibleMonth(new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), 1));
    }
  };

  const handleSaveAppointment = async (appointment) => {
    setActionError("");
    const savedAppointment = appointment.id
      ? await updateAppointment(appointment, session.user.id)
      : await createAppointment(appointment, session.user.id);
    const nextState = await fetchCrmState();

    setCrmState(nextState);
    setSelectedAppointmentId(savedAppointment.id);
    setVisibleMonth(new Date(fromDateKey(savedAppointment.date).getFullYear(), fromDateKey(savedAppointment.date).getMonth(), 1));
    setEditingAppointment(null);
    setIsAppointmentModalOpen(false);
  };

  const handleCreateCustomer = async (customer) => {
    setActionError("");
    const savedCustomer = await createCustomer(customer, session.user.id);
    const nextState = await fetchCrmState();

    setCrmState(nextState);

    return savedCustomer;
  };

  const handleUpdateCustomer = async (customer) => {
    setActionError("");
    const savedCustomer = await updateCustomer(customer, session.user.id);
    const nextState = await fetchCrmState();
    setCrmState(nextState);
    return savedCustomer;
  };

  const handleArchiveCustomer = async (customer, archived) => {
    setActionError("");
    const savedCustomer = await setCustomerArchived(customer, archived, session.user.id);
    const nextState = await fetchCrmState();
    setCrmState(nextState);
    return savedCustomer;
  };

  const handleAddCustomerNote = async (customerId, detail) => {
    setActionError("");
    await addCustomerNote(customerId, detail, session.user.id);
    const nextState = await fetchCrmState();
    setCrmState(nextState);
  };

  const handleCreateQuote = async (quote) => {
    setActionError("");
    const savedQuote = await createQuote(quote, session.user.id);
    const nextState = await fetchCrmState();
    setCrmState(nextState);
    return savedQuote;
  };

  const handleUpdateQuote = async (quote) => {
    setActionError("");
    const savedQuote = await updateQuote(quote, session.user.id);
    const nextState = await fetchCrmState();
    setCrmState(nextState);
    return savedQuote;
  };

  const handleDeleteQuote = async (quoteId) => {
    setActionError("");
    await deleteQuote(quoteId);
    const nextState = await fetchCrmState();
    setCrmState(nextState);
  };

  const handleCreatePriceItem = async (item) => {
    const saved = await createPriceItem(item, session.user.id);
    setCrmState(await fetchCrmState());
    return saved;
  };

  const handleUpdatePriceItem = async (item) => {
    const saved = await updatePriceItem(item, session.user.id);
    setCrmState(await fetchCrmState());
    return saved;
  };

  const handleDeletePriceItem = async (itemId) => {
    await deletePriceItem(itemId);
    setCrmState(await fetchCrmState());
  };

  const handleSavePriceItems = async (items) => {
    await Promise.all(items.map((item) => createPriceItem({
      active: true,
      category: "Da preventivo",
      code: "",
      description: item.description,
      unit: item.unit,
      unitPrice: item.unitPrice,
    }, session.user.id)));
    setCrmState(await fetchCrmState());
  };

  const handleCreateOpportunity = async (opportunity) => {
    setActionError("");
    const savedOpportunity = await createOpportunity(opportunity, session.user.id);
    const nextState = await fetchCrmState();

    setCrmState(nextState);
    return savedOpportunity;
  };

  const handleCreateOpportunityStep = async (step) => {
    setActionError("");
    const savedStep = await createOpportunityStep(step, session.user.id);
    const nextState = await fetchCrmState();

    setCrmState(nextState);
    return savedStep;
  };

  const handleUpdateOpportunity = async (opportunity) => {
    setActionError("");
    const savedOpportunity = await updateOpportunity(opportunity, session.user.id);
    const nextState = await fetchCrmState();

    setCrmState(nextState);
    return savedOpportunity;
  };

  const handleUpdateOpportunityStage = async (opportunityId, status) => {
    setActionError("");
    const savedOpportunity = await updateOpportunityStage(opportunityId, status, session.user.id);
    const nextState = await fetchCrmState();

    setCrmState(nextState);
    return savedOpportunity;
  };

  const handleUpdateOpportunityStep = async (step) => {
    setActionError("");
    const savedStep = await updateOpportunityStep(step, session.user.id);
    const nextState = await fetchCrmState();

    setCrmState(nextState);
    return savedStep;
  };

  const handleSaveDisplayName = async (displayName) => {
    setActionError("");
    const profile = await updateDisplayName(session.user, displayName);
    const { data } = await supabase.auth.getSession();
    setUserProfile(profile);
    setSession(data.session);

    const nextState = await fetchCrmState();
    setCrmState(nextState);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCrmState(initialCrmState);
    setEditingAppointment(null);
    setSelectedAppointmentId(null);
    setUserProfile(null);
  };

  if (!isSupabaseConfigured) {
    return <ConfigMissing />;
  }

  if (authLoading) {
    return <LoadingState />;
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onViewChange={(view) => { setActiveView(view); setSearchQuery(""); }} userLabel={userLabel} />
      <main className="workspace">
        <Topbar
          currentDateLabel={currentDateLabel}
          onEditProfile={() => setIsProfileModalOpen(true)}
          onNewAppointment={openNewAppointment}
          onSearchChange={setSearchQuery}
          onSignOut={handleSignOut}
          searchPlaceholder={searchPlaceholder}
          searchQuery={searchQuery}
          title={pageTitle}
          userEmail={session.user.email}
          userLabel={userLabel}
        />
        {dataLoading && <p className="sync-banner">Sincronizzazione Supabase in corso...</p>}
        {actionError && <p className="form-error workspace-error">{actionError}</p>}
        {activeView === "clienti" ? (
          <CustomersPage
            actionError={actionError}
            customers={crmState.customers}
            onAddCustomerNote={handleAddCustomerNote}
            onArchiveCustomer={handleArchiveCustomer}
            onCreateCustomer={handleCreateCustomer}
            onOpenOpportunities={() => { setActiveView("opportunita"); setSearchQuery(""); }}
            onUpdateCustomer={handleUpdateCustomer}
            opportunities={crmState.opportunities}
            searchQuery={searchQuery}
            teamMembers={crmState.teamMembers}
          />
        ) : activeView === "opportunita" ? (
          <OpportunitiesPage
            actionError={actionError}
            customers={crmState.customers}
            onCreateOpportunity={handleCreateOpportunity}
            onCreateStep={handleCreateOpportunityStep}
            onUpdateOpportunity={handleUpdateOpportunity}
            onUpdateOpportunityStage={handleUpdateOpportunityStage}
            onUpdateStep={handleUpdateOpportunityStep}
            opportunities={crmState.opportunities}
            searchQuery={searchQuery}
            teamMembers={crmState.teamMembers}
          />
        ) : activeView === "prezzario" ? (
          <PriceListPage
            onCreate={handleCreatePriceItem}
            onDelete={handleDeletePriceItem}
            onUpdate={handleUpdatePriceItem}
            priceList={crmState.priceList || []}
            searchQuery={searchQuery}
          />
        ) : activeView === "preventivi" ? (
          <QuotesPage
            customers={crmState.customers}
            onCreateQuote={handleCreateQuote}
            onDeleteQuote={handleDeleteQuote}
            onSavePriceItems={handleSavePriceItems}
            onUpdateQuote={handleUpdateQuote}
            opportunities={crmState.opportunities}
            priceList={crmState.priceList || []}
            quotes={crmState.quotes || []}
            searchQuery={searchQuery}
          />
        ) : (
          <DashboardView
            appointments={sortedAppointments}
            currentDate={currentDate}
            crmState={crmState}
            onEditAppointment={openEditAppointment}
            onMonthChange={setVisibleMonth}
            onNewAppointment={openNewAppointment}
            onSelectAppointment={handleSelectAppointment}
            selectedAppointment={selectedAppointment}
            selectedAppointmentId={selectedAppointmentId}
            searchQuery={searchQuery}
            todayKey={todayKey}
            visibleMonth={visibleMonth}
          />
        )}
      </main>
      <AppointmentModal
        appointment={editingAppointment}
        defaultDate={todayKey}
        isOpen={isAppointmentModalOpen}
        onClose={closeAppointmentModal}
        onSave={handleSaveAppointment}
        teamMembers={crmState.teamMembers}
      />
      <ProfileModal
        currentName={userProfile?.full_name || session.user.user_metadata?.full_name || ""}
        email={session.user.email}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={handleSaveDisplayName}
      />
    </div>
  );
}
