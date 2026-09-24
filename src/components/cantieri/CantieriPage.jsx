import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Camera, Euro, Plus, Trash2, X } from "lucide-react";
import { cantiereStatoLabels, costoCategorieLabels, costoCategorie, costoTipiLabels, costoTipi, meteoLabels, meteoOpzioni } from "../../utils/constants.js";
import { cantiereMarginTone, formatCurrency, formatDateLabel, matchesSearch } from "../../utils/format.js";
import {
  createCantiere,
  createCantiereCosto,
  createRapportino,
  deleteCantiereCosto,
  deleteRapportinoFoto,
  fetchCantiereCosti,
  fetchCantiereRapportini,
  fetchCantieri,
  updateCantiere,
  updateRapportino,
  uploadRapportinoFoto,
} from "../../services/dataSource.js";

const memberName = (teamMembers, userId) => teamMembers.find((member) => member.id === userId)?.name || "Non assegnato";
const MARGIN_LABELS = { critical: "Margine critico", neutral: "Margine sano", overdue: "In perdita", soon: "Margine basso" };
const emptyOraRow = () => ({ collaboratoreId: "", mansione: "", ore: "" });
const emptyRapportinoForm = () => ({
  data: new Date().toISOString().slice(0, 10),
  lavorazioniSvolte: "",
  meteo: "",
  note: "",
  oreRows: [emptyOraRow()],
});

