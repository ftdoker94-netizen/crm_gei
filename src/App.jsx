import { useEffect, useMemo, useState } from "react";
import { navItems } from "./data.js";
import {
  createAppointment,
  createCustomer,
  fetchCrmState,
  saveCurrentProfile,
  updateDisplayName,
} from "./services/crmRepository.js";
import { isSupabaseConfigured, supabase } from "./services/supabaseClient.js";
import { initialCrmState } from "./store/seedData.js";

function Sidebar({ activeView, onViewChange, userLabel }) {
  return (
    <aside className="sidebar" aria-label="Navigazione principale">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          CE
        </div>
        <div>
          <strong>CRM Gei</strong>
          <span>Gestionale cantieri</span>
        </div>
      </div>

      <nav className="nav-list">
        {navItems.map((item) => (
          <button
            className={`nav-item ${activeView === item.id ? "active" : ""}`}
            key={item.id}
            onClick={() => onViewChange(item.id)}
            type="button"
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
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
const customerStatuses = ["Nuova richiesta", "Sopralluogo", "Preventivo", "Cantiere attivo", "Accettato"];

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
            CE
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

function Topbar({ currentDateLabel, onEditProfile, onNewAppointment, onSignOut, title, userEmail, userLabel }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{currentDateLabel}</p>
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        <label className="search">
          <span aria-hidden="true">⌕</span>
          <input type="search" placeholder="Cerca cliente, cantiere o preventivo" />
        </label>
        <button className="icon-button" type="button" aria-label="Notifiche" title="Notifiche">
          !
        </button>
        <button className="ghost-button profile-button" onClick={onEditProfile} type="button" title={userEmail}>
          <span>{userLabel}</span>
          <small>Profilo</small>
        </button>
        <button className="ghost-button user-button" onClick={onSignOut} type="button" title={userEmail}>
          Esci
        </button>
        <button className="primary-button" onClick={onNewAppointment} type="button">
          Nuovo lavoro
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

function CalendarPanel({ appointments, currentDate, events, onNewAppointment, todayKey }) {
  const monthStart = useMemo(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
    [currentDate],
  );
  const monthLabel = formatMonthYear(monthStart);
  const focusDateLabel = formatLongDate(currentDate);
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
      events.reduce((days, event) => {
        const dateKey = event.date || (event.day ? toDateKey(new Date(monthStart.getFullYear(), monthStart.getMonth(), event.day)) : "");
        if (!dateKey) {
          return days;
        }

        days[dateKey] = [...(days[dateKey] || []), event];
        return days;
      }, {}),
    [events, monthStart],
  );

  return (
    <section className="panel calendar-panel" aria-label="Calendario operativo">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Agenda lavori</p>
          <h2>{monthLabel}</h2>
        </div>
        <div className="calendar-actions">
          <button className="ghost-button" type="button">
            Settimana
          </button>
          <button className="primary-button" onClick={onNewAppointment} type="button">
            Nuovo appuntamento
          </button>
        </div>
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
                  <span className={`event-pill ${event.type}`} key={event.id || `${event.type}-${event.label}`}>
                    {event.label}
                  </span>
                ))}
              </article>
            );
          })}
        </div>

        <aside className="today-focus" aria-label="Dettaglio appuntamenti di oggi">
          <p className="eyebrow">Focus di oggi</p>
          <h2>{focusDateLabel}</h2>
          <ol className="focus-list">
            {appointments.length ? (
              appointments.map((appointment) => (
                <li key={appointment.id || `${appointment.time}-${appointment.title}`}>
                  <time>{appointment.time}</time>
                  <div>
                    <strong>{appointment.title}</strong>
                    <span>{appointment.detail}</span>
                  </div>
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

function DashboardView({ appointments, crmState, currentDate, onNewAppointment, todayKey }) {
  return (
    <>
      <CalendarPanel
        appointments={appointments}
        currentDate={currentDate}
        events={crmState.calendarEvents}
        onNewAppointment={onNewAppointment}
        todayKey={todayKey}
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

function CustomersPage({ actionError, customers, onCreateCustomer }) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || customers[0];
  const activeCustomers = customers.filter((customer) => customer.status.includes("attivo")).length;
  const condomini = customers.filter((customer) => customer.type === "Condominio").length;
  const openValueTotal = customers.reduce((total, customer) => total + parseCurrency(customer.openValue), 0);

  const handleSaveCustomer = async (customer) => {
    const savedCustomer = await onCreateCustomer(customer);
    setSelectedCustomerId(savedCustomer.id);
    setIsCustomerModalOpen(false);
  };

  return (
    <section className="customers-page">
      <section className="quick-stats compact-stats" aria-label="Indicatori clienti">
        <article className="stat-card">
          <span>Clienti totali</span>
          <strong>{customers.length}</strong>
          <small>Anagrafiche operative</small>
        </article>
        <article className="stat-card">
          <span>Cantieri collegati</span>
          <strong>{activeCustomers}</strong>
          <small>Clienti con lavori attivi</small>
        </article>
        <article className="stat-card">
          <span>Condomini</span>
          <strong>{condomini}</strong>
          <small>Amministratori da seguire</small>
        </article>
        <article className="stat-card">
          <span>Valore aperto</span>
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
            <button className="primary-button" onClick={() => setIsCustomerModalOpen(true)} type="button">
              Nuovo cliente
            </button>
          </div>
          {actionError && <p className="form-error">{actionError}</p>}

          <div className="customers-list" role="list">
            {customers.length ? (
              customers.map((customer) => (
                <button
                  className={`customer-row ${selectedCustomer?.id === customer.id ? "selected" : ""}`}
                  key={customer.id}
                  onClick={() => setSelectedCustomerId(customer.id)}
                  type="button"
                >
                  <div>
                    <strong>{customer.name}</strong>
                    <span>{customer.primaryContact}</span>
                  </div>
                  <small>{customer.status}</small>
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
              <span className="status-badge">{selectedCustomer.status}</span>
            </div>

            <div className="customer-contact-grid">
              <div>
                <span>Referente</span>
                <strong>{selectedCustomer.primaryContact}</strong>
              </div>
              <div>
                <span>Telefono</span>
                <strong>{selectedCustomer.phone}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{selectedCustomer.email}</strong>
              </div>
              <div>
                <span>Indirizzo</span>
                <strong>{selectedCustomer.address}</strong>
              </div>
            </div>

            <div className="customer-work-grid">
              <div>
                <span>Ultimo contatto</span>
                <strong>{selectedCustomer.lastContact}</strong>
              </div>
              <div>
                <span>Valore aperto</span>
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
            </div>

            <div className="linked-section">
              <h3>Lavori collegati</h3>
              <div className="tag-list">
                {(selectedCustomer.projects.length ? selectedCustomer.projects : ["Nessun lavoro collegato"]).map((project) => (
                  <span className="work-tag" key={project}>
                    {project}
                  </span>
                ))}
              </div>
            </div>

            <div className="linked-section">
              <h3>Note operative</h3>
              <div className="tag-list">
                {(selectedCustomer.tags.length ? selectedCustomer.tags : ["Nessuna nota"]).map((tag) => (
                  <span className="note-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </article>
        )}
      </section>
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={handleSaveCustomer}
      />
    </section>
  );
}

function CustomerModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    address: "",
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
      email: formData.email.trim() || "Non indicata",
      id: crypto.randomUUID(),
      lastContact: "Oggi",
      name,
      openValue: formData.openValue.trim() || "€ 0",
      phone: formData.phone.trim() || "Non indicato",
      primaryContact,
      projects: splitField(formData.projects),
      status: formData.status,
      tags: splitField(formData.tags),
      type: formData.type,
    });

      setFormData({
      address: "",
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
            <h2 id="customer-title">Nuovo cliente</h2>
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

          <div className="modal-actions">
            <button className="ghost-button" onClick={onClose} type="button">
              Annulla
            </button>
            <button className="primary-button" disabled={isSaving} type="submit">
              {isSaving ? "Salvataggio" : "Salva cliente"}
            </button>
          </div>
          {errorMessage && <p className="form-error">{errorMessage}</p>}
        </form>
      </section>
    </div>
  );
}

function AppointmentModal({ defaultDate, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    date: defaultDate,
    time: "10:00",
    type: "visit",
    title: "",
    related: "",
    detail: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData((current) => ({ ...current, date: defaultDate }));
      setErrorMessage("");
    }
  }, [defaultDate, isOpen]);

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
        date: formData.date,
        detail: formData.detail.trim() || "Dettagli da completare.",
        related: formData.related.trim(),
        time: formData.time,
        title,
        type: formData.type,
      });

      setFormData({
        date: defaultDate,
        time: "10:00",
        type: "visit",
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
            <h2 id="appointment-title">Nuovo appuntamento</h2>
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

          <div className="modal-actions">
            <button className="ghost-button" onClick={onClose} type="button">
              Annulla
            </button>
            <button className="primary-button" disabled={isSaving} type="submit">
              {isSaving ? "Salvataggio" : "Salva appuntamento"}
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
  const [actionError, setActionError] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [currentDate] = useState(() => new Date());
  const [crmState, setCrmState] = useState(initialCrmState);
  const [dataLoading, setDataLoading] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const todayKey = useMemo(() => toDateKey(currentDate), [currentDate]);
  const currentDateLabel = useMemo(() => formatLongDate(currentDate), [currentDate]);
  const pageTitle = navItems.find((item) => item.id === activeView)?.title || "Calendario operativo";
  const userLabel = userProfile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email || "Profilo";
  const sortedAppointments = useMemo(
    () => [...crmState.todayAppointments].sort((first, second) => first.time.localeCompare(second.time)),
    [crmState.todayAppointments],
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

  const handleSaveAppointment = async (appointment) => {
    setActionError("");
    const savedAppointment = await createAppointment(appointment, session.user.id);
    const label = `${savedAppointment.time} ${savedAppointment.title}`;

    setCrmState((current) => ({
      ...current,
      calendarEvents: [
        ...current.calendarEvents,
        {
          date: savedAppointment.date,
          day: savedAppointment.day,
          id: savedAppointment.id,
          label,
          type: savedAppointment.type,
        },
      ],
      todayAppointments:
        savedAppointment.date === todayKey
          ? [...current.todayAppointments, savedAppointment]
          : current.todayAppointments,
    }));

    setIsAppointmentModalOpen(false);
  };

  const handleCreateCustomer = async (customer) => {
    setActionError("");
    const savedCustomer = await createCustomer(customer, session.user.id);

    setCrmState((current) => ({
      ...current,
      customers: [savedCustomer, ...current.customers],
    }));

    return savedCustomer;
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
      <Sidebar activeView={activeView} onViewChange={setActiveView} userLabel={userLabel} />
      <main className="workspace">
        <Topbar
          currentDateLabel={currentDateLabel}
          onEditProfile={() => setIsProfileModalOpen(true)}
          onNewAppointment={() => setIsAppointmentModalOpen(true)}
          onSignOut={handleSignOut}
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
            onCreateCustomer={handleCreateCustomer}
          />
        ) : (
          <DashboardView
            appointments={sortedAppointments}
            currentDate={currentDate}
            crmState={crmState}
            onNewAppointment={() => setIsAppointmentModalOpen(true)}
            todayKey={todayKey}
          />
        )}
      </main>
      <AppointmentModal
        defaultDate={todayKey}
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        onSave={handleSaveAppointment}
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
