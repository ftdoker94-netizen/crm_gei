import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { movimentoCassaTipi } from "../../utils/constants.js";
import { formatCurrency, formatDateLabel, matchesSearch } from "../../utils/format.js";
import { createMovimentoCassa, deleteMovimentoCassa, fetchCantieri, fetchMovimentiCassa } from "../../services/dataSource.js";

const currentMonthKey = () => new Date().toISOString().slice(0, 7);

export function EconomiaPage({ currentUserId, searchQuery = "" }) {
  const [movimenti, setMovimenti] = useState([]);
  const [cantieri, setCantieri] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [periodo, setPeriodo] = useState(currentMonthKey());
  const [tipoFilter, setTipoFilter] = useState("tutti");
  const [cantiereFilter, setCantiereFilter] = useState("tutti");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    cantiereId: "", categoria: "", data: new Date().toISOString().slice(0, 10), descrizione: "", importo: "", tipo: "entrata",
  });

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [movimentiData, cantieriData] = await Promise.all([fetchMovimentiCassa(), fetchCantieri()]);
      setMovimenti(movimentiData);
      setCantieri(cantieriData);
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a caricare i movimenti.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const cantiereName = (cantiereId) => cantieri.find((item) => item.id === cantiereId)?.titolo || "Spesa aziendale generale";

  const visibleMovimenti = useMemo(
    () =>
      movimenti
        .filter((movimento) => !periodo || movimento.data.startsWith(periodo))
        .filter((movimento) => tipoFilter === "tutti" || movimento.tipo === tipoFilter)
        .filter((movimento) => cantiereFilter === "tutti" || (movimento.cantiereId || "nessuno") === cantiereFilter)
        .filter((movimento) => matchesSearch(searchQuery, [movimento.descrizione, movimento.categoria, cantiereName(movimento.cantiereId)])),
    [movimenti, periodo, tipoFilter, cantiereFilter, searchQuery, cantieri],
  );

  const entrate = visibleMovimenti.filter((movimento) => movimento.tipo === "entrata").reduce((total, movimento) => total + movimento.importo, 0);
  const uscite = visibleMovimenti.filter((movimento) => movimento.tipo === "uscita").reduce((total, movimento) => total + movimento.importo, 0);
  const saldo = entrate - uscite;

  const openForm = () => {
    setForm({ cantiereId: "", categoria: "", data: new Date().toISOString().slice(0, 10), descrizione: "", importo: "", tipo: "entrata" });
    setIsFormOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.categoria.trim() || !form.importo) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      const created = await createMovimentoCassa(
        { ...form, cantiereId: form.cantiereId || null, categoria: form.categoria.trim(), descrizione: form.descrizione.trim() },
        currentUserId,
      );
      setMovimenti((current) => [created, ...current]);
      setIsFormOpen(false);
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a salvare il movimento.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (movimentoId) => {
    setErrorMessage("");
    try {
      await deleteMovimentoCassa(movimentoId);
      setMovimenti((current) => current.filter((movimento) => movimento.id !== movimentoId));
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a eliminare il movimento.");
    }
  };

  if (isLoading) {
    return (
      <section className="opportunities-page">
        <p className="sync-banner">Caricamento economia...</p>
      </section>
    );
  }

  return (
    <section className="opportunities-page">
      <section className="opportunities-toolbar panel compact-panel">
        <div>
          <p className="eyebrow">Economia</p>
          <h2>Vista economica generale</h2>
          <p className="toolbar-support">Entrate e uscite inserite a mano, per periodo e per cantiere.</p>
        </div>
        <div className="opportunities-toolbar-actions">
          <label className="filter-field">
            <span>Periodo</span>
            <input onChange={(event) => setPeriodo(event.target.value)} type="month" value={periodo} />
          </label>
          <button className="primary-button" onClick={openForm} type="button">
            <Plus size={17} /> Nuovo movimento
          </button>
        </div>
      </section>

      {errorMessage && <p className="form-error workspace-error">{errorMessage}</p>}

      <section className="quick-stats compact-stats" aria-label="Saldo del periodo">
        <article className="stat-card">
          <span>Entrate</span>
          <strong><TrendingUp size={14} aria-hidden="true" /> {formatCurrency(entrate)}</strong>
        </article>
        <article className="stat-card">
          <span>Uscite</span>
          <strong><TrendingDown size={14} aria-hidden="true" /> {formatCurrency(uscite)}</strong>
        </article>
        <article className="stat-card">
          <span>Saldo periodo</span>
          <strong className={saldo < 0 ? "negative" : "positive"}>{formatCurrency(saldo)}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Filtri</p>
            <h3>Movimenti</h3>
          </div>
          <div className="opportunities-toolbar-actions">
            <label className="filter-field">
              <span>Tipo</span>
              <select onChange={(event) => setTipoFilter(event.target.value)} value={tipoFilter}>
                <option value="tutti">Tutti</option>
                {movimentoCassaTipi.map((value) => <option key={value} value={value}>{value === "entrata" ? "Entrata" : "Uscita"}</option>)}
              </select>
            </label>
            <label className="filter-field">
              <span>Cantiere</span>
              <select onChange={(event) => setCantiereFilter(event.target.value)} value={cantiereFilter}>
                <option value="tutti">Tutti</option>
                <option value="nessuno">Spese generali</option>
                {cantieri.map((cantiere) => <option key={cantiere.id} value={cantiere.id}>{cantiere.titolo}</option>)}
              </select>
            </label>
          </div>
        </div>

        <ol className="opportunity-activity-list">
          {visibleMovimenti.length ? (
            visibleMovimenti.map((movimento) => (
              <li key={movimento.id}>
                <div className="activity-card">
                  <div>
                    <strong>{movimento.descrizione || movimento.categoria}</strong>
                    <span>{movimento.categoria} · {cantiereName(movimento.cantiereId)}</span>
                    <small>{formatDateLabel(movimento.data)}</small>
                  </div>
                  <span className={`due-date ${movimento.tipo === "entrata" ? "due-soon" : "due-overdue"}`}>
                    {movimento.tipo === "entrata" ? "+" : "-"}{formatCurrency(movimento.importo)}
                  </span>
                  <button aria-label="Elimina movimento" className="icon-button danger-button" onClick={() => handleDelete(movimento.id)} type="button">
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))
          ) : (
            <li className="empty-list-item">
              <div>
                <strong>Nessun movimento nel periodo</strong>
                <span>Inserisci il primo movimento di cassa per iniziare.</span>
              </div>
            </li>
          )}
        </ol>
      </section>

      {isFormOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="appointment-modal" aria-labelledby="movimento-modal-title" role="dialog" aria-modal="true">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Economia</p>
                <h2 id="movimento-modal-title">Nuovo movimento</h2>
              </div>
              <button className="icon-button" onClick={() => setIsFormOpen(false)} type="button" aria-label="Chiudi">
                <X size={18} />
              </button>
            </div>

            <form className="appointment-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  <span>Tipo</span>
                  <select onChange={(event) => setForm((current) => ({ ...current, tipo: event.target.value }))} value={form.tipo}>
                    {movimentoCassaTipi.map((value) => <option key={value} value={value}>{value === "entrata" ? "Entrata" : "Uscita"}</option>)}
                  </select>
                </label>
                <label>
                  <span>Importo</span>
                  <input onChange={(event) => setForm((current) => ({ ...current, importo: event.target.value }))} placeholder="Es. 1500" required value={form.importo} />
                </label>
              </div>

              <label>
                <span>Categoria</span>
                <input onChange={(event) => setForm((current) => ({ ...current, categoria: event.target.value }))} placeholder="Es. Materiali, Acconto cliente, Utenze" required value={form.categoria} />
              </label>

              <label>
                <span>Cantiere collegato</span>
                <select onChange={(event) => setForm((current) => ({ ...current, cantiereId: event.target.value }))} value={form.cantiereId}>
                  <option value="">Spesa aziendale generale</option>
                  {cantieri.map((cantiere) => <option key={cantiere.id} value={cantiere.id}>{cantiere.titolo}</option>)}
                </select>
              </label>

              <label>
                <span>Data</span>
                <input onChange={(event) => setForm((current) => ({ ...current, data: event.target.value }))} type="date" value={form.data} />
              </label>

              <label>
                <span>Descrizione</span>
                <textarea onChange={(event) => setForm((current) => ({ ...current, descrizione: event.target.value }))} placeholder="Dettagli del movimento..." rows="3" value={form.descrizione} />
              </label>

              <div className="modal-actions">
                <button className="ghost-button" onClick={() => setIsFormOpen(false)} type="button">Annulla</button>
                <button className="primary-button" disabled={isSaving} type="submit">{isSaving ? "Salvataggio" : "Salva movimento"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
