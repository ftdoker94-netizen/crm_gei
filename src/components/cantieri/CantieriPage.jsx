import { useEffect, useMemo, useState } from "react";
import { Clock, Euro, Plus, Trash2, X } from "lucide-react";
import { cantiereStatoLabels, costoCategorieLabels, costoCategorie, costoTipiLabels, costoTipi } from "../../utils/constants.js";
import { cantiereMarginTone, formatCurrency, formatDateLabel, matchesSearch } from "../../utils/format.js";
import {
  createCantiere,
  createCantiereCosto,
  createCantiereOra,
  deleteCantiereCosto,
  deleteCantiereOra,
  fetchCantiereCosti,
  fetchCantiereOre,
  fetchCantieri,
  updateCantiere,
} from "../../services/dataSource.js";

const memberName = (teamMembers, userId) => teamMembers.find((member) => member.id === userId)?.name || "Non assegnato";
const MARGIN_LABELS = { critical: "Margine critico", neutral: "Margine sano", overdue: "In perdita", soon: "Margine basso" };

export function CantieriPage({ currentUserId, customers, deepLinkCantiereId, onDeepLinkHandled, opportunities, searchQuery = "", teamMembers = [] }) {
  const [cantieri, setCantieri] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedCantiereId, setSelectedCantiereId] = useState(null);
  const [costi, setCosti] = useState([]);
  const [ore, setOre] = useState([]);
  const [costiFilter, setCostiFilter] = useState("tutti");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
    clienteId: "", dataApertura: new Date().toISOString().slice(0, 10), dataChiusuraPrevista: "",
    indirizzo: "", opportunityId: "", responsabileId: "", titolo: "", valoreCommessa: "",
  });
  const [costoForm, setCostoForm] = useState({ categoria: "materiali", data: new Date().toISOString().slice(0, 10), descrizione: "", fornitore: "", importo: "", tipo: "consuntivo" });
  const [oraForm, setOraForm] = useState({ collaboratoreId: "", data: new Date().toISOString().slice(0, 10), note: "", ore: "" });

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

  useEffect(() => {
    if (!selectedCantiereId) {
      setCosti([]);
      setOre([]);
      return;
    }

    let isMounted = true;
    Promise.all([fetchCantiereCosti(selectedCantiereId), fetchCantiereOre(selectedCantiereId)])
      .then(([costiData, oreData]) => {
        if (isMounted) {
          setCosti(costiData);
          setOre(oreData);
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
  const totaleOre = ore.reduce((total, voce) => total + voce.ore, 0);

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

  const handleAddOra = async (event) => {
    event.preventDefault();
    if (!selectedCantiere || !oraForm.ore) return;
    setErrorMessage("");
    try {
      const created = await createCantiereOra({ ...oraForm, cantiereId: selectedCantiere.id }, currentUserId);
      setOre((current) => [created, ...current]);
      setOraForm({ collaboratoreId: "", data: new Date().toISOString().slice(0, 10), note: "", ore: "" });
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a salvare le ore.");
    }
  };

  const handleDeleteOra = async (voceId) => {
    setErrorMessage("");
    try {
      await deleteCantiereOra(voceId);
      setOre((current) => current.filter((voce) => voce.id !== voceId));
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a eliminare la voce ore.");
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
                  <p className="eyebrow">Ore ({totaleOre}h totali)</p>
                  <h3><Clock size={15} /> Ore per collaboratore</h3>
                </div>
              </div>

              <form className="appointment-form compact-form" onSubmit={handleAddOra}>
                <div className="form-grid">
                  <label>
                    <span>Collaboratore</span>
                    <select onChange={(event) => setOraForm((current) => ({ ...current, collaboratoreId: event.target.value }))} value={oraForm.collaboratoreId}>
                      <option value="">Seleziona</option>
                      {teamMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Ore</span>
                    <input onChange={(event) => setOraForm((current) => ({ ...current, ore: event.target.value }))} placeholder="Es. 8" value={oraForm.ore} />
                  </label>
                </div>
                <div className="form-grid">
                  <label>
                    <span>Data</span>
                    <input onChange={(event) => setOraForm((current) => ({ ...current, data: event.target.value }))} type="date" value={oraForm.data} />
                  </label>
                  <label>
                    <span>Note</span>
                    <input onChange={(event) => setOraForm((current) => ({ ...current, note: event.target.value }))} placeholder="Facoltativo" value={oraForm.note} />
                  </label>
                </div>
                <div className="modal-actions">
                  <button className="primary-button" type="submit"><Plus size={15} /> Registra ore</button>
                </div>
              </form>

              <ol className="opportunity-activity-list">
                {ore.length ? (
                  ore.map((voce) => (
                    <li key={voce.id}>
                      <div className="activity-card">
                        <div>
                          <strong>{memberName(teamMembers, voce.collaboratoreId)}</strong>
                          <span>{voce.note || "Nessuna nota"}</span>
                          <small>{formatDateLabel(voce.data)}</small>
                        </div>
                        <span className="due-date">{voce.ore}h</span>
                        <button aria-label="Elimina voce ore" className="icon-button danger-button" onClick={() => handleDeleteOra(voce.id)} type="button">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="empty-list-item"><div><strong>Nessuna ora registrata</strong></div></li>
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
    </section>
  );
}
