import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { appointmentTypes } from "../../utils/constants.js";
import {
  appointmentTypeLabel,
  assignmentSummary,
  formatDateLabel,
  formatLongDate,
  formatMonthYear,
  fromDateKey,
  matchesSearch,
  praticaUrgencyTone,
  toDateKey,
} from "../../utils/format.js";
import { fetchPraticheData } from "../../services/dataSource.js";

const PRATICA_CRITICAL_DAYS = 2;
const PRATICA_SCADENZA_SOON_DAYS = 7;
const MAX_URGENT_PRATICHE = 8;

const URGENCY_LABELS = {
  critical: "Urgente",
  neutral: "Nella norma",
  overdue: "In ritardo",
  soon: "In scadenza",
};

function PraticheOverviewPanel({ customers, onOpenPratica }) {
  const [data, setData] = useState({ pratiche: [], settori: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetchPraticheData()
      .then((next) => {
        if (isMounted) setData(next);
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(error.message || "Non sono riuscito a caricare le pratiche.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const openPratiche = useMemo(() => data.pratiche.filter((pratica) => pratica.stato === "aperta"), [data.pratiche]);

  const countsBySettore = useMemo(
    () =>
      data.settori.map((settore) => ({
        ...settore,
        count: openPratiche.filter((pratica) => pratica.settoreId === settore.id).length,
      })),
    [data.settori, openPratiche],
  );

  const urgencyCounts = useMemo(() => {
    const counts = { critical: 0, neutral: 0, overdue: 0, soon: 0 };
    openPratiche.forEach((pratica) => {
      counts[praticaUrgencyTone(pratica.scadenza, { criticalDays: PRATICA_CRITICAL_DAYS, soonDays: PRATICA_SCADENZA_SOON_DAYS })] += 1;
    });
    return counts;
  }, [openPratiche]);

  const urgentTodayCount = urgencyCounts.overdue + urgencyCounts.critical;

  const urgentPratiche = useMemo(
    () =>
      openPratiche
        .filter((pratica) => pratica.scadenza)
        .sort((first, second) => fromDateKey(first.scadenza) - fromDateKey(second.scadenza))
        .slice(0, MAX_URGENT_PRATICHE),
    [openPratiche],
  );

  const settoreName = (settoreId) => data.settori.find((settore) => settore.id === settoreId)?.nome || "—";
  const customerName = (customerId) => customers.find((customer) => customer.id === customerId)?.name || "Cliente non collegato";

  return (
    <section className="panel pratiche-overview-panel" aria-label="Riepilogo pratiche">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Controllo pratiche</p>
          <h2>Pratiche aperte per settore</h2>
        </div>
        <div className="pratiche-urgency-summary">
          {urgentTodayCount > 0 && (
            <span className="due-date due-critical urgent-callout" role="status">
              <AlertTriangle aria-hidden="true" size={14} />
              {urgentTodayCount} urgenti (oggi/domani o in ritardo)
            </span>
          )}
          <span className="due-date due-overdue">{urgencyCounts.overdue} in ritardo</span>
          <span className="due-date due-soon">{urgencyCounts.soon} entro {PRATICA_SCADENZA_SOON_DAYS} giorni</span>
          <span className="due-date">{urgencyCounts.neutral} nella norma</span>
        </div>
      </div>

      {errorMessage && <p className="form-error">{errorMessage}</p>}

      {isLoading ? (
        <p className="sync-banner">Caricamento pratiche...</p>
      ) : (
        <>
          <div className="quick-stats compact-stats pratiche-settore-stats" aria-label="Pratiche aperte per settore">
            {countsBySettore.length ? (
              countsBySettore.map((settore) => (
                <article className="stat-card" key={settore.id}>
                  <span>{settore.nome}</span>
                  <strong>{settore.count}</strong>
                  <small>Pratiche aperte</small>
                </article>
              ))
            ) : (
              <div className="empty-state compact-empty">
                <strong>Nessun settore configurato</strong>
              </div>
            )}
          </div>

          <div className="activity-heading">
            <div>
              <p className="eyebrow">Urgenze</p>
              <h3>Pratiche più vicine alla scadenza</h3>
            </div>
          </div>

          <ol className="opportunity-activity-list">
            {urgentPratiche.length ? (
              urgentPratiche.map((pratica) => {
                const tone = praticaUrgencyTone(pratica.scadenza, { criticalDays: PRATICA_CRITICAL_DAYS, soonDays: PRATICA_SCADENZA_SOON_DAYS });
                return (
                  <li key={pratica.id}>
                    <button className="activity-card" onClick={() => onOpenPratica(pratica.id)} type="button">
                      <div>
                        <strong>{pratica.titolo}</strong>
                        <span>{settoreName(pratica.settoreId)} · {customerName(pratica.customerId)}</span>
                        <small>Scadenza: {formatDateLabel(pratica.scadenza)}</small>
                      </div>
                      <span className={`due-date due-${tone}`}>
                        {(tone === "overdue" || tone === "critical") && <AlertTriangle aria-hidden="true" size={12} />}
                        {URGENCY_LABELS[tone]}
                      </span>
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="empty-list-item">
                <div>
                  <strong>Nessuna pratica con scadenza imminente</strong>
                  <span>Le pratiche aperte senza scadenza non compaiono in questa lista.</span>
                </div>
              </li>
            )}
          </ol>
        </>
      )}
    </section>
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

export function DashboardView({
  appointments,
  crmState,
  currentDate,
  onEditAppointment,
  onMonthChange,
  onNewAppointment,
  onOpenPratica,
  onSelectAppointment,
  selectedAppointment,
  selectedAppointmentId,
  searchQuery = "",
  todayKey,
  visibleMonth,
}) {
  return (
    <>
      <PraticheOverviewPanel customers={crmState.customers} onOpenPratica={onOpenPratica} />
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
