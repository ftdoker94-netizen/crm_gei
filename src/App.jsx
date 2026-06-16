import { useMemo, useState } from "react";
import { navItems } from "./data.js";
import { initialCrmState } from "./store/seedData.js";

function Sidebar({ activeView, onViewChange }) {
  return (
    <aside className="sidebar" aria-label="Navigazione principale">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          CE
        </div>
        <div>
          <strong>CRM Edile</strong>
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
          <span>8 attività oggi</span>
        </div>
      </div>
    </aside>
  );
}

const appointmentTypes = [
  { value: "visit", label: "Sopralluogo" },
  { value: "project", label: "Cantiere / progetto" },
  { value: "quote", label: "Preventivo" },
  { value: "call", label: "Telefonata / follow-up" },
];

const customerTypes = ["Privato", "Condominio", "Amministratore", "Azienda"];
const customerStatuses = ["Nuova richiesta", "Sopralluogo", "Preventivo", "Cantiere attivo", "Accettato"];

function Topbar({ onNewAppointment, title }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Martedì, 16 giugno 2026</p>
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
        <button className="primary-button" onClick={onNewAppointment} type="button">
          Nuovo lavoro
        </button>
      </div>
    </header>
  );
}

function CalendarPanel({ appointments, events, onNewAppointment }) {
  const eventsByDay = useMemo(
    () =>
      events.reduce((days, event) => {
        days[event.day] = [...(days[event.day] || []), event];
        return days;
      }, {}),
    [events],
  );

  return (
    <section className="panel calendar-panel" aria-label="Calendario operativo">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Agenda lavori</p>
          <h2>Giugno 2026</h2>
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
        <div className="calendar-board" aria-label="Mese di giugno">
          {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((day) => (
            <div className="weekday" key={day}>
              {day}
            </div>
          ))}

          {Array.from({ length: 28 }, (_, index) => {
            const day = index + 1;
            return (
              <article
                className={`calendar-day ${day === 1 ? "muted-day" : ""} ${day === 16 ? "today" : ""}`}
                key={day}
              >
                <time>{day}</time>
                {(eventsByDay[day] || []).map((event) => (
                  <span className={`event-pill ${event.type}`} key={`${event.type}-${event.label}`}>
                    {event.label}
                  </span>
                ))}
              </article>
            );
          })}
        </div>

        <aside className="today-focus" aria-label="Dettaglio appuntamenti di oggi">
          <p className="eyebrow">Focus di oggi</p>
          <h2>Martedì 16 giugno</h2>
          <ol className="focus-list">
            {appointments.map((appointment) => (
              <li key={appointment.id || `${appointment.time}-${appointment.title}`}>
                <time>{appointment.time}</time>
                <div>
                  <strong>{appointment.title}</strong>
                  <span>{appointment.detail}</span>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}

function StatsGrid({ appointments, events }) {
  const visitAppointments = appointments.filter((item) => item.type === "visit").length;
  const otherAppointments = appointments.length - visitAppointments;
  const initialProjectEvents = initialCrmState.calendarEvents.filter((event) => event.type === "project").length;
  const initialQuoteEvents = initialCrmState.calendarEvents.filter((event) => event.type === "quote").length;
  const projectEvents = events.filter((event) => event.type === "project").length - initialProjectEvents;
  const quoteEvents = events.filter((event) => event.type === "quote").length - initialQuoteEvents;
  const dynamicStats = [
    {
      label: "Appuntamenti oggi",
      value: appointments.length,
      note: `${visitAppointments} sopralluoghi, ${otherAppointments} follow-up/attività`,
    },
    { label: "Progetti da seguire", value: 11 + projectEvents, note: "4 con scadenza entro 7 giorni" },
    { label: "Preventivi in attesa", value: 12 + quoteEvents, note: "€ 186k valore aperto" },
    { label: "Cantieri attivi", value: "9", note: "3 con priorità alta" },
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
        {pipelineItems.map((column) => (
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
        ))}
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
        {projectItems.map((project) => (
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
        ))}
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
          {appointments.map((appointment) => (
            <li key={appointment.id || `${appointment.time}-${appointment.title}`}>
              <time>{appointment.time}</time>
              <div>
                <strong>{appointment.title}</strong>
                <span>{appointment.detail}</span>
              </div>
            </li>
          ))}
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
          {taskItems.map((task) => (
            <label key={task.label}>
              <input type="checkbox" defaultChecked={task.done} />
              <span>{task.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="panel compact-panel highlight-panel">
        <p className="eyebrow">Suggerimento</p>
        <h2>3 preventivi sono fermi da oltre 7 giorni</h2>
        <p>Programma un follow-up con i clienti prima della fine settimana.</p>
        <button className="primary-button full-width" type="button">
          Crea promemoria
        </button>
      </section>
    </aside>
  );
}

function DashboardView({ appointments, crmState, onNewAppointment }) {
  return (
    <>
      <CalendarPanel
        appointments={appointments}
        events={crmState.calendarEvents}
        onNewAppointment={onNewAppointment}
      />
      <StatsGrid appointments={appointments} events={crmState.calendarEvents} />
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

function CustomersPage({ customers, onCreateCustomer }) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || customers[0];
  const activeCustomers = customers.filter((customer) => customer.status.includes("attivo")).length;
  const condomini = customers.filter((customer) => customer.type === "Condominio").length;

  const handleSaveCustomer = (customer) => {
    onCreateCustomer(customer);
    setSelectedCustomerId(customer.id);
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
          <strong>€ 190k</strong>
          <small>Stima da preventivi e cantieri</small>
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

          <div className="customers-list" role="list">
            {customers.map((customer) => (
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
            ))}
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

  const handleSubmit = (event) => {
    event.preventDefault();
    const name = formData.name.trim();
    const primaryContact = formData.primaryContact.trim();

    if (!name || !primaryContact) {
      return;
    }

    onSave({
      address: formData.address.trim() || "Indirizzo da completare",
      email: formData.email.trim() || "email@example.it",
      id: crypto.randomUUID(),
      lastContact: "16 giugno 2026",
      name,
      openValue: formData.openValue.trim() || "€ 0",
      phone: formData.phone.trim() || "Da inserire",
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
            <button className="primary-button" type="submit">
              Salva cliente
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function AppointmentModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    day: "16",
    time: "10:00",
    type: "visit",
    title: "",
    related: "",
    detail: "",
  });

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const title = formData.title.trim();

    if (!title) {
      return;
    }

    onSave({
      day: Number(formData.day),
      detail: formData.detail.trim() || "Dettagli da completare.",
      id: crypto.randomUUID(),
      related: formData.related.trim(),
      time: formData.time,
      title,
      type: formData.type,
    });

    setFormData({
      day: "16",
      time: "10:00",
      type: "visit",
      title: "",
      related: "",
      detail: "",
    });
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
              <span>Giorno</span>
              <select name="day" onChange={handleChange} value={formData.day}>
                {Array.from({ length: 28 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {index + 1} giugno
                  </option>
                ))}
              </select>
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
            <button className="primary-button" type="submit">
              Salva appuntamento
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [crmState, setCrmState] = useState(initialCrmState);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const pageTitle = navItems.find((item) => item.id === activeView)?.title || "Calendario operativo";
  const sortedAppointments = useMemo(
    () => [...crmState.todayAppointments].sort((first, second) => first.time.localeCompare(second.time)),
    [crmState.todayAppointments],
  );

  const handleSaveAppointment = (appointment) => {
    const label = `${appointment.time} ${appointment.title}`;

    setCrmState((current) => ({
      ...current,
      calendarEvents: [
        ...current.calendarEvents,
        {
          day: appointment.day,
          id: appointment.id,
          label,
          type: appointment.type,
        },
      ],
      todayAppointments:
        appointment.day === 16 ? [...current.todayAppointments, appointment] : current.todayAppointments,
    }));

    setIsAppointmentModalOpen(false);
  };

  const handleCreateCustomer = (customer) => {
    setCrmState((current) => ({
      ...current,
      customers: [...current.customers, customer],
    }));
  };

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="workspace">
        <Topbar onNewAppointment={() => setIsAppointmentModalOpen(true)} title={pageTitle} />
        {activeView === "clienti" ? (
          <CustomersPage customers={crmState.customers} onCreateCustomer={handleCreateCustomer} />
        ) : (
          <DashboardView
            appointments={sortedAppointments}
            crmState={crmState}
            onNewAppointment={() => setIsAppointmentModalOpen(true)}
          />
        )}
      </main>
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        onSave={handleSaveAppointment}
      />
    </div>
  );
}
