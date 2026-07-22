import { useEffect, useMemo, useState } from "react";
import { AssignmentSelector } from "../shared/AssignmentSelector.jsx";
import {
  bidDecisionLabels,
  closedOpportunityStatuses,
  opportunityPipelineStages,
  opportunityPriorities,
  opportunitySources,
  opportunityTypes,
  stepStatuses,
} from "../../utils/constants.js";
import {
  assignmentSummary,
  dueDateTone,
  formatCurrency,
  matchesSearch,
  opportunityStageIndex,
  opportunityStatusLabel,
  userInitials,
} from "../../utils/format.js";

export function OpportunitiesPage({
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
