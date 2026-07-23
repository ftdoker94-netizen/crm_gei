import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, History, Mail, Plus, Trash2, UploadCloud, UserCog, X } from "lucide-react";
import { praticaPriorityLabels, praticaPriorities } from "../../utils/constants.js";
import { formatCurrency, formatDateLabel, matchesSearch } from "../../utils/format.js";
import { importComputoFile } from "../../utils/computoImport.js";
import { downloadPraticheCsv } from "../../utils/praticheExport.js";
import {
  createPratica,
  createPraticaDocumento,
  deletePraticaDocumento,
  fetchPraticaDocumenti,
  fetchPraticheData,
  getDemoActorId,
  isDemoMode,
  moveToNextStep,
  previewPraticheDigest,
  reassignResponsabile,
  setDemoActorId,
} from "../../services/dataSource.js";

// Etichette dei ruoli usate solo dal selettore "Vista come" in modalità demo;
// rispecchiano crm_profiles.ruolo / la migrazione RLS in supabase/migrations.
const ROLE_LABELS = {
  admin: "Admin",
  collaboratore: "Collaboratore",
  responsabile_settore: "Responsabile di settore",
};

const memberName = (teamMembers, userId) => teamMembers.find((member) => member.id === userId)?.name || "Non assegnato";

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

