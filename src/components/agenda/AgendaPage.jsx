import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Plus, X } from "lucide-react";
import { AssignmentSelector } from "../shared/AssignmentSelector.jsx";
import { agendaEventTypes } from "../../utils/constants.js";
import { formatDateLabel, matchesSearch } from "../../utils/format.js";
import { createAgendaEvento, fetchAgendaEventi } from "../../services/dataSource.js";

const eventTypeLabel = (value) => agendaEventTypes.find((type) => type.value === value)?.label || "Altro";

export function AgendaPage({ currentUserId, opportunities = [], searchQuery = "", teamMembers = [] }) {
  const [eventi, setEventi] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    data: new Date().toISOString().slice(0, 10),
    descrizione: "",
    opportunityId: "",
    ora: "10:00",
    partecipantiIds: [],
    tipo: "riunione",
    titolo: "",
  });

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      setEventi(await fetchAgendaEventi());
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a caricare l'agenda condivisa.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const visibleEventi = useMemo(
    () =>
      [...eventi]
        .filter((evento) => matchesSearch(searchQuery, [evento.titolo, evento.descrizione, eventTypeLabel(evento.tipo)]))
        .sort((a, b) => `${a.data}${a.ora}`.localeCompare(`${b.data}${b.ora}`)),
    [eventi, searchQuery],
  );

  const eventiByDate = useMemo(
    () =>
      visibleEventi.reduce((groups, evento) => {
        groups[evento.data] = [...(groups[evento.data] || []), evento];
        return groups;
      }, {}),
    [visibleEventi],
  );

  const openForm = () => {
    setFormData({
      data: new Date().toISOString().slice(0, 10),
      descrizione: "",
      opportunityId: "",
      ora: "10:00",
      partecipantiIds: [],
      tipo: "riunione",
      titolo: "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.titolo.trim()) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      await createAgendaEvento(
        {
          data: formData.data,
          descrizione: formData.descrizione.trim(),
          opportunityId: formData.opportunityId || null,
          ora: formData.ora,
          partecipantiIds: formData.partecipantiIds,
          tipo: formData.tipo,
          titolo: formData.titolo.trim(),
        },
        currentUserId,
      );
      setIsFormOpen(false);
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a salvare l'evento.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="opportunities-page">
        <p className="sync-banner">Caricamento agenda...</p>
      </section>
    );
  }

  return (
    <section className="opportunities-page">
      <section className="opportunities-toolbar panel compact-panel">
        <div>
          <p className="eyebrow">Team GEI</p>
          <h2>Agenda condivisa</h2>
          <p className="toolbar-support">Eventi di tutti i collaboratori, agganciabili a un'opportunità.</p>
        </div>
        <div className="opportunities-toolbar-actions">
          <button className="primary-button" onClick={openForm} type="button">
            <Plus size={17} /> Nuovo evento
          </button>
        </div>
      </section>

      {errorMessage && <p className="form-error workspace-error">{errorMessage}</p>}

      <section className="panel">
        <div className="customer-timeline agenda-timeline">
          {Object.keys(eventiByDate).length ? (
            Object.entries(eventiByDate).map(([data, dayEventi]) => (
              <div className="linked-section" key={data}>
                <h3><CalendarClock size={16} /> {formatDateLabel(data)}</h3>
                <ol className="opportunity-activity-list">
                  {dayEventi.map((evento) => {
                    const opportunity = opportunities.find((item) => item.id === evento.opportunityId);
                    return (
                      <li key={evento.id}>
                        <div className="activity-card">
                          <div>
                            <strong>{evento.ora} · {evento.titolo}</strong>
                            <span>{evento.descrizione || "Nessuna descrizione"}</span>
                            <small>
                              {eventTypeLabel(evento.tipo)}
                              {opportunity ? ` · Opportunità: ${opportunity.title}` : ""}
                              {evento.partecipanti?.length ? ` · ${evento.partecipanti.map((p) => p.userName).join(", ")}` : ""}
                            </small>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))
          ) : (
            <div className="empty-state wide-empty">
              <strong>Nessun evento in agenda</strong>
              <span>Crea il primo evento condiviso per il team.</span>
            </div>
          )}
        </div>
      </section>

      {isFormOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="appointment-modal" aria-labelledby="agenda-modal-title" role="dialog" aria-modal="true">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Agenda</p>
                <h2 id="agenda-modal-title">Nuovo evento</h2>
              </div>
              <button className="icon-button" onClick={() => setIsFormOpen(false)} type="button" aria-label="Chiudi">
                <X size={18} />
              </button>
            </div>
            <form className="appointment-form" onSubmit={handleSubmit}>
              <label>
                <span>Titolo</span>
                <input
                  onChange={(event) => setFormData((current) => ({ ...current, titolo: event.target.value }))}
                  placeholder="Es. Sopralluogo tecnico"
                  required
                  value={formData.titolo}
                />
              </label>
              <div className="form-grid">
                <label>
                  <span>Data</span>
                  <input onChange={(event) => setFormData((current) => ({ ...current, data: event.target.value }))} required type="date" value={formData.data} />
                </label>
                <label>
                  <span>Ora</span>
                  <input onChange={(event) => setFormData((current) => ({ ...current, ora: event.target.value }))} type="time" value={formData.ora} />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  <span>Tipo</span>
                  <select onChange={(event) => setFormData((current) => ({ ...current, tipo: event.target.value }))} value={formData.tipo}>
                    {agendaEventTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Opportunità collegata</span>
                  <select onChange={(event) => setFormData((current) => ({ ...current, opportunityId: event.target.value }))} value={formData.opportunityId}>
                    <option value="">Nessuna opportunità</option>
                    {opportunities.map((opportunity) => (
                      <option key={opportunity.id} value={opportunity.id}>{opportunity.title}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                <span>Descrizione</span>
                <textarea
                  onChange={(event) => setFormData((current) => ({ ...current, descrizione: event.target.value }))}
                  placeholder="Dettagli dell'evento..."
                  rows="3"
                  value={formData.descrizione}
                />
              </label>
              <AssignmentSelector
                onChange={(partecipantiIds) => setFormData((current) => ({ ...current, partecipantiIds }))}
                selectedUserIds={formData.partecipantiIds}
                teamMembers={teamMembers}
              />
              <div className="modal-actions">
                <button className="ghost-button" onClick={() => setIsFormOpen(false)} type="button">Annulla</button>
                <button className="primary-button" disabled={isSaving} type="submit">{isSaving ? "Salvataggio" : "Salva evento"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
