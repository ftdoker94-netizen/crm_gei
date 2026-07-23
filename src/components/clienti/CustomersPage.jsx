import { useEffect, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  ContactRound,
  History,
  Link2,
  Mail,
  MapPin,
  MessageSquarePlus,
  Pencil,
  Phone,
  RotateCcw,
  Send,
  SlidersHorizontal,
  StickyNote,
  Target,
  UserCheck,
  UserPlus,
  UserRound,
  WalletCards,
} from "lucide-react";
import { AssignmentSelector } from "../shared/AssignmentSelector.jsx";
import { customerStatuses, customerTypes } from "../../utils/constants.js";
import { assignmentSummary, formatCurrency, matchesSearch, parseCurrency } from "../../utils/format.js";

export function CustomersPage({
  actionError,
  customers,
  onAddCustomerNote,
  onArchiveCustomer,
  onCreateCustomer,
  onOpenOpportunities,
  onUpdateCustomer,
  opportunities = [],
  searchQuery = "",
  teamMembers = [],
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerNote, setCustomerNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [inlineActionError, setInlineActionError] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("tutti");
  const [customerStatusFilter, setCustomerStatusFilter] = useState("tutti");
  const [customerAssigneeFilter, setCustomerAssigneeFilter] = useState("tutti");
  const filteredCustomers = customers.filter((customer) =>
    (customerTypeFilter === "tutti" || customer.type === customerTypeFilter) &&
    (customerStatusFilter === "tutti" || customer.status === customerStatusFilter) &&
    (customerAssigneeFilter === "tutti" || customer.assignedUsers.some((user) => user.userId === customerAssigneeFilter)) &&
    matchesSearch(searchQuery, [customer.name, customer.primaryContact, customer.email, customer.phone, customer.address, customer.status]),
  );
  const selectedCustomer = filteredCustomers.find((customer) => customer.id === selectedCustomerId) || filteredCustomers[0];
  const customerOpportunities = opportunities.filter((opportunity) => opportunity.customerId === selectedCustomer?.id);
  const activeCustomers = customers.filter((customer) => customer.status.includes("attivo")).length;
  const condomini = customers.filter((customer) => customer.type === "Condominio").length;
  const openValueTotal = customers.reduce((total, customer) => total + parseCurrency(customer.openValue), 0);

  const handleSaveCustomer = async (customer) => {
    const savedCustomer = customer.id ? await onUpdateCustomer(customer) : await onCreateCustomer(customer);
    setSelectedCustomerId(savedCustomer.id);
    setEditingCustomer(null);
    setIsCustomerModalOpen(false);
  };

  const openCreateCustomer = () => {
    setEditingCustomer(null);
    setIsCustomerModalOpen(true);
  };

  const openEditCustomer = () => {
    setEditingCustomer(selectedCustomer);
    setIsCustomerModalOpen(true);
  };

  const handleArchiveCustomer = async () => {
    if (!selectedCustomer) return;
    setIsArchiving(true);
    setInlineActionError("");
    try {
      await onArchiveCustomer(selectedCustomer, selectedCustomer.status !== "Archiviato");
    } catch (error) {
      setInlineActionError(error.message || "Non sono riuscito ad aggiornare lo stato del cliente.");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleAddNote = async (event) => {
    event.preventDefault();
    if (!selectedCustomer || !customerNote.trim()) return;
    setIsSavingNote(true);
    setInlineActionError("");
    try {
      await onAddCustomerNote(selectedCustomer.id, customerNote);
      setCustomerNote("");
    } catch (error) {
      setInlineActionError(error.message || "Non sono riuscito a salvare la nota.");
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <section className="customers-page">
      <section className="quick-stats compact-stats" aria-label="Indicatori clienti">
        <article className="stat-card">
          <div className="stat-card-heading"><span>Clienti totali</span><ContactRound aria-hidden="true" size={19} /></div>
          <strong>{customers.length}</strong>
          <small>Anagrafiche operative</small>
        </article>
        <article className="stat-card">
          <div className="stat-card-heading"><span>Cantieri collegati</span><BriefcaseBusiness aria-hidden="true" size={19} /></div>
          <strong>{activeCustomers}</strong>
          <small>Clienti con lavori attivi</small>
        </article>
        <article className="stat-card">
          <div className="stat-card-heading"><span>Condomini</span><Building2 aria-hidden="true" size={19} /></div>
          <strong>{condomini}</strong>
          <small>Amministratori da seguire</small>
        </article>
        <article className="stat-card">
          <div className="stat-card-heading"><span>Valore aperto</span><WalletCards aria-hidden="true" size={19} /></div>
          <strong>{formatCurrency(openValueTotal)}</strong>
          <small>Somma dei valori inseriti</small>
        </article>
      </section>

      <section className="customers-layout">
        <div className="panel customers-list-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Anagrafiche</p>
              <h2>Clienti</h2>
            </div>
            <button className="primary-button" onClick={openCreateCustomer} type="button">
              <UserPlus aria-hidden="true" size={17} /> Nuovo cliente
            </button>
          </div>
          <div className="filter-strip list-filters" aria-label="Filtri clienti">
            <div className="filter-summary">
              <span className="filter-summary-icon" aria-hidden="true"><SlidersHorizontal size={16} /></span>
              <div>
                <strong>Filtra clienti</strong>
                <span className="filter-count">{filteredCustomers.length} di {customers.length} risultati</span>
              </div>
              {(customerTypeFilter !== "tutti" || customerStatusFilter !== "tutti" || customerAssigneeFilter !== "tutti") && (
                <button className="filter-reset" onClick={() => { setCustomerTypeFilter("tutti"); setCustomerStatusFilter("tutti"); setCustomerAssigneeFilter("tutti"); }} type="button">
                  <RotateCcw aria-hidden="true" size={13} /> Azzera
                </button>
              )}
            </div>
            <label className="filter-field">
              <span>Tipo</span>
              <select onChange={(event) => setCustomerTypeFilter(event.target.value)} value={customerTypeFilter}>
                <option value="tutti">Tutti</option>
                {customerTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="filter-field">
              <span>Stato</span>
              <select onChange={(event) => setCustomerStatusFilter(event.target.value)} value={customerStatusFilter}>
                <option value="tutti">Tutti</option>
                {customerStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label className="filter-field">
              <span>Responsabile</span>
              <select onChange={(event) => setCustomerAssigneeFilter(event.target.value)} value={customerAssigneeFilter}>
                <option value="tutti">Tutto il team</option>
                {teamMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
          </div>
          {actionError && <p className="form-error">{actionError}</p>}

          <div className="customers-list" role="list">
            {filteredCustomers.length ? (
              filteredCustomers.map((customer) => (
                <button
                  className={`customer-row ${selectedCustomer?.id === customer.id ? "selected" : ""}`}
                  key={customer.id}
                  onClick={() => setSelectedCustomerId(customer.id)}
                  type="button"
                >
                  <span className="customer-avatar" aria-hidden="true">{customer.name.charAt(0).toUpperCase()}</span>
                  <div>
                    <strong>{customer.name}</strong>
                    <span>{customer.primaryContact}</span>
                  </div>
                  <div className="customer-row-trailing">
                    <small>{customer.status}</small>
                    <ChevronRight aria-hidden="true" size={17} />
                  </div>
                </button>
              ))
            ) : (
              <div className="empty-state">
                <strong>Nessuna anagrafica cliente</strong>
                <span>Inserisci il primo cliente reale della tua azienda.</span>
              </div>
            )}
          </div>
        </div>

        {selectedCustomer && (
          <article className="panel customer-detail-panel">
            <div className="customer-detail-header">
              <div>
                <p className="eyebrow">{selectedCustomer.type}</p>
                <h2>{selectedCustomer.name}</h2>
              </div>
              <div className="detail-header-actions">
                <span className="status-badge">{selectedCustomer.status}</span>
                <button className="icon-label-button" onClick={openEditCustomer} type="button">
                  <Pencil aria-hidden="true" size={15} /> Modifica
                </button>
                <button className="icon-label-button" disabled={isArchiving} onClick={handleArchiveCustomer} type="button">
                  {selectedCustomer.status === "Archiviato" ? <ArchiveRestore aria-hidden="true" size={15} /> : <Archive aria-hidden="true" size={15} />}
                  {isArchiving ? "Salvataggio" : selectedCustomer.status === "Archiviato" ? "Riattiva" : "Archivia"}
                </button>
              </div>
            </div>

            <div className="customer-quick-actions" aria-label="Azioni rapide cliente">
              <a className={`quick-action ${selectedCustomer.phone === "Non indicato" ? "disabled" : ""}`} href={selectedCustomer.phone === "Non indicato" ? undefined : `tel:${selectedCustomer.phone.replace(/\s/g, "")}`}>
                <Phone aria-hidden="true" size={16} /> Chiama
              </a>
              <a className={`quick-action ${selectedCustomer.email === "Non indicata" ? "disabled" : ""}`} href={selectedCustomer.email === "Non indicata" ? undefined : `mailto:${selectedCustomer.email}`}>
                <Mail aria-hidden="true" size={16} /> Scrivi email
              </a>
              <button className="quick-action" onClick={onOpenOpportunities} type="button">
                <Target aria-hidden="true" size={16} /> Opportunità
              </button>
            </div>
            {inlineActionError && <p className="form-error">{inlineActionError}</p>}

            <div className="customer-contact-grid">
              <div>
                <span><UserRound aria-hidden="true" size={14} /> Referente</span>
                <strong>{selectedCustomer.primaryContact}</strong>
              </div>
              <div>
                <span><Phone aria-hidden="true" size={14} /> Telefono</span>
                <strong>{selectedCustomer.phone}</strong>
              </div>
              <div>
                <span><Mail aria-hidden="true" size={14} /> Email</span>
                <strong>{selectedCustomer.email}</strong>
              </div>
              <div>
                <span><MapPin aria-hidden="true" size={14} /> Indirizzo</span>
                <strong>{selectedCustomer.address}</strong>
              </div>
            </div>

            <div className="customer-work-grid">
              <div>
                <span><History aria-hidden="true" size={14} /> Ultimo contatto</span>
                <strong>{selectedCustomer.lastContact}</strong>
              </div>
              <div>
                <span><WalletCards aria-hidden="true" size={14} /> Valore aperto</span>
                <strong>{selectedCustomer.openValue}</strong>
              </div>
              <div>
                <span>Inserito da</span>
                <strong>{selectedCustomer.createdBy}</strong>
              </div>
              <div>
                <span>Ultima modifica</span>
                <strong>{selectedCustomer.updatedBy}</strong>
              </div>
              <div>
                <span><UserCheck aria-hidden="true" size={14} /> Assegnato a</span>
                <strong>{assignmentSummary(selectedCustomer.assignedUsers)}</strong>
              </div>
            </div>

            <div className="linked-section">
              <h3><Link2 aria-hidden="true" size={16} /> Lavori collegati</h3>
              <div className="tag-list">
                {(selectedCustomer.projects.length ? selectedCustomer.projects : ["Nessun lavoro collegato"]).map((project) => (
                  <span className="work-tag" key={project}>
                    {project}
                  </span>
                ))}
              </div>
            </div>

            <div className="linked-section">
              <h3><StickyNote aria-hidden="true" size={16} /> Note operative</h3>
              <div className="tag-list">
                {(selectedCustomer.tags.length ? selectedCustomer.tags : ["Nessuna nota"]).map((tag) => (
                  <span className="note-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="linked-section">
              <div className="linked-section-heading">
                <h3><Target aria-hidden="true" size={16} /> Opportunità collegate</h3>
                <span>{customerOpportunities.length}</span>
              </div>
              <div className="linked-opportunities">
                {customerOpportunities.length ? customerOpportunities.map((opportunity) => (
                  <button className="linked-opportunity-card" key={opportunity.id} onClick={onOpenOpportunities} type="button">
                    <div>
                      <strong>{opportunity.title}</strong>
                      <span>{opportunity.nextAction || opportunity.type}</span>
                    </div>
                    <div>
                      <small>{opportunity.estimatedValue}</small>
                      <ChevronRight aria-hidden="true" size={16} />
                    </div>
                  </button>
                )) : <p className="empty-inline">Nessuna opportunità collegata a questo cliente.</p>}
              </div>
            </div>

            <div className="linked-section customer-history-section">
              <div className="linked-section-heading">
                <h3><History aria-hidden="true" size={16} /> Cronologia cliente</h3>
                <span>{selectedCustomer.activities?.length || 0}</span>
              </div>
              <form className="customer-note-form" onSubmit={handleAddNote}>
                <MessageSquarePlus aria-hidden="true" size={17} />
                <input aria-label="Nuova nota cliente" onChange={(event) => setCustomerNote(event.target.value)} placeholder="Aggiungi una nota o un aggiornamento..." value={customerNote} />
                <button aria-label="Salva nota" disabled={isSavingNote || !customerNote.trim()} type="submit">
                  <Send aria-hidden="true" size={16} />
                </button>
              </form>
              <ol className="customer-timeline">
                {(selectedCustomer.activities || []).length ? selectedCustomer.activities.map((activity) => (
                  <li key={activity.id}>
                    <span className="timeline-dot" aria-hidden="true"></span>
                    <div>
                      <strong>{activity.detail}</strong>
                      <small>{activity.dateLabel} · {activity.actor}</small>
                    </div>
                  </li>
                )) : <li className="empty-inline">Nessuna attività registrata.</li>}
              </ol>
            </div>
          </article>
        )}
      </section>
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => { setEditingCustomer(null); setIsCustomerModalOpen(false); }}
        onSave={handleSaveCustomer}
        customer={editingCustomer}
        teamMembers={teamMembers}
      />
    </section>
  );
}

function CustomerModal({ customer, isOpen, onClose, onSave, teamMembers = [] }) {
  const [formData, setFormData] = useState({
    address: "",
    assignedUserIds: [],
    email: "",
    name: "",
    openValue: "",
    phone: "",
    primaryContact: "",
    projects: "",
    status: "Nuova richiesta",
    tags: "",
    type: "Privato",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage("");
    setFormData({
      address: customer?.address === "Indirizzo da completare" ? "" : customer?.address || "",
      assignedUserIds: customer?.assignedUsers?.map((user) => user.userId) || [],
      email: customer?.email === "Non indicata" ? "" : customer?.email || "",
      name: customer?.name || "",
      openValue: customer?.openValue || "",
      phone: customer?.phone === "Non indicato" ? "" : customer?.phone || "",
      primaryContact: customer?.primaryContact || "",
      projects: customer?.projects?.join(", ") || "",
      status: customer?.status || "Nuova richiesta",
      tags: customer?.tags?.join(", ") || "",
      type: customer?.type || "Privato",
    });
  }, [customer, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const splitField = (value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    const name = formData.name.trim();
    const primaryContact = formData.primaryContact.trim();

    if (!name || !primaryContact) {
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        address: formData.address.trim() || "Indirizzo da completare",
        assignedUserIds: formData.assignedUserIds,
        email: formData.email.trim() || "Non indicata",
        id: customer?.id,
        name,
        openValue: formData.openValue.trim() || "€ 0",
        phone: formData.phone.trim() || "Non indicato",
        primaryContact,
        projects: splitField(formData.projects),
        status: formData.status,
        tags: splitField(formData.tags),
        type: formData.type,
      });

    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a salvare il cliente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="appointment-modal" aria-labelledby="customer-title" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Anagrafica</p>
            <h2 id="customer-title">{customer ? "Modifica cliente" : "Nuovo cliente"}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Chiudi">
            x
          </button>
        </div>

        <form className="appointment-form" onSubmit={handleSubmit}>
          <label>
            <span>Nome cliente</span>
            <input
              name="name"
              onChange={handleChange}
              placeholder="Es. Condominio Verdi"
              required
              value={formData.name}
            />
          </label>

          <div className="form-grid">
            <label>
              <span>Tipo</span>
              <select name="type" onChange={handleChange} value={formData.type}>
                {customerTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Stato</span>
              <select name="status" onChange={handleChange} value={formData.status}>
                {customerStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            <span>Referente principale</span>
            <input
              name="primaryContact"
              onChange={handleChange}
              placeholder="Es. Amm. Mario Rossi"
              required
              value={formData.primaryContact}
            />
          </label>

          <div className="form-grid">
            <label>
              <span>Telefono</span>
              <input name="phone" onChange={handleChange} placeholder="+39 ..." value={formData.phone} />
            </label>

            <label>
              <span>Email</span>
              <input name="email" onChange={handleChange} placeholder="cliente@example.it" value={formData.email} />
            </label>
          </div>

          <label>
            <span>Indirizzo</span>
            <input
              name="address"
              onChange={handleChange}
              placeholder="Via, civico, città"
              value={formData.address}
            />
          </label>

          <div className="form-grid">
            <label>
              <span>Valore aperto</span>
              <input name="openValue" onChange={handleChange} placeholder="€ 25.000" value={formData.openValue} />
            </label>

            <label>
              <span>Lavori collegati</span>
              <input
                name="projects"
                onChange={handleChange}
                placeholder="Facciata, tetto, bagno"
                value={formData.projects}
              />
            </label>
          </div>

          <label>
            <span>Note operative</span>
            <input
              name="tags"
              onChange={handleChange}
              placeholder="Alta priorità, da richiamare"
              value={formData.tags}
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
              {isSaving ? "Salvataggio" : customer ? "Salva modifiche" : "Salva cliente"}
            </button>
          </div>
          {errorMessage && <p className="form-error">{errorMessage}</p>}
        </form>
      </section>
    </div>
  );
}
