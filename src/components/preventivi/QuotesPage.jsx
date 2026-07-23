import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Calculator,
  Download,
  FileSpreadsheet,
  FileText,
  GripVertical,
  History,
  Pencil,
  Plus,
  SlidersHorizontal,
  StickyNote,
  Trash2,
  UploadCloud,
  UserCheck,
  WalletCards,
  X,
} from "lucide-react";
import { quoteStatuses } from "../../utils/constants.js";
import { formatCurrency, matchesSearch } from "../../utils/format.js";
import { importComputoFile } from "../../utils/computoImport.js";
import { downloadQuotePdf } from "../../utils/quotePdf.js";

const quoteStatusLabel = (status) => quoteStatuses.find((item) => item.value === status)?.label || status;

export function QuotesPage({ customers, onCreateQuote, onDeleteQuote, onSavePriceItems, onUpdateQuote, opportunities, priceList, quotes, searchQuery = "" }) {
  const [selectedQuoteId, setSelectedQuoteId] = useState(quotes[0]?.id);
  const [editingQuote, setEditingQuote] = useState(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quotePendingDelete, setQuotePendingDelete] = useState(null);
  const [isDeletingQuote, setIsDeletingQuote] = useState(false);
  const [exportingQuoteId, setExportingQuoteId] = useState(null);
  const [deleteQuoteError, setDeleteQuoteError] = useState("");
  const [quoteExportError, setQuoteExportError] = useState("");
  const [statusFilter, setStatusFilter] = useState("tutti");
  const visibleQuotes = quotes.filter((quote) =>
    (statusFilter === "tutti" || quote.status === statusFilter) &&
    matchesSearch(searchQuery, [quote.quoteNumber, quote.subject, quote.customerName, quote.status]),
  );
  const selectedQuote = visibleQuotes.find((quote) => quote.id === selectedQuoteId) || visibleQuotes[0];
  const openTotal = quotes.filter((quote) => ["bozza", "inviato"].includes(quote.status)).reduce((sum, quote) => sum + quote.totalNumber, 0);
  const acceptedTotal = quotes.filter((quote) => quote.status === "accettato").reduce((sum, quote) => sum + quote.totalNumber, 0);
  const today = new Date().toISOString().slice(0, 10);
  const defaultQuoteNumber = `PREV-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(3, "0")}`;

  const handleSave = async (quote) => {
    const saved = quote.id ? await onUpdateQuote(quote) : await onCreateQuote(quote);
    setSelectedQuoteId(saved.id);
    setEditingQuote(null);
    setIsQuoteModalOpen(false);
  };

  const handleDelete = async () => {
    if (!quotePendingDelete) return;
    setIsDeletingQuote(true);
    setDeleteQuoteError("");
    try {
      await onDeleteQuote(quotePendingDelete.id);
      setSelectedQuoteId(null);
      setQuotePendingDelete(null);
    } catch (error) {
      setDeleteQuoteError(error.message || "Non sono riuscito a eliminare il preventivo.");
    } finally {
      setIsDeletingQuote(false);
    }
  };

  const handlePdfExport = async (quote) => {
    setExportingQuoteId(quote.id);
    setQuoteExportError("");
    try {
      const customer = customers.find((item) => item.id === quote.customerId);
      await downloadQuotePdf(quote, customer);
    } catch (error) {
      setQuoteExportError(error.message || "Non sono riuscito a generare il PDF.");
    } finally {
      setExportingQuoteId(null);
    }
  };

  return (
    <section className="quotes-page">
      <section className="quick-stats compact-stats" aria-label="Indicatori preventivi">
        <article className="stat-card"><div className="stat-card-heading"><span>Preventivi totali</span><FileText size={19} /></div><strong>{quotes.length}</strong><small>Documenti commerciali</small></article>
        <article className="stat-card"><div className="stat-card-heading"><span>In attesa</span><History size={19} /></div><strong>{quotes.filter((quote) => quote.status === "inviato").length}</strong><small>Inviati da seguire</small></article>
        <article className="stat-card"><div className="stat-card-heading"><span>Valore aperto</span><WalletCards size={19} /></div><strong>{formatCurrency(openTotal)}</strong><small>Bozze e inviati</small></article>
        <article className="stat-card"><div className="stat-card-heading"><span>Accettato</span><UserCheck size={19} /></div><strong>{formatCurrency(acceptedTotal)}</strong><small>Valore acquisito</small></article>
      </section>

      <section className="quotes-layout">
        <div className="panel quotes-list-panel">
          <div className="section-heading">
            <div><p className="eyebrow">Offerte</p><h2>Preventivi</h2></div>
            <button className="primary-button" onClick={() => { setEditingQuote(null); setIsQuoteModalOpen(true); }} type="button"><Plus size={17} /> Nuovo</button>
          </div>
          <label className="quote-status-filter"><SlidersHorizontal size={15} /><select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="tutti">Tutti gli stati</option>{quoteStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
          <div className="quotes-list">
            {visibleQuotes.length ? visibleQuotes.map((quote) => (
              <button className={`quote-row ${selectedQuote?.id === quote.id ? "selected" : ""}`} key={quote.id} onClick={() => setSelectedQuoteId(quote.id)} type="button">
                <span className="quote-row-icon"><FileText size={17} /></span>
                <div><small>{quote.quoteNumber}</small><strong>{quote.subject}</strong><span>{quote.customerName}</span></div>
                <div><span className={`quote-status status-${quote.status}`}>{quoteStatusLabel(quote.status)}</span><strong>{quote.total}</strong></div>
              </button>
            )) : <div className="empty-state"><strong>Nessun preventivo</strong><span>Crea la prima offerta collegata a un cliente.</span></div>}
          </div>
        </div>

        <article className="panel quote-detail-panel">
          {selectedQuote ? <>
            <div className="quote-detail-header">
              <div><p className="eyebrow">{selectedQuote.quoteNumber}</p><h2>{selectedQuote.subject}</h2><span>{selectedQuote.customerName}</span></div>
              <div className="detail-header-actions"><span className={`quote-status status-${selectedQuote.status}`}>{quoteStatusLabel(selectedQuote.status)}</span><button className="icon-label-button pdf-button" disabled={exportingQuoteId === selectedQuote.id} onClick={() => handlePdfExport(selectedQuote)} type="button"><Download size={15} /> {exportingQuoteId === selectedQuote.id ? "Creazione PDF..." : "Scarica PDF"}</button><button className="icon-label-button" onClick={() => { setEditingQuote(selectedQuote); setIsQuoteModalOpen(true); }} type="button"><Pencil size={15} /> Modifica</button><button className="icon-label-button danger-button" onClick={() => { setDeleteQuoteError(""); setQuotePendingDelete(selectedQuote); }} type="button"><Trash2 size={15} /> Elimina</button></div>
            </div>
            {quoteExportError && <div className="form-error quote-export-error">{quoteExportError}</div>}
            <div className="quote-meta-grid">
              <div><span>Emissione</span><strong>{new Date(selectedQuote.issueDate).toLocaleDateString("it-IT")}</strong></div>
              <div><span>Validità</span><strong>{selectedQuote.validUntil ? new Date(selectedQuote.validUntil).toLocaleDateString("it-IT") : "Non indicata"}</strong></div>
              <div><span>Opportunità</span><strong>{selectedQuote.opportunityTitle}</strong></div>
              <div><span>Aggiornato da</span><strong>{selectedQuote.updatedBy}</strong></div>
            </div>
            <div className="quote-items-table"><div className="quote-items-head"><span>Descrizione</span><span>Qtà</span><span>Prezzo</span><span>Totale</span></div>{selectedQuote.items.map((item) => <div className="quote-item-row" key={item.id}><strong>{item.description}</strong><span>{item.quantity} {item.unit}</span><span>{formatCurrency(item.unitPrice)}</span><strong>{formatCurrency(item.quantity * item.unitPrice)}</strong></div>)}</div>
            <div className="quote-totals"><div><span>Imponibile</span><strong>{selectedQuote.subtotal}</strong></div>{selectedQuote.discount > 0 && <div><span>Sconto {selectedQuote.discount}%</span><strong>- {selectedQuote.discountValue}</strong></div>}<div><span>IVA {selectedQuote.vatRate}%</span><strong>{selectedQuote.vat}</strong></div><div className="quote-grand-total"><span>Totale preventivo</span><strong>{selectedQuote.total}</strong></div></div>
            {selectedQuote.notes && <div className="quote-notes"><StickyNote size={16} /><p>{selectedQuote.notes}</p></div>}
          </> : <div className="empty-state large-empty"><Calculator size={32} /><strong>Nessun preventivo selezionato</strong><span>Crea un preventivo per iniziare.</span></div>}
        </article>
      </section>
      <QuoteModal customers={customers} defaultIssueDate={today} defaultQuoteNumber={defaultQuoteNumber} isOpen={isQuoteModalOpen} onClose={() => { setEditingQuote(null); setIsQuoteModalOpen(false); }} onSave={handleSave} onSavePriceItems={onSavePriceItems} opportunities={opportunities} priceList={priceList} quote={editingQuote} />
      {quotePendingDelete && <div className="modal-backdrop" role="presentation"><section aria-labelledby="delete-quote-title" aria-modal="true" className="delete-confirm-modal" role="dialog"><div className="delete-confirm-icon"><Trash2 size={24} /></div><div><p className="eyebrow">Conferma eliminazione</p><h2 id="delete-quote-title">Eliminare definitivamente il preventivo?</h2><p><strong>{quotePendingDelete.quoteNumber}</strong> · {quotePendingDelete.subject}</p><span>L’operazione non può essere annullata.</span></div>{deleteQuoteError && <div className="form-error">{deleteQuoteError}</div>}<div className="delete-confirm-actions"><button className="icon-label-button" disabled={isDeletingQuote} onClick={() => setQuotePendingDelete(null)} type="button">Annulla</button><button className="danger-confirm-button" disabled={isDeletingQuote} onClick={handleDelete} type="button"><Trash2 size={16} /> {isDeletingQuote ? "Eliminazione..." : "Elimina definitivamente"}</button></div></section></div>}
    </section>
  );
}

const normalizePriceText = (value) => String(value || "").toLocaleLowerCase("it-IT").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const priceStopWords = new Set(["a", "al", "alla", "con", "da", "dei", "del", "della", "di", "e", "ed", "in", "la", "le", "per", "su", "un", "una"]);
const priceTokens = (value) => normalizePriceText(value).split(" ").filter((token) => token.length > 2 && !priceStopWords.has(token));
const findPriceMatch = (description, priceList) => {
  const normalized = normalizePriceText(description);
  const sourceTokens = new Set(priceTokens(description));
  let best = null;
  priceList.filter((item) => item.active).forEach((item) => {
    const code = normalizePriceText(item.code);
    const targetTokens = priceTokens(item.description);
    const score = code && normalized.includes(code) ? 1 : targetTokens.length
      ? targetTokens.filter((token) => sourceTokens.has(token)).length / Math.min(Math.max(targetTokens.length, 1), 8)
      : 0;
    if (!best || score > best.score) best = { item, score };
  });
  return best?.score >= 0.55 ? best.item : null;
};

function QuoteModal({ customers, defaultIssueDate, defaultQuoteNumber, isOpen, onClose, onSave, onSavePriceItems, opportunities, priceList = [], quote }) {
  const emptyItem = () => ({ description: "", id: crypto.randomUUID(), quantity: 1, unit: "cad", unitPrice: 0 });
  const [formData, setFormData] = useState({ customerId: "", discount: 0, issueDate: defaultIssueDate, items: [emptyItem()], notes: "", opportunityId: "", quoteNumber: defaultQuoteNumber, status: "bozza", subject: "", validUntil: "", vatRate: 22 });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importWarnings, setImportWarnings] = useState([]);
  const [priceMessage, setPriceMessage] = useState("");
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [dragOverItemId, setDragOverItemId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage("");
    setImportMessage("");
    setImportWarnings([]);
    setPriceMessage("");
    setFormData({ customerId: quote?.customerId || customers[0]?.id || "", discount: quote?.discount || 0, issueDate: quote?.issueDate || defaultIssueDate, items: quote?.items?.length ? quote.items : [emptyItem()], notes: quote?.notes || "", opportunityId: quote?.opportunityId || "", quoteNumber: quote?.quoteNumber || defaultQuoteNumber, status: quote?.status || "bozza", subject: quote?.subject || "", validUntil: quote?.validUntil || "", vatRate: quote?.vatRate ?? 22 });
  }, [customers, defaultIssueDate, defaultQuoteNumber, isOpen, quote]);

  if (!isOpen) return null;
  const subtotal = formData.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const total = (subtotal * (1 - (Number(formData.discount) || 0) / 100)) * (1 + (Number(formData.vatRate) || 0) / 100);
  const updateItem = (id, field, value) => setFormData((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, [field]: value } : item) }));
  const moveItem = (sourceId, targetId) => setFormData((current) => {
    const sourceIndex = current.items.findIndex((item) => item.id === sourceId);
    const targetIndex = current.items.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;
    const items = [...current.items];
    const [moved] = items.splice(sourceIndex, 1);
    items.splice(targetIndex, 0, moved);
    return { ...current, items };
  });

  const applyPriceList = () => {
    let matched = 0;
    setFormData((current) => ({ ...current, items: current.items.map((item) => {
      if (Number(item.unitPrice) > 0) return item;
      const match = findPriceMatch(item.description, priceList);
      if (!match) return item;
      matched += 1;
      return { ...item, unit: match.unit, unitPrice: match.unitPrice };
    }) }));
    setPriceMessage(matched ? `${matched} prezzi applicati dal prezzario` : "Nessuna corrispondenza sicura trovata");
  };

  const savePricesToArchive = async () => {
    const existing = new Set(priceList.map((item) => normalizePriceText(item.description)));
    const items = formData.items.filter((item) => item.description.trim() && Number(item.unitPrice) > 0 && !existing.has(normalizePriceText(item.description)));
    if (!items.length) return setPriceMessage("Tutte le voci con prezzo sono già nel prezzario");
    try { await onSavePriceItems(items); setPriceMessage(`${items.length} nuove voci salvate nel prezzario`); }
    catch (error) { setPriceMessage(error.message || "Non sono riuscito a salvare i prezzi"); }
  };

  const handleComputoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true); setErrorMessage(""); setImportWarnings([]); setImportMessage("Analisi del file in corso...");
    try {
      const imported = await importComputoFile(file, ({ progress, status }) => {
        const percentage = Math.round((Number(progress) || 0) * 100);
        setImportMessage(`OCR ${percentage}% · ${status || "riconoscimento in corso"}`);
      });
      setFormData((current) => {
        return { ...current, items: imported.items, subject: current.subject || `Computo metrico - ${imported.fileName}` };
      });
      setImportWarnings(imported.warnings || []);
      setImportMessage(`${imported.items.length} voci importate da ${file.name}${imported.usedOcr ? " tramite OCR" : ""}`);
    } catch (error) {
      setImportMessage("");
      setErrorMessage(error.message || "Non sono riuscito a leggere il computo metrico.");
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const items = formData.items.filter((item) => item.description.trim() && Number(item.quantity) > 0);
    if (!formData.quoteNumber.trim() || !formData.subject.trim() || !items.length) { setErrorMessage("Inserisci numero, oggetto e almeno una voce valida."); return; }
    setIsSaving(true); setErrorMessage("");
    try { await onSave({ ...formData, id: quote?.id, items }); } catch (error) { setErrorMessage(error.message || "Non sono riuscito a salvare il preventivo."); } finally { setIsSaving(false); }
  };

  return <div className="modal-backdrop" role="presentation"><section className="appointment-modal quote-modal" aria-labelledby="quote-modal-title" role="dialog" aria-modal="true"><div className="modal-heading"><div><p className="eyebrow">Preventivo</p><h2 id="quote-modal-title">{quote ? "Modifica preventivo" : "Nuovo preventivo"}</h2></div><button className="icon-button" onClick={onClose} type="button" aria-label="Chiudi"><X size={18} /></button></div><form className="appointment-form" onSubmit={handleSubmit}>
    <div className="form-grid"><label><span>Numero</span><input name="quoteNumber" onChange={(e) => setFormData({ ...formData, quoteNumber: e.target.value })} required value={formData.quoteNumber} /></label><label><span>Stato</span><select onChange={(e) => setFormData({ ...formData, status: e.target.value })} value={formData.status}>{quoteStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label></div>
    <label><span>Oggetto del preventivo</span><input onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="Es. Rifacimento facciata condominiale" required value={formData.subject} /></label>
    <div className="form-grid"><label><span>Cliente</span><select onChange={(e) => setFormData({ ...formData, customerId: e.target.value, opportunityId: "" })} value={formData.customerId}><option value="">Nessun cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><label><span>Opportunità</span><select onChange={(e) => setFormData({ ...formData, opportunityId: e.target.value })} value={formData.opportunityId}><option value="">Nessuna opportunità</option>{opportunities.filter((item) => !formData.customerId || item.customerId === formData.customerId).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>
    <div className="form-grid"><label><span>Data emissione</span><input onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} type="date" value={formData.issueDate} /></label><label><span>Valido fino al</span><input onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })} type="date" value={formData.validUntil} /></label></div>
    <div className="quote-editor-items"><div className="quote-editor-heading"><div><strong>Voci del preventivo</strong><span>Inserisci manualmente oppure importa un computo. I PDF scansionati e le immagini usano l’OCR a doppio controllo.</span></div><div className="quote-editor-actions"><input accept=".pdf,.xlsx,.csv,.jpg,.jpeg,.png,.webp,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,image/jpeg,image/png,image/webp" aria-label="Carica computo metrico" className="visually-hidden" onChange={handleComputoUpload} ref={fileInputRef} type="file" /><button className="computo-upload-button" disabled={isImporting} onClick={() => fileInputRef.current?.click()} type="button"><UploadCloud size={15} /> {isImporting ? "Doppia lettura OCR..." : "Carica computo"}</button><button className="filter-reset" disabled={!priceList.length} onClick={applyPriceList} type="button"><BookOpen size={14} /> Applica prezzario</button><button className="filter-reset" onClick={savePricesToArchive} type="button"><Plus size={14} /> Salva prezzi</button><button className="filter-reset" disabled={isImporting} onClick={() => setFormData({ ...formData, items: [...formData.items, emptyItem()] })} type="button"><Plus size={14} /> Aggiungi voce</button></div></div>{importMessage && <div className="computo-import-success"><FileSpreadsheet size={16} /> {importMessage}</div>}{priceMessage && <div className="price-match-message"><BookOpen size={15} /> {priceMessage}</div>}{importWarnings.map((warning) => <div className="computo-import-warning" key={warning}>{warning}. Verifica il documento prima di salvarlo.</div>)}<div className="quote-editor-columns"><span></span><span>Descrizione</span><span>Quantità</span><span>U.M.</span><span>Costo unitario</span><span></span></div>{formData.items.map((item) => <div className={`quote-editor-row ${draggedItemId === item.id ? "dragging" : ""} ${dragOverItemId === item.id ? "drag-over" : ""}`} key={item.id} onDragOver={(event) => { event.preventDefault(); setDragOverItemId(item.id); }} onDrop={(event) => { event.preventDefault(); moveItem(draggedItemId, item.id); setDraggedItemId(null); setDragOverItemId(null); }}><button aria-label={`Trascina ${item.description || "voce"}`} className="quote-drag-handle" draggable onDragEnd={() => { setDraggedItemId(null); setDragOverItemId(null); }} onDragStart={(event) => { setDraggedItemId(item.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.id); }} title="Trascina sopra o sotto" type="button"><GripVertical size={17} /></button><input aria-label="Descrizione voce" onChange={(e) => updateItem(item.id, "description", e.target.value)} placeholder="Descrizione lavorazione" value={item.description} /><input aria-label="Quantità" min="0.01" onChange={(e) => updateItem(item.id, "quantity", e.target.value)} step="0.01" type="number" value={item.quantity} /><input aria-label="Unità" onChange={(e) => updateItem(item.id, "unit", e.target.value)} value={item.unit} /><input aria-label="Costo unitario" min="0" onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)} step="0.01" type="number" value={item.unitPrice} /><button aria-label="Rimuovi voce" className="quote-remove-item" disabled={formData.items.length === 1} onClick={() => setFormData({ ...formData, items: formData.items.filter((row) => row.id !== item.id) })} type="button"><Trash2 size={15} /></button></div>)}</div>
    <div className="form-grid"><label><span>Sconto %</span><input max="100" min="0" onChange={(e) => setFormData({ ...formData, discount: e.target.value })} type="number" value={formData.discount} /></label><label><span>IVA %</span><input max="100" min="0" onChange={(e) => setFormData({ ...formData, vatRate: e.target.value })} type="number" value={formData.vatRate} /></label></div>
    <label><span>Note e condizioni</span><textarea onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Tempi di consegna, modalità di pagamento..." rows="3" value={formData.notes} /></label>
    <div className="quote-modal-total"><span>Totale calcolato</span><strong>{formatCurrency(total)}</strong></div>
    <div className="modal-actions"><button className="ghost-button" onClick={onClose} type="button">Annulla</button><button className="primary-button" disabled={isSaving} type="submit">{isSaving ? "Salvataggio" : "Salva preventivo"}</button></div>{errorMessage && <p className="form-error">{errorMessage}</p>}
  </form></section></div>;
}
