import { useState } from "react";
import { BookOpen, FileSpreadsheet, Pencil, Plus, SlidersHorizontal, Trash2, UserCheck, WalletCards, X } from "lucide-react";
import { formatCurrency, matchesSearch } from "../../utils/format.js";

export function PriceListPage({ onCreate, onDelete, onUpdate, priceList, searchQuery = "" }) {
  const blankItem = { active: true, category: "Generale", code: "", description: "", unit: "cad", unitPrice: 0 };
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("tutte");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const categories = [...new Set(priceList.map((item) => item.category))].sort();
  const visibleItems = priceList.filter((item) =>
    (categoryFilter === "tutte" || item.category === categoryFilter) &&
    matchesSearch(searchQuery, [item.code, item.description, item.category, item.unit]),
  );
  const averagePrice = priceList.length ? priceList.reduce((sum, item) => sum + item.unitPrice, 0) / priceList.length : 0;

  const openForm = (item = null) => {
    setEditingItem(item);
    setFormData(item ? { ...item } : { ...blankItem });
    setErrorMessage("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!formData.description.trim()) return setErrorMessage("Inserisci la descrizione della lavorazione.");
    setIsSaving(true); setErrorMessage("");
    try {
      if (editingItem) await onUpdate({ ...formData, id: editingItem.id });
      else await onCreate(formData);
      setEditingItem(null); setFormData(null);
    } catch (error) { setErrorMessage(error.message || "Non sono riuscito a salvare la voce."); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    setErrorMessage("");
    try { await onDelete(pendingDelete.id); setPendingDelete(null); }
    catch (error) { setErrorMessage(error.message || "Non sono riuscito a eliminare la voce."); }
  };

  return <section className="price-list-page">
    <section className="quick-stats compact-stats" aria-label="Indicatori prezzario">
      <article className="stat-card"><div className="stat-card-heading"><span>Voci disponibili</span><BookOpen size={19} /></div><strong>{priceList.length}</strong><small>Lavorazioni archiviate</small></article>
      <article className="stat-card"><div className="stat-card-heading"><span>Categorie</span><FileSpreadsheet size={19} /></div><strong>{categories.length}</strong><small>Gruppi merceologici</small></article>
      <article className="stat-card"><div className="stat-card-heading"><span>Prezzo medio</span><WalletCards size={19} /></div><strong>{formatCurrency(averagePrice)}</strong><small>Media costi unitari</small></article>
      <article className="stat-card"><div className="stat-card-heading"><span>Voci attive</span><UserCheck size={19} /></div><strong>{priceList.filter((item) => item.active).length}</strong><small>Utilizzabili nei preventivi</small></article>
    </section>
    <section className="panel price-list-panel">
      <div className="section-heading"><div><p className="eyebrow">Archivio aziendale</p><h2>Lavorazioni e prezzi</h2></div><button className="primary-button" onClick={() => openForm()} type="button"><Plus size={17} /> Nuova voce</button></div>
      <div className="price-list-toolbar"><label><SlidersHorizontal size={15} /><select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}><option value="tutte">Tutte le categorie</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><span>{visibleItems.length} risultati</span></div>
      {errorMessage && !formData && <p className="form-error">{errorMessage}</p>}
      <div className="price-list-table">
        <div className="price-list-head"><span>Codice</span><span>Descrizione</span><span>Categoria</span><span>U.M.</span><span>Prezzo</span><span></span></div>
        {visibleItems.length ? visibleItems.map((item) => <div className={`price-list-row ${!item.active ? "inactive" : ""}`} key={item.id}><strong>{item.code || "—"}</strong><div><strong>{item.description}</strong>{!item.active && <small>Non attiva</small>}</div><span>{item.category}</span><span>{item.unit}</span><strong>{formatCurrency(item.unitPrice)}</strong><div><button className="icon-button" aria-label="Modifica voce" onClick={() => openForm(item)} type="button"><Pencil size={15} /></button><button className="icon-button danger-button" aria-label="Elimina voce" onClick={() => setPendingDelete(item)} type="button"><Trash2 size={15} /></button></div></div>) : <div className="empty-state large-empty"><BookOpen size={32} /><strong>Nessuna voce nel prezzario</strong><span>Aggiungi la prima lavorazione con unità di misura e costo.</span></div>}
      </div>
    </section>
    {formData && <div className="modal-backdrop" role="presentation"><section className="appointment-modal price-item-modal" aria-modal="true" role="dialog"><div className="modal-heading"><div><p className="eyebrow">Prezzario</p><h2>{editingItem ? "Modifica lavorazione" : "Nuova lavorazione"}</h2></div><button className="icon-button" onClick={() => setFormData(null)} type="button"><X size={18} /></button></div><form className="appointment-form" onSubmit={handleSave}><div className="form-grid"><label><span>Codice</span><input onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="Es. FAC-001" value={formData.code} /></label><label><span>Categoria</span><input list="price-categories" onChange={(e) => setFormData({ ...formData, category: e.target.value })} value={formData.category} /><datalist id="price-categories">{categories.map((category) => <option key={category} value={category} />)}</datalist></label></div><label><span>Descrizione lavorazione</span><textarea onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows="4" value={formData.description} /></label><div className="form-grid"><label><span>Unità di misura</span><input onChange={(e) => setFormData({ ...formData, unit: e.target.value })} value={formData.unit} /></label><label><span>Prezzo unitario €</span><input min="0" onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })} step="0.01" type="number" value={formData.unitPrice} /></label></div><label className="price-active-toggle"><input checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} type="checkbox" /> Voce attiva nei preventivi</label>{errorMessage && <p className="form-error">{errorMessage}</p>}<div className="modal-actions"><button className="ghost-button" onClick={() => setFormData(null)} type="button">Annulla</button><button className="primary-button" disabled={isSaving} type="submit">{isSaving ? "Salvataggio..." : "Salva voce"}</button></div></form></section></div>}
    {pendingDelete && <div className="modal-backdrop" role="presentation"><section className="delete-confirm-modal" aria-modal="true" role="dialog"><div className="delete-confirm-icon"><Trash2 size={24} /></div><div><p className="eyebrow">Conferma eliminazione</p><h2>Eliminare questa voce?</h2><p><strong>{pendingDelete.description}</strong></p><span>I preventivi già salvati non verranno modificati.</span></div><div className="delete-confirm-actions"><button className="icon-label-button" onClick={() => setPendingDelete(null)} type="button">Annulla</button><button className="danger-confirm-button" onClick={handleDelete} type="button"><Trash2 size={16} /> Elimina definitivamente</button></div></section></div>}
  </section>;
}