export function CantieriPage({ currentUserId, currentUserRuolo, customers, deepLinkCantiereId, onDeepLinkHandled, opportunities, searchQuery = "", teamMembers = [] }) {
  const [cantieri, setCantieri] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedCantiereId, setSelectedCantiereId] = useState(null);
  const [costi, setCosti] = useState([]);
  const [rapportini, setRapportini] = useState([]);
  const [costiFilter, setCostiFilter] = useState("tutti");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
    clienteId: "", dataApertura: new Date().toISOString().slice(0, 10), dataChiusuraPrevista: "",
    indirizzo: "", opportunityId: "", responsabileId: "", titolo: "", valoreCommessa: "",
  });
  const [costoForm, setCostoForm] = useState({ categoria: "materiali", data: new Date().toISOString().slice(0, 10), descrizione: "", fornitore: "", importo: "", tipo: "consuntivo" });
  const [isRapportinoModalOpen, setIsRapportinoModalOpen] = useState(false);
  const [editingRapportinoId, setEditingRapportinoId] = useState(null);
  const [rapportinoForm, setRapportinoForm] = useState(emptyRapportinoForm());
  const [rapportinoNotice, setRapportinoNotice] = useState("");
  const [pendingFotoFiles, setPendingFotoFiles] = useState([]);
  const [isSavingRapportino, setIsSavingRapportino] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const fotoInputRef = useRef(null);

  const wonOpportunities = useMemo(() => opportunities.filter((opportunity) => opportunity.status === "vinta"), [opportunities]);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      setCantieri(await fetchCantieri());
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a caricare i cantieri.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!deepLinkCantiereId || isLoading) return;
    if (cantieri.some((item) => item.id === deepLinkCantiereId)) {
      setSelectedCantiereId(deepLinkCantiereId);
    }
    onDeepLinkHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkCantiereId, isLoading, cantieri]);

  const visibleCantieri = useMemo(
    () =>
      cantieri.filter((cantiere) => {
        const customer = customers.find((item) => item.id === cantiere.clienteId);
        return matchesSearch(searchQuery, [cantiere.titolo, cantiere.indirizzo, customer?.name, memberName(teamMembers, cantiere.responsabileId)]);
      }),
    [cantieri, customers, searchQuery, teamMembers],
  );

  const selectedCantiere = cantieri.find((item) => item.id === selectedCantiereId) || null;
  const selectedCustomer = customers.find((item) => item.id === selectedCantiere?.clienteId);

  // Chi puo' modificare/eliminare un rapportino: chi lo ha creato, il
  // responsabile del cantiere, o un admin. Stessa logica della RLS in
  // supabase/migrations/20260930_000001_rapportini_rls_responsabile_admin.sql,
  // qui solo per decidere cosa mostrare nell'interfaccia.
  const canManageRapportino = (rapportino) =>
    rapportino.autoreId === currentUserId ||
    selectedCantiere?.responsabileId === currentUserId ||
    currentUserRuolo === "admin";

  const canManageFoto = (foto) =>
    foto.caricatoDa === currentUserId ||
    selectedCantiere?.responsabileId === currentUserId ||
    currentUserRuolo === "admin";

  const loadRapportini = async (cantiereId) => {
    setRapportini(await fetchCantiereRapportini(cantiereId));
  };

  useEffect(() => {
    if (!selectedCantiereId) {
      setCosti([]);
      setRapportini([]);
      return;
    }

    let isMounted = true;
    Promise.all([fetchCantiereCosti(selectedCantiereId), fetchCantiereRapportini(selectedCantiereId)])
      .then(([costiData, rapportiniData]) => {
        if (isMounted) {
          setCosti(costiData);
          setRapportini(rapportiniData);
        }
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(error.message || "Non sono riuscito a caricare i dati del cantiere.");
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCantiereId]);

  const visibleCosti = costiFilter === "tutti" ? costi : costi.filter((costo) => costo.tipo === costiFilter);
  const totaleOre = rapportini.reduce((total, rapportino) => total + rapportino.ore.reduce((sum, voce) => sum + voce.ore, 0), 0);

  const openCreateModal = () => {
    setCreateForm({
      clienteId: "", dataApertura: new Date().toISOString().slice(0, 10), dataChiusuraPrevista: "",
      indirizzo: "", opportunityId: "", responsabileId: currentUserId, titolo: "", valoreCommessa: "",
    });
    setIsCreateModalOpen(true);
  };

  const handleOpportunityPick = (opportunityId) => {
    const opportunity = opportunities.find((item) => item.id === opportunityId);
    setCreateForm((current) => ({
      ...current,
      clienteId: opportunity?.customerId || current.clienteId,
      opportunityId,
      titolo: opportunity ? opportunity.title : current.titolo,
      valoreCommessa: opportunity ? String(opportunity.estimatedValueNumber) : current.valoreCommessa,
    }));
  };

  const handleCreateCantiere = async (event) => {
    event.preventDefault();
    if (!createForm.titolo.trim()) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      await createCantiere(
        {
          clienteId: createForm.clienteId || null,
          dataApertura: createForm.dataApertura || null,
          dataChiusuraPrevista: createForm.dataChiusuraPrevista || null,
          indirizzo: createForm.indirizzo,
          opportunityId: createForm.opportunityId || null,
          responsabileId: createForm.responsabileId || currentUserId,
          titolo: createForm.titolo.trim(),
          valoreCommessa: createForm.valoreCommessa,
        },
        currentUserId,
      );
      setIsCreateModalOpen(false);
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a creare il cantiere.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatoChange = async (event) => {
    if (!selectedCantiere) return;
    setErrorMessage("");
    try {
      await updateCantiere({ ...selectedCantiere, stato: event.target.value });
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito ad aggiornare lo stato.");
    }
  };

  const handleAddCosto = async (event) => {
    event.preventDefault();
    if (!selectedCantiere || !costoForm.descrizione.trim() || !costoForm.importo) return;
    setErrorMessage("");
    try {
      const created = await createCantiereCosto(
        { ...costoForm, cantiereId: selectedCantiere.id, descrizione: costoForm.descrizione.trim() },
        currentUserId,
      );
      setCosti((current) => [created, ...current]);
      setCostoForm({ categoria: "materiali", data: new Date().toISOString().slice(0, 10), descrizione: "", fornitore: "", importo: "", tipo: "consuntivo" });
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a salvare il costo.");
    }
  };

  const handleDeleteCosto = async (costoId) => {
    setErrorMessage("");
    try {
      await deleteCantiereCosto(costoId);
      setCosti((current) => current.filter((costo) => costo.id !== costoId));
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a eliminare il costo.");
    }
  };

  const openCreateRapportino = () => {
    setEditingRapportinoId(null);
    setRapportinoForm(emptyRapportinoForm());
    setPendingFotoFiles([]);
    setRapportinoNotice("");
    setErrorMessage("");
    setIsRapportinoModalOpen(true);
  };

  const openEditRapportino = (rapportino) => {
    setEditingRapportinoId(rapportino.id);
    setRapportinoForm({
      data: rapportino.data,
      lavorazioniSvolte: rapportino.lavorazioniSvolte,
      meteo: rapportino.meteo || "",
      note: rapportino.note,
      oreRows: rapportino.ore.length
        ? rapportino.ore.map((voce) => ({ collaboratoreId: voce.collaboratoreId, mansione: voce.mansione, ore: String(voce.ore) }))
        : [emptyOraRow()],
    });
    setPendingFotoFiles([]);
    setRapportinoNotice("");
    setErrorMessage("");
    setIsRapportinoModalOpen(true);
  };

  const updateOraRow = (index, patch) => {
    setRapportinoForm((current) => ({
      ...current,
      oreRows: current.oreRows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    }));
  };

  const addOraRow = () => {
    setRapportinoForm((current) => ({ ...current, oreRows: [...current.oreRows, emptyOraRow()] }));
  };

  const removeOraRow = (index) => {
    setRapportinoForm((current) => ({ ...current, oreRows: current.oreRows.filter((_, rowIndex) => rowIndex !== index) }));
  };

  const handleFotoFilesChange = (event) => {
    setPendingFotoFiles((current) => [...current, ...Array.from(event.target.files || [])]);
    event.target.value = "";
  };

  const handleSubmitRapportino = async (event) => {
    event.preventDefault();
    if (!selectedCantiere) return;
    setIsSavingRapportino(true);
    setErrorMessage("");
    setRapportinoNotice("");

    try {
      const payload = {
        cantiereId: selectedCantiere.id,
        data: rapportinoForm.data,
        lavorazioniSvolte: rapportinoForm.lavorazioniSvolte.trim(),
        meteo: rapportinoForm.meteo || null,
        note: rapportinoForm.note.trim(),
      };

      let saved;
      if (editingRapportinoId) {
        saved = await updateRapportino({ ...payload, id: editingRapportinoId }, rapportinoForm.oreRows, currentUserId);
      } else {
        try {
          saved = await createRapportino(payload, rapportinoForm.oreRows, currentUserId);
        } catch (error) {
          if (error.code === "RAPPORTINO_DUPLICATE") {
            const existing = rapportini.find((item) => item.data === rapportinoForm.data);
            if (existing) {
              setRapportinoNotice("Esisteva già un rapportino per questa data: lo stai modificando invece di crearne uno nuovo.");
              setEditingRapportinoId(existing.id);
              saved = await updateRapportino({ ...payload, id: existing.id }, rapportinoForm.oreRows, currentUserId);
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        }
      }

      for (const file of pendingFotoFiles) {
        // eslint-disable-next-line no-await-in-loop
        await uploadRapportinoFoto(file, saved.id, currentUserId);
      }

      setPendingFotoFiles([]);
      await loadRapportini(selectedCantiere.id);
      if (!rapportinoNotice) setIsRapportinoModalOpen(false);
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a salvare il rapportino.");
    } finally {
      setIsSavingRapportino(false);
    }
  };

  const handleDeleteFoto = async (foto) => {
    setErrorMessage("");
    try {
      await deleteRapportinoFoto(foto.id, foto.storagePath);
      await loadRapportini(selectedCantiere.id);
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a eliminare la foto.");
    }
  };

  if (isLoading) {
    return (
      <section className="opportunities-page">
        <p className="sync-banner">Caricamento cantieri...</p>
      </section>
    );
  }

  return (
    <section className="opportunities-page">
      <section className="opportunities-toolbar panel compact-panel">
        <div>
          <p className="eyebrow">Cantieri</p>
          <h2>Costi, ore e marginalità</h2>
          <p className="toolbar-support">Segui i costi sostenuti e previsti di ogni cantiere e il margine risultante.</p>
        </div>
        <div className="opportunities-toolbar-actions">
          <button className="primary-button" onClick={openCreateModal} type="button">
            <Plus size={17} /> Nuovo cantiere
          </button>
        </div>
      </section>

      {errorMessage && <p className="form-error workspace-error">{errorMessage}</p>}

      <section className="opportunities-workspace">
        <div className="opportunity-kanban" aria-label="Elenco cantieri" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {visibleCantieri.length ? (
            visibleCantieri.map((cantiere) => {
              const tone = cantiereMarginTone(cantiere.percentualeMargine);
              const customer = customers.find((item) => item.id === cantiere.clienteId);
              return (
                <button
                  className={`opportunity-card ${selectedCantiereId === cantiere.id ? "selected" : ""}`}
                  key={cantiere.id}
                  onClick={() => setSelectedCantiereId(cantiere.id)}
                  type="button"
                >
                  <div className="opportunity-card-heading">
                    <strong>{cantiere.titolo}</strong>
                    <span>{customer?.name || "Cliente non collegato"}</span>
                  </div>
                  <div className="card-value-row">
                    <span className={`due-date due-${tone}`}>{cantiereStatoLabels[cantiere.stato]}</span>
                    <strong>{formatCurrency(cantiere.margineAttuale)}</strong>
                  </div>
                  <div className="next-action">
                    <span>{MARGIN_LABELS[tone]}</span>
                    <strong>{cantiere.percentualeMargine}%</strong>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="empty-stage">Nessun cantiere inserito</div>
          )}
        </div>

        <aside className="panel opportunity-detail-panel" aria-label="Dettaglio cantiere">
          {selectedCantiere ? (
            <>
              <div className="opportunity-detail-header">
                <div>
                  <p className="eyebrow">{selectedCustomer?.name || "Cliente non collegato"}</p>
                  <h2>{selectedCantiere.titolo}</h2>
                </div>
                <button className="icon-button" onClick={() => setSelectedCantiereId(null)} type="button" aria-label="Chiudi dettaglio">
                  <X size={16} />
                </button>
              </div>

              <div className="stage-control">
                <label>
                  <span>Stato cantiere</span>
                  <select onChange={handleStatoChange} value={selectedCantiere.stato}>
                    {Object.entries(cantiereStatoLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="opportunity-summary-grid compact-summary">
                <div><span>Valore commessa</span><strong>{formatCurrency(selectedCantiere.valoreCommessa)}</strong></div>
                <div><span>Costi consuntivo</span><strong>{formatCurrency(selectedCantiere.costiConsuntivo)}</strong></div>
                <div><span>Costi previsto</span><strong>{formatCurrency(selectedCantiere.costiPrevisto)}</strong></div>
                <div><span>Margine attuale</span><strong>{formatCurrency(selectedCantiere.margineAttuale)}</strong></div>
                <div><span>Margine previsto a finire</span><strong>{formatCurrency(selectedCantiere.marginePrevistoAFinire)}</strong></div>
                <div><span>% margine</span><strong>{selectedCantiere.percentualeMargine}%</strong></div>
              </div>

              <div className="activity-heading">
                <div>
                  <p className="eyebrow">Costi</p>
                  <h3><Euro size={15} /> Costi del cantiere</h3>
                </div>
                <div className="segmented-control opportunity-filters" role="tablist" aria-label="Filtro costi">
                  {["tutti", ...costoTipi].map((value) => (
                    <button className={costiFilter === value ? "selected" : ""} key={value} onClick={() => setCostiFilter(value)} type="button">
                      {value === "tutti" ? "Tutti" : costoTipiLabels[value]}
                    </button>
                  ))}
                </div>
              </div>

              <form className="appointment-form compact-form" onSubmit={handleAddCosto}>
                <div className="form-grid">
                  <label>
                    <span>Categoria</span>
                    <select onChange={(event) => setCostoForm((current) => ({ ...current, categoria: event.target.value }))} value={costoForm.categoria}>
                      {costoCategorie.map((value) => <option key={value} value={value}>{costoCategorieLabels[value]}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Tipo</span>
                    <select onChange={(event) => setCostoForm((current) => ({ ...current, tipo: event.target.value }))} value={costoForm.tipo}>
                      {costoTipi.map((value) => <option key={value} value={value}>{costoTipiLabels[value]}</option>)}
                    </select>
                  </label>
                </div>
                <label>
                  <span>Descrizione</span>
                  <input onChange={(event) => setCostoForm((current) => ({ ...current, descrizione: event.target.value }))} placeholder="Es. Fornitura materiali" value={costoForm.descrizione} />
                </label>
                <div className="form-grid">
                  <label>
                    <span>Importo</span>
                    <input onChange={(event) => setCostoForm((current) => ({ ...current, importo: event.target.value }))} placeholder="Es. 1200" value={costoForm.importo} />
                  </label>
                  <label>
                    <span>Data</span>
                    <input onChange={(event) => setCostoForm((current) => ({ ...current, data: event.target.value }))} type="date" value={costoForm.data} />
                  </label>
                </div>
                <label>
                  <span>Fornitore</span>
                  <input onChange={(event) => setCostoForm((current) => ({ ...current, fornitore: event.target.value }))} placeholder="Facoltativo" value={costoForm.fornitore} />
                </label>
                <div className="modal-actions">
                  <button className="primary-button" type="submit"><Plus size={15} /> Aggiungi costo</button>
                </div>
              </form>

              <ol className="opportunity-activity-list">
                {visibleCosti.length ? (
                  visibleCosti.map((costo) => (
                    <li key={costo.id}>
                      <div className="activity-card">
                        <div>
                          <strong>{costo.descrizione}</strong>
                          <span>{costoCategorieLabels[costo.categoria]} · {costo.fornitore || "Nessun fornitore"}</span>
                          <small>{formatDateLabel(costo.data)}</small>
                        </div>
                        <span className={`due-date ${costo.tipo === "consuntivo" ? "due-overdue" : "due-soon"}`}>
                          {formatCurrency(costo.importo)} · {costoTipiLabels[costo.tipo]}
                        </span>
                        <button aria-label={`Elimina costo ${costo.descrizione}`} className="icon-button danger-button" onClick={() => handleDeleteCosto(costo.id)} type="button">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="empty-list-item"><div><strong>Nessun costo registrato</strong></div></li>
                )}
              </ol>

              <div className="activity-heading">
                <div>
                  <p className="eyebrow">Giornale di cantiere ({totaleOre}h totali)</p>
                  <h3><BookOpen size={15} /> Rapportini giornalieri</h3>
                </div>
                <button className="primary-button" onClick={openCreateRapportino} type="button">
                  <Plus size={15} /> Nuovo rapportino
                </button>
              </div>

              <ol className="opportunity-activity-list">
                {rapportini.length ? (
                  rapportini.map((rapportino) => {
                    const editable = canManageRapportino(rapportino);
                    const content = (
                      <div>
                        <strong>{formatDateLabel(rapportino.data)}{rapportino.meteo ? ` · ${meteoLabels[rapportino.meteo]}` : ""}</strong>
                        <span>{rapportino.lavorazioniSvolte || "Nessuna lavorazione registrata"}</span>
                        <small>
                          {rapportino.ore.map((voce) => `${memberName(teamMembers, voce.collaboratoreId)}: ${voce.ore}h`).join(" · ") || "Nessuna ora registrata"}
                        </small>
                        {rapportino.foto.length > 0 && (
                          <div className="rapportino-thumbnails">
                            {rapportino.foto.map((foto) => (
                              <span
                                aria-label="Apri foto"
                                className="rapportino-thumbnail"
                                key={foto.id}
                                onClick={(event) => { event.stopPropagation(); setLightboxUrl(foto.url); }}
                                role="button"
                                style={{ backgroundImage: `url(${foto.url})` }}
                                tabIndex={0}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                    return (
                      <li key={rapportino.id}>
                        {editable ? (
                          <button className="activity-card rapportino-card" onClick={() => openEditRapportino(rapportino)} type="button">
                            {content}
                            <span className="due-date">Modifica</span>
                          </button>
                        ) : (
                          <div className="activity-card rapportino-card rapportino-readonly">{content}</div>
                        )}
                      </li>
                    );
                  })
                ) : (
                  <li className="empty-list-item">
                    <div>
                      <strong>Nessun rapportino compilato</strong>
                      <span>Registra il primo rapportino giornaliero per questo cantiere.</span>
                    </div>
                  </li>
                )}
              </ol>
            </>
          ) : (
            <div className="empty-state wide-empty">
              <strong>Nessun cantiere selezionato</strong>
              <span>Seleziona un cantiere dall'elenco per vedere costi, ore e marginalità.</span>
            </div>
          )}
        </aside>
      </section>

      {isCreateModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="appointment-modal" aria-labelledby="cantiere-modal-title" role="dialog" aria-modal="true">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Cantieri</p>
                <h2 id="cantiere-modal-title">Nuovo cantiere</h2>
              </div>
              <button className="icon-button" onClick={() => setIsCreateModalOpen(false)} type="button" aria-label="Chiudi">
                <X size={18} />
              </button>
            </div>

            <form className="appointment-form" onSubmit={handleCreateCantiere}>
              <label>
                <span>Da opportunità vinta (facoltativo)</span>
                <select onChange={(event) => handleOpportunityPick(event.target.value)} value={createForm.opportunityId}>
                  <option value="">Nessuna opportunità collegata</option>
                  {wonOpportunities.map((opportunity) => (
                    <option key={opportunity.id} value={opportunity.id}>{opportunity.title}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Titolo cantiere</span>
                <input
                  onChange={(event) => setCreateForm((current) => ({ ...current, titolo: event.target.value }))}
                  placeholder="Es. Rifacimento facciata Condominio Verdi"
                  required
                  value={createForm.titolo}
                />
              </label>

              <div className="form-grid">
                <label>
                  <span>Cliente collegato</span>
                  <select onChange={(event) => setCreateForm((current) => ({ ...current, clienteId: event.target.value }))} value={createForm.clienteId}>
                    <option value="">Nessun cliente</option>
                    {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Responsabile</span>
                  <select onChange={(event) => setCreateForm((current) => ({ ...current, responsabileId: event.target.value }))} value={createForm.responsabileId}>
                    {teamMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                  </select>
                </label>
              </div>

              <label>
                <span>Indirizzo</span>
                <input onChange={(event) => setCreateForm((current) => ({ ...current, indirizzo: event.target.value }))} placeholder="Via, città" value={createForm.indirizzo} />
              </label>

              <div className="form-grid">
                <label>
                  <span>Valore commessa</span>
                  <input onChange={(event) => setCreateForm((current) => ({ ...current, valoreCommessa: event.target.value }))} placeholder="Es. 42000" value={createForm.valoreCommessa} />
                </label>
                <label>
                  <span>Data apertura</span>
                  <input onChange={(event) => setCreateForm((current) => ({ ...current, dataApertura: event.target.value }))} type="date" value={createForm.dataApertura} />
                </label>
              </div>

              <label>
                <span>Data chiusura prevista</span>
                <input onChange={(event) => setCreateForm((current) => ({ ...current, dataChiusuraPrevista: event.target.value }))} type="date" value={createForm.dataChiusuraPrevista} />
              </label>

              <div className="modal-actions">
                <button className="ghost-button" onClick={() => setIsCreateModalOpen(false)} type="button">Annulla</button>
                <button className="primary-button" disabled={isSaving} type="submit">
                  {isSaving ? "Creazione..." : "Crea cantiere"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {isRapportinoModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="appointment-modal" aria-labelledby="rapportino-modal-title" role="dialog" aria-modal="true">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Giornale di cantiere</p>
                <h2 id="rapportino-modal-title">{editingRapportinoId ? "Modifica rapportino" : "Nuovo rapportino"}</h2>
              </div>
              <button className="icon-button" onClick={() => setIsRapportinoModalOpen(false)} type="button" aria-label="Chiudi">
                <X size={18} />
              </button>
            </div>

            {rapportinoNotice && <p className="field-help">{rapportinoNotice}</p>}

            <form className="appointment-form" onSubmit={handleSubmitRapportino}>
              <div className="form-grid">
                <label>
                  <span>Data</span>
                  <input
                    disabled={Boolean(editingRapportinoId)}
                    onChange={(event) => setRapportinoForm((current) => ({ ...current, data: event.target.value }))}
                    required
                    type="date"
                    value={rapportinoForm.data}
                  />
                </label>
                <label>
                  <span>Meteo</span>
                  <select onChange={(event) => setRapportinoForm((current) => ({ ...current, meteo: event.target.value }))} value={rapportinoForm.meteo}>
                    <option value="">Non indicato</option>
                    {meteoOpzioni.map((value) => <option key={value} value={value}>{meteoLabels[value]}</option>)}
                  </select>
                </label>
              </div>

              <label>
                <span>Lavorazioni svolte</span>
                <textarea
                  onChange={(event) => setRapportinoForm((current) => ({ ...current, lavorazioniSvolte: event.target.value }))}
                  placeholder="Cosa è stato fatto oggi in cantiere..."
                  rows="3"
                  value={rapportinoForm.lavorazioniSvolte}
                />
              </label>

              <label>
                <span>Note</span>
                <textarea
                  onChange={(event) => setRapportinoForm((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Facoltativo"
                  rows="2"
                  value={rapportinoForm.note}
                />
              </label>

              <fieldset className="assignment-fieldset">
                <legend>Ore per collaboratore</legend>
                {rapportinoForm.oreRows.map((row, index) => (
                  <div className="form-grid rapportino-ora-row" key={index}>
                    <label>
                      <span>Collaboratore</span>
                      <select onChange={(event) => updateOraRow(index, { collaboratoreId: event.target.value })} value={row.collaboratoreId}>
                        <option value="">Seleziona</option>
                        {teamMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Ore</span>
                      <input onChange={(event) => updateOraRow(index, { ore: event.target.value })} placeholder="Es. 8" value={row.ore} />
                    </label>
                    <label>
                      <span>Mansione</span>
                      <input onChange={(event) => updateOraRow(index, { mansione: event.target.value })} placeholder="Es. Muratura" value={row.mansione} />
                    </label>
                    <button
                      aria-label="Rimuovi riga ore"
                      className="icon-button danger-button"
                      disabled={rapportinoForm.oreRows.length === 1}
                      onClick={() => removeOraRow(index)}
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <button className="ghost-button compact-button" onClick={addOraRow} type="button">
                  <Plus size={14} /> Aggiungi collaboratore
                </button>
              </fieldset>

              <label>
                <span>Foto</span>
                <input
                  accept="image/*"
                  aria-label="Carica foto rapportino"
                  className="visually-hidden"
                  multiple
                  onChange={handleFotoFilesChange}
                  ref={fotoInputRef}
                  type="file"
                />
                <button className="computo-upload-button" onClick={() => fotoInputRef.current?.click()} type="button">
                  <Camera size={15} /> Aggiungi foto
                </button>
              </label>

              {pendingFotoFiles.length > 0 && (
                <p className="field-help">{pendingFotoFiles.length} foto pronte per il caricamento.</p>
              )}

              {editingRapportinoId && (
                <div className="rapportino-thumbnails">
                  {rapportini.find((item) => item.id === editingRapportinoId)?.foto.map((foto) => (
                    <span className="rapportino-thumbnail-wrapper" key={foto.id}>
                      <span
                        aria-label="Apri foto"
                        className="rapportino-thumbnail"
                        onClick={() => setLightboxUrl(foto.url)}
                        role="button"
                        style={{ backgroundImage: `url(${foto.url})` }}
                        tabIndex={0}
                      />
                      {canManageFoto(foto) && (
                        <button aria-label="Elimina foto" className="icon-button danger-button" onClick={() => handleDeleteFoto(foto)} type="button">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}

              <div className="modal-actions">
                <button className="ghost-button" onClick={() => setIsRapportinoModalOpen(false)} type="button">Annulla</button>
                <button className="primary-button" disabled={isSavingRapportino} type="submit">
                  {isSavingRapportino ? "Salvataggio..." : editingRapportinoId ? "Salva modifiche" : "Salva rapportino"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {lightboxUrl && (
        <div className="modal-backdrop lightbox-backdrop" onClick={() => setLightboxUrl(null)} role="presentation">
          <img alt="Foto rapportino" className="lightbox-image" src={lightboxUrl} />
          <button aria-label="Chiudi anteprima" className="icon-button lightbox-close" onClick={() => setLightboxUrl(null)} type="button">
            <X size={20} />
          </button>
        </div>
      )}
    </section>
  );
}
