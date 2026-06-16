import { useMemo, useState } from "react";
import {
  calendarEvents,
  navItems,
  pipeline,
  projects,
  stats,
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

function Topbar({ title }) {
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
        <button className="primary-button" type="button">
          Nuovo lavoro
        </button>
      </div>
    </header>
  );
}

function CalendarPanel() {
  const eventsByDay = useMemo(
    () =>
      calendarEvents.reduce((days, event) => {
        days[event.day] = [...(days[event.day] || []), event];
        return days;
      }, {}),
    [],
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
          <button className="primary-button" type="button">
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
            {todayAppointments.map((appointment) => (
              <li key={`${appointment.time}-${appointment.title}`}>
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

function StatsGrid() {
  return (
    <section className="quick-stats compact-stats" aria-label="Indicatori principali">
      {stats.map((stat) => (
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

function SideColumn() {
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
          {todayAppointments.map((appointment) => (
            <li key={`${appointment.time}-${appointment.title}`}>
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

export default function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const pageTitle = navItems.find((item) => item.id === activeView)?.title || "Calendario operativo";

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="workspace">
        <Topbar title={pageTitle} />
        <CalendarPanel />
        <StatsGrid />
        <section className="content-grid">
          <div className="main-column">
            <PipelinePanel />
            <ProjectsPanel />
          </div>
          <SideColumn />
        </section>
      </main>
    </div>
  );
}
