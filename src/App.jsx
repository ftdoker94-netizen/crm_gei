import { useMemo, useState } from "react";
import {
  calendarEvents,
  navItems,
  pipeline,
  projects,
  tasks,
  todayAppointments,
} from "./data.js";

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
  const initialProjectEvents = calendarEvents.filter((event) => event.type === "project").length;
  const initialQuoteEvents = calendarEvents.filter((event) => event.type === "quote").length;
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

function PipelinePanel() {
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
        {pipeline.map((column) => (
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

function ProjectsPanel() {
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
        {projects.map((project) => (
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

function SideColumn({ appointments }) {
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
          {tasks.map((task) => (
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
  const [events, setEvents] = useState(calendarEvents);
  const [appointments, setAppointments] = useState(todayAppointments);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const pageTitle = navItems.find((item) => item.id === activeView)?.title || "Calendario operativo";
  const sortedAppointments = useMemo(
    () => [...appointments].sort((first, second) => first.time.localeCompare(second.time)),
    [appointments],
  );

  const handleSaveAppointment = (appointment) => {
    const label = `${appointment.time} ${appointment.title}`;

    setEvents((current) => [
      ...current,
      {
        day: appointment.day,
        id: appointment.id,
        label,
        type: appointment.type,
      },
    ]);

    if (appointment.day === 16) {
      setAppointments((current) => [...current, appointment]);
    }

    setIsAppointmentModalOpen(false);
  };

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="workspace">
        <Topbar onNewAppointment={() => setIsAppointmentModalOpen(true)} title={pageTitle} />
        <CalendarPanel
          appointments={sortedAppointments}
          events={events}
          onNewAppointment={() => setIsAppointmentModalOpen(true)}
        />
        <StatsGrid appointments={sortedAppointments} events={events} />
        <section className="content-grid">
          <div className="main-column">
            <PipelinePanel />
            <ProjectsPanel />
          </div>
          <SideColumn appointments={sortedAppointments} />
        </section>
      </main>
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        onSave={handleSaveAppointment}
      />
    </div>
  );
}
