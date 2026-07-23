import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, History, Trash2, UploadCloud, UserCog, X } from "lucide-react";
import { praticaPriorityLabels } from "../../utils/constants.js";
import { formatCurrency, formatDateLabel, matchesSearch } from "../../utils/format.js";
import { importComputoFile } from "../../utils/computoImport.js";
import {
  createPraticaDocumento,
  deletePraticaDocumento,
  fetchPraticaDocumenti,
  fetchPraticheData,
  getDemoActorId,
  isDemoMode,
  moveToNextStep,
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

export function PratichePage({ currentUserId, customers, searchQuery = "", teamMembers = [] }) {
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

  const handleViewAsChange = async (event) => {
    const nextActorId = event.target.value;
    setDemoActorId(nextActorId);
    setViewAsId(nextActorId);
    setSelectedPraticaId(null);
    await loadData();
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
    </section>
  );
}
