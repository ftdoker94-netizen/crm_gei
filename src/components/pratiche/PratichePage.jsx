import { useEffect, useMemo, useState } from "react";
import { History, UserCog, X } from "lucide-react";
import { praticaPriorityLabels } from "../../utils/constants.js";
import { formatCurrency, formatDateLabel, matchesSearch } from "../../utils/format.js";
import { demoUser, fetchPraticheData, moveToNextStep, reassignResponsabile } from "../../services/dataSource.js";

const memberName = (teamMembers, userId) => {
  if (!userId) return "Non assegnato";
  if (userId === demoUser.id) return demoUser.user_metadata.full_name;
  return teamMembers.find((member) => member.id === userId)?.name || "Non assegnato";
};

function storicoLabel(entry, praticaSteps, teamMembers) {
  if (entry.tipo === "creazione") {
    return `Pratica creata, assegnata a ${memberName(teamMembers, entry.responsabileNuovoId)}.`;
  }

  if (entry.tipo === "responsabile") {
    return `Riassegnata da ${memberName(teamMembers, entry.responsabilePrecedenteId)} a ${memberName(teamMembers, entry.responsabileNuovoId)}.`;
  }

  const from = praticaSteps.find((step) => step.id === entry.stepPrecedenteId)?.nome || "—";
  const to = praticaSteps.find((step) => step.id === entry.stepNuovoId)?.nome || "—";
  return `Passata da "${from}" a "${to}".`;
}