export function PratichePage({ currentUserId, customers, deepLinkPraticaId, onDeepLinkHandled, searchQuery = "", teamMembers = [] }) {
  const [data, setData] = useState({ pratiche: [], praticaSteps: [], praticaStorico: [], settori: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeSettoreId, setActiveSettoreId] = useState(null);
  const [selectedPraticaId, setSelectedPraticaId] = useState(null);
  const [isReassigning, setIsReassigning] = useState(false);
  const [isMovingStep, setIsMovingStep] = useState(false);
  const [viewAsId, setViewAsId] = useState(() => (isDemoMode ? getDemoActorId() : null));
  const [documenti, setDocumenti] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingPratica, setIsCreatingPratica] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState({
    customerId: "",
    descrizione: "",
    priorita: "media",
    responsabileId: "",
    scadenza: "",
    titolo: "",
    valore: "",
  });
  const [digestPreview, setDigestPreview] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportForm, setExportForm] = useState({ responsabileId: "", scadenzaDa: "", scadenzaA: "", settoreId: "" });
  const fileInputRef = useRef(null);

  const effectiveActorId = isDemoMode ? viewAsId : currentUserId;

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

  useEffect(() => {
    if (!deepLinkPraticaId || isLoading) return;
    const pratica = data.pratiche.find((item) => item.id === deepLinkPraticaId);
    if (pratica) {
      setActiveSettoreId(pratica.settoreId);
      setSelectedPraticaId(pratica.id);
    }
    onDeepLinkHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkPraticaId, isLoading, data.pratiche]);

  const handleViewAsChange = async (event) => {
    const nextActorId = event.target.value;
    setDemoActorId(nextActorId);
    setViewAsId(nextActorId);
    setSelectedPraticaId(null);
    await loadData();
  };

  const handlePreviewDigest = () => {
    const preview = previewPraticheDigest(effectiveActorId);
    // eslint-disable-next-line no-console
    console.log("[digest email simulata]", preview);
    setDigestPreview(preview);
  };

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

  useEffect(() => {
    if (!selectedPraticaId) {
      setDocumenti([]);
      return;
    }

    let isMounted = true;
    setIsLoadingDocs(true);
    setUploadMessage("");

    fetchPraticaDocumenti(selectedPraticaId)
      .then((next) => {
        if (isMounted) setDocumenti(next);
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(error.message || "Non sono riuscito a caricare i documenti della pratica.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingDocs(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedPraticaId]);

  const handleMoveNext = async () => {
    if (!selectedPratica || !nextStep) return;
    setIsMovingStep(true);
    setErrorMessage("");
    try {
      await moveToNextStep(selectedPratica.id, nextStep.id, effectiveActorId, `Spostata a "${nextStep.nome}".`);
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
      await reassignResponsabile(selectedPratica.id, newResponsabileId, effectiveActorId, `Riassegnata a ${memberName(teamMembers, newResponsabileId)}.`);
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a riassegnare la pratica.");
    } finally {
      setIsReassigning(false);
    }
  };

  const openCreateModal = () => {
    setCreateForm({
      customerId: "",
      descrizione: "",
      priorita: "media",
      responsabileId: effectiveActorId || "",
      scadenza: "",
      titolo: "",
      valore: "",
    });
    setCreateError("");
    setIsCreateModalOpen(true);
  };

  const handleCreatePratica = async (event) => {
    event.preventDefault();
    const titolo = createForm.titolo.trim();
    if (!titolo) return;
    setIsCreatingPratica(true);
    setCreateError("");
    try {
      await createPratica(
        {
          customerId: createForm.customerId || null,
          descrizione: createForm.descrizione.trim(),
          priorita: createForm.priorita,
          responsabileId: createForm.responsabileId || effectiveActorId,
          scadenza: createForm.scadenza || null,
          settoreId: activeSettoreId,
          titolo,
          valore: createForm.valore,
        },
        effectiveActorId,
      );
      setIsCreateModalOpen(false);
      await loadData();
    } catch (error) {
      setCreateError(error.message || "Non sono riuscito a creare la pratica.");
    } finally {
      setIsCreatingPratica(false);
    }
  };

  const handleExportSubmit = (event) => {
    event.preventDefault();
    const filtered = data.pratiche.filter((pratica) => {
      if (exportForm.settoreId && pratica.settoreId !== exportForm.settoreId) return false;
      if (exportForm.responsabileId && pratica.responsabileId !== exportForm.responsabileId) return false;
      if (exportForm.scadenzaDa && (!pratica.scadenza || pratica.scadenza < exportForm.scadenzaDa)) return false;
      if (exportForm.scadenzaA && (!pratica.scadenza || pratica.scadenza > exportForm.scadenzaA)) return false;
      return true;
    });

    downloadPraticheCsv(filtered, { customers, praticaSteps: data.praticaSteps, settori: data.settori, teamMembers }, `pratiche-${new Date().toISOString().slice(0, 10)}.csv`);
    setIsExportModalOpen(false);
  };

  const handleDeleteDocument = async (documentId) => {
    setErrorMessage("");
    try {
      await deletePraticaDocumento(documentId);
      setDocumenti((current) => current.filter((doc) => doc.id !== documentId));
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a eliminare il documento.");
    }
  };

  const handleDocumentUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedPratica) return;
    setIsUploading(true);
    setUploadMessage("Analisi del file in corso...");
    setErrorMessage("");

    try {
      const imported = await importComputoFile(file, ({ progress, status }) => {
        const percentage = Math.round((Number(progress) || 0) * 100);
        setUploadMessage(`OCR ${percentage}% · ${status || "riconoscimento in corso"}`);
      });
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const created = await createPraticaDocumento(
        {
          datiEstratti: { items: imported.items, usedOcr: imported.usedOcr, warnings: imported.warnings || [] },
          nome: file.name,
          praticaId: selectedPratica.id,
          tipo: extension,
        },
        effectiveActorId,
      );
      setDocumenti((current) => [created, ...current]);
      setUploadMessage(`${imported.items.length} voci riconosciute da ${file.name}${imported.usedOcr ? " tramite OCR" : ""}`);
    } catch (error) {
      setUploadMessage("");
      setErrorMessage(error.message || "Non sono riuscito a leggere il documento.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
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
        <div className="opportunities-toolbar-actions">
          {isDemoMode && (
            <label className="filter-field" title="Solo in modalità demo: verifica la visibilità per ruolo senza Supabase.">
              <span>Vista come</span>
              <select onChange={handleViewAsChange} value={viewAsId || ""}>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} · {ROLE_LABELS[member.ruolo] || member.ruolo}
                  </option>
                ))}
              </select>
            </label>
          )}
          {isDemoMode && (
            <button
              className="ghost-button"
              onClick={handlePreviewDigest}
              title="In produzione questo digest parte da solo ogni giorno via Supabase Edge Function; qui simuliamo solo il contenuto."
              type="button"
            >
              <Mail size={16} /> Anteprima digest email
            </button>
          )}
          <button className="ghost-button" onClick={() => setIsExportModalOpen(true)} type="button">
            <Download size={16} /> Esporta
          </button>
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
          <button className="primary-button" onClick={openCreateModal} type="button">
            <Plus size={17} /> Nuova pratica
          </button>
        </div>
      </section>

      {errorMessage && <p className="form-error workspace-error">{errorMessage}</p>}

      {digestPreview && (
        <section className="panel compact-panel digest-preview-banner" aria-label="Anteprima digest email">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Simulazione (modalità demo, nessuna email reale inviata)</p>
              <h3>
                <Mail size={16} /> Digest per {digestPreview.actor?.name || "utente sconosciuto"}: {digestPreview.pratiche.length} pratiche urgenti
              </h3>
            </div>
            <button className="icon-button" onClick={() => setDigestPreview(null)} type="button" aria-label="Chiudi anteprima">
              <X size={16} />
            </button>
          </div>
          {digestPreview.pratiche.length ? (
            <ol className="opportunity-activity-list">
              {digestPreview.pratiche.map((pratica) => (
                <li key={pratica.id}>
                  <div className="activity-card">
                    <div>
                      <strong>{pratica.titolo}</strong>
                      <span>{pratica.settoreNome} · {pratica.customerNome}</span>
                      <small>Scadenza: {formatDateLabel(pratica.scadenza)}</small>
                    </div>
                    <span className={`due-date ${pratica.overdue ? "due-overdue" : "due-soon"}`}>
                      {pratica.overdue ? "In ritardo" : "In scadenza"}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="field-help">Nessuna pratica urgente per questo utente oggi: non verrebbe inviata nessuna email.</p>
          )}
        </section>
      )}

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

              <div className="activity-heading">
                <div>
                  <p className="eyebrow">Documenti</p>
                  <h3><FileText size={15} /> Computi e documenti della pratica</h3>
                </div>
                <input
                  accept=".pdf,.xlsx,.csv,.jpg,.jpeg,.png,.webp,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,image/jpeg,image/png,image/webp"
                  aria-label="Carica documento pratica"
                  className="visually-hidden"
                  onChange={handleDocumentUpload}
                  ref={fileInputRef}
                  type="file"
                />
                <button className="computo-upload-button" disabled={isUploading} onClick={() => fileInputRef.current?.click()} type="button">
                  <UploadCloud size={15} /> {isUploading ? "Doppia lettura OCR..." : "Carica documento"}
                </button>
              </div>
              {uploadMessage && <div className="computo-import-success"><FileText size={16} /> {uploadMessage}</div>}

              <ol className="opportunity-activity-list">
                {isLoadingDocs ? (
                  <li className="empty-list-item">
                    <div><strong>Caricamento documenti...</strong></div>
                  </li>
                ) : documenti.length ? (
                  documenti.map((doc) => (
                    <li key={doc.id}>
                      <div className="activity-card">
                        <div>
                          <strong>{doc.nome}</strong>
                          <span>
                            {doc.datiEstratti?.items?.length
                              ? `${doc.datiEstratti.items.length} voci riconosciute${doc.datiEstratti.usedOcr ? " tramite OCR" : ""}`
                              : "Nessuna voce estratta"}
                          </span>
                          <small>{memberName(teamMembers, doc.caricatoDa)} · {new Date(doc.createdAt).toLocaleString("it-IT")}</small>
                        </div>
                        <button aria-label={`Elimina documento ${doc.nome}`} className="icon-button danger-button" onClick={() => handleDeleteDocument(doc.id)} type="button">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="empty-list-item">
                    <div>
                      <strong>Nessun documento caricato</strong>
                      <span>Carica un computo metrico o un preventivo ricevuto per questa pratica.</span>
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

      {isCreateModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="appointment-modal" aria-labelledby="pratica-modal-title" role="dialog" aria-modal="true">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">{data.settori.find((settore) => settore.id === activeSettoreId)?.nome}</p>
                <h2 id="pratica-modal-title">Nuova pratica</h2>
              </div>
              <button className="icon-button" onClick={() => setIsCreateModalOpen(false)} type="button" aria-label="Chiudi">
                <X size={18} />
              </button>
            </div>

            <form className="appointment-form" onSubmit={handleCreatePratica}>
              <label>
                <span>Titolo pratica</span>
                <input
                  onChange={(event) => setCreateForm((current) => ({ ...current, titolo: event.target.value }))}
                  placeholder="Es. Mutuo prima casa Sig. Rossi"
                  required
                  value={createForm.titolo}
                />
              </label>

              <div className="form-grid">
                <label>
                  <span>Cliente collegato</span>
                  <select onChange={(event) => setCreateForm((current) => ({ ...current, customerId: event.target.value }))} value={createForm.customerId}>
                    <option value="">Nessun cliente</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Responsabile</span>
                  <select onChange={(event) => setCreateForm((current) => ({ ...current, responsabileId: event.target.value }))} value={createForm.responsabileId}>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-grid">
                <label>
                  <span>Priorità</span>
                  <select onChange={(event) => setCreateForm((current) => ({ ...current, priorita: event.target.value }))} value={createForm.priorita}>
                    {praticaPriorities.map((priority) => (
                      <option key={priority} value={priority}>{praticaPriorityLabels[priority]}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Valore</span>
                  <input onChange={(event) => setCreateForm((current) => ({ ...current, valore: event.target.value }))} placeholder="Es. 15000" value={createForm.valore} />
                </label>
              </div>

              <label>
                <span>Scadenza</span>
                <input onChange={(event) => setCreateForm((current) => ({ ...current, scadenza: event.target.value }))} type="date" value={createForm.scadenza} />
              </label>

              <label>
                <span>Descrizione</span>
                <textarea
                  onChange={(event) => setCreateForm((current) => ({ ...current, descrizione: event.target.value }))}
                  placeholder="Contesto della pratica, documenti attesi..."
                  rows="3"
                  value={createForm.descrizione}
                />
              </label>

              {createError && <p className="form-error">{createError}</p>}

              <div className="modal-actions">
                <button className="ghost-button" onClick={() => setIsCreateModalOpen(false)} type="button">Annulla</button>
                <button className="primary-button" disabled={isCreatingPratica} type="submit">
                  {isCreatingPratica ? "Creazione..." : "Crea pratica"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {isExportModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="appointment-modal" aria-labelledby="export-pratiche-title" role="dialog" aria-modal="true">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Pratiche</p>
                <h2 id="export-pratiche-title">Esporta CSV</h2>
              </div>
              <button className="icon-button" onClick={() => setIsExportModalOpen(false)} type="button" aria-label="Chiudi">
                <X size={18} />
              </button>
            </div>

            <form className="appointment-form" onSubmit={handleExportSubmit}>
              <p className="field-help">
                Esporta le pratiche a cui hai accesso (settore, titolo, cliente, step, responsabile, priorità, valore, scadenza, data creazione).
                Lascia vuoti i filtri per esportare tutto.
              </p>

              <label>
                <span>Settore</span>
                <select onChange={(event) => setExportForm((current) => ({ ...current, settoreId: event.target.value }))} value={exportForm.settoreId}>
                  <option value="">Tutti i settori</option>
                  {data.settori.map((settore) => (
                    <option key={settore.id} value={settore.id}>{settore.nome}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Responsabile</span>
                <select onChange={(event) => setExportForm((current) => ({ ...current, responsabileId: event.target.value }))} value={exportForm.responsabileId}>
                  <option value="">Tutti i responsabili</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </label>

              <div className="form-grid">
                <label>
                  <span>Scadenza da</span>
                  <input onChange={(event) => setExportForm((current) => ({ ...current, scadenzaDa: event.target.value }))} type="date" value={exportForm.scadenzaDa} />
                </label>
                <label>
                  <span>Scadenza a</span>
                  <input onChange={(event) => setExportForm((current) => ({ ...current, scadenzaA: event.target.value }))} type="date" value={exportForm.scadenzaA} />
                </label>
              </div>

              <div className="modal-actions">
                <button className="ghost-button" onClick={() => setIsExportModalOpen(false)} type="button">Annulla</button>
                <button className="primary-button" type="submit">
                  <Download size={16} /> Scarica CSV
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