export function PratichePage({ currentUserId, customers, searchQuery = "", teamMembers = [] }) {
  const [data, setData] = useState({ pratiche: [], praticaSteps: [], praticaStorico: [], settori: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeSettoreId, setActiveSettoreId] = useState(null);
  const [selectedPraticaId, setSelectedPraticaId] = useState(null);
  const [isReassigning, setIsReassigning] = useState(false);
  const [isMovingStep, setIsMovingStep] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const next = await fetchPraticheData();
      setData(next);
      setActiveSettoreId((current) => current || next.settori[0]?.id);
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a caricare le pratiche.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settoreSteps = useMemo(
    () => data.praticaSteps.filter((step) => step.settoreId === activeSettoreId).sort((a, b) => a.posizione - b.posizione),
    [data.praticaSteps, activeSettoreId],
  );

  const visiblePratiche = useMemo(
    () =>
      data.pratiche
        .filter((pratica) => pratica.settoreId === activeSettoreId)
        .filter((pratica) => {
          const customer = customers.find((item) => item.id === pratica.customerId);
          return matchesSearch(searchQuery, [pratica.titolo, pratica.descrizione, customer?.name, memberName(teamMembers, pratica.responsabileId)]);
        }),
    [activeSettoreId, customers, data.pratiche, searchQuery, teamMembers],
  );

  const praticheByStep = useMemo(
    () =>
      settoreSteps.reduce((groups, step) => {
        groups[step.id] = visiblePratiche.filter((pratica) => pratica.stepAttualeId === step.id);
        return groups;
      }, {}),
    [settoreSteps, visiblePratiche],
  );

  const selectedPratica = data.pratiche.find((item) => item.id === selectedPraticaId) || null;
  const selectedCustomer = customers.find((item) => item.id === selectedPratica?.customerId);
  const selectedStorico = data.praticaStorico
    .filter((entry) => entry.praticaId === selectedPraticaId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const currentStepIndex = settoreSteps.findIndex((step) => step.id === selectedPratica?.stepAttualeId);
  const nextStep = settoreSteps[currentStepIndex + 1];

  const handleMoveNext = async () => {
    if (!selectedPratica || !nextStep) return;
    setIsMovingStep(true);
    setErrorMessage("");
    try {
      await moveToNextStep(selectedPratica.id, nextStep.id, currentUserId, `Spostata a "${nextStep.nome}".`);
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a spostare la pratica.");
    } finally {
      setIsMovingStep(false);
    }
  };

  const handleReassign = async (event) => {
    const newResponsabileId = event.target.value;
    if (!selectedPratica || !newResponsabileId || newResponsabileId === selectedPratica.responsabileId) return;
    setIsReassigning(true);
    setErrorMessage("");
    try {
      await reassignResponsabile(selectedPratica.id, newResponsabileId, currentUserId, `Riassegnata a ${memberName(teamMembers, newResponsabileId)}.`);
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a riassegnare la pratica.");
    } finally {
      setIsReassigning(false);
    }
  };

  if (isLoading) {
    return (
      <section className="opportunities-page">
        <p className="sync-banner">Caricamento pratiche...</p>
      </section>
    );
  }

  return (
    <section className="opportunities-page pratiche-page">
      <section className="opportunities-toolbar panel compact-panel">
        <div>
          <p className="eyebrow">Pratiche</p>
          <h2>Lavorazione per settore</h2>
          <p className="toolbar-support">Segui ogni pratica, chi la sta seguendo ora e lo storico dei passaggi.</p>
        </div>
        <div className="segmented-control opportunity-filters" role="tablist" aria-label="Settore pratiche">
          {data.settori.map((settore) => (
            <button
              className={activeSettoreId === settore.id ? "selected" : ""}
              key={settore.id}
              onClick={() => { setActiveSettoreId(settore.id); setSelectedPraticaId(null); }}
              type="button"
            >
              {settore.nome}
            </button>
          ))}
        </div>
      </section>

      {errorMessage && <p className="form-error workspace-error">{errorMessage}</p>}

      <section className="opportunities-workspace">
        <div className="opportunity-kanban" aria-label="Kanban pratiche">
          {settoreSteps.map((step) => {
            const stepPratiche = praticheByStep[step.id] || [];
            return (
              <section className="opportunity-stage stage-docs" key={step.id} aria-label={step.nome}>
                <header>
                  <span>{step.nome}</span>
                  <strong>{stepPratiche.length}</strong>
                </header>
                <div className="opportunity-stage-list">
                  {stepPratiche.length ? (
                    stepPratiche.map((pratica) => {
                      const customer = customers.find((item) => item.id === pratica.customerId);
                      return (
                        <button
                          className={`opportunity-card ${selectedPraticaId === pratica.id ? "selected" : ""}`}
                          key={pratica.id}
                          onClick={() => setSelectedPraticaId(pratica.id)}
                          type="button"
                        >
                          <div className="opportunity-card-heading">
                            <strong>{pratica.titolo}</strong>
                            <span>{customer?.name || "Cliente non collegato"}</span>
                          </div>
                          <div className="next-action">
                            <span>Responsabile attuale</span>
                            <strong>{memberName(teamMembers, pratica.responsabileId)}</strong>
                          </div>
                          <div className="card-value-row">
                            <span className={`priority-dot priority-${pratica.priorita}`}>{praticaPriorityLabels[pratica.priorita]}</span>
                            <strong>{formatCurrency(pratica.valore)}</strong>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="empty-stage">Nessuna pratica</div>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="panel opportunity-detail-panel" aria-label="Dettaglio pratica">
          {selectedPratica ? (
            <>
              <div className="opportunity-detail-header">
                <div>
                  <p className="eyebrow">{selectedCustomer?.name || "Cliente non collegato"}</p>
                  <h2>{selectedPratica.titolo}</h2>
                </div>
                <button className="icon-button" onClick={() => setSelectedPraticaId(null)} type="button" aria-label="Chiudi dettaglio">
                  <X size={16} />
                </button>
              </div>

              <div className="opportunity-summary-grid compact-summary">
                <div>
                  <span>Step attuale</span>
                  <strong>{settoreSteps.find((step) => step.id === selectedPratica.stepAttualeId)?.nome || "—"}</strong>
                </div>
                <div>
                  <span>Priorità</span>
                  <strong>{praticaPriorityLabels[selectedPratica.priorita]}</strong>
                </div>
                <div>
                  <span>Valore</span>
                  <strong>{formatCurrency(selectedPratica.valore)}</strong>
                </div>
                <div>
                  <span>Scadenza</span>
                  <strong>{formatDateLabel(selectedPratica.scadenza)}</strong>
                </div>
              </div>

              {selectedPratica.descrizione && <p className="opportunity-description">{selectedPratica.descrizione}</p>}

              <div className="stage-control">
                <label>
                  <span>Responsabile attuale</span>
                  <select disabled={isReassigning} onChange={handleReassign} value={selectedPratica.responsabileId || ""}>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                </label>
                <div className="stage-buttons">
                  <button className="primary-button" disabled={!nextStep || isMovingStep} onClick={handleMoveNext} type="button">
                    <UserCog size={15} /> {nextStep ? `Sposta a "${nextStep.nome}"` : "Ultimo step"}
                  </button>
                </div>
              </div>

              <div className="activity-heading">
                <div>
                  <p className="eyebrow">Storico</p>
                  <h3><History size={15} /> Passaggi della pratica</h3>
                </div>
              </div>

              <ol className="opportunity-activity-list">
                {selectedStorico.length ? (
                  selectedStorico.map((entry) => (
                    <li key={entry.id}>
                      <div className="activity-card">
                        <div>
                          <strong>{storicoLabel(entry, data.praticaSteps, teamMembers)}</strong>
                          <span>{entry.nota}</span>
                          <small>{memberName(teamMembers, entry.actorId)} · {new Date(entry.createdAt).toLocaleString("it-IT")}</small>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="empty-list-item">
                    <div>
                      <strong>Nessun passaggio registrato</strong>
                      <span>Muovi la pratica o riassegnala per iniziare lo storico.</span>
                    </div>
                  </li>
                )}
              </ol>
            </>
          ) : (
            <div className="empty-state wide-empty">
              <strong>Nessuna pratica selezionata</strong>
              <span>Seleziona una scheda dal kanban per vedere il dettaglio e lo storico.</span>
            </div>
          )}
        </aside>
      </section>
    </section>
  );
}
