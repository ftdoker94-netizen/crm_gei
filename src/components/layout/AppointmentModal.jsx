import { useEffect, useState } from "react";
import { AssignmentSelector } from "../shared/AssignmentSelector.jsx";
import { appointmentTypes } from "../../utils/constants.js";

export function AppointmentModal({ appointment, defaultDate, isOpen, onClose, onSave, teamMembers = [] }) {
  const [formData, setFormData] = useState({
    assignedUserIds: [],
    date: defaultDate,
    time: "10:00",
    type: "appointment",
    title: "",
    related: "",
    detail: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(appointment?.id);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        assignedUserIds: appointment?.assignedUsers?.map((user) => user.userId) || [],
        date: appointment?.date || defaultDate,
        time: appointment?.time || "10:00",
        type: appointment?.type || "appointment",
        title: appointment?.title || "",
        related: appointment?.related || "",
        detail: appointment?.detail === "Dettagli da completare." ? "" : appointment?.detail || "",
      });
      setErrorMessage("");
    }
  }, [appointment, defaultDate, isOpen]);

  if (!isOpen) {
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
      await onSave({
        id: appointment?.id,
        assignedUserIds: formData.assignedUserIds,
        date: formData.date,
        detail: formData.detail.trim() || "Dettagli da completare.",
        related: formData.related.trim(),
        time: formData.time,
        title,
        type: formData.type,
      });

      setFormData({
        assignedUserIds: [],
        date: defaultDate,
        time: "10:00",
        type: "appointment",
        title: "",
        related: "",
        detail: "",
      });
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a salvare l'appuntamento.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="appointment-modal" aria-labelledby="appointment-title" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Calendario</p>
            <h2 id="appointment-title">{isEditing ? "Modifica appuntamento" : "Nuovo appuntamento"}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Chiudi">
            x
          </button>
        </div>

        <form className="appointment-form" onSubmit={handleSubmit}>
          <label>
            <span>Titolo</span>
            <input
              name="title"
              onChange={handleChange}
              placeholder="Es. Sopralluogo Condominio Verdi"
              required
              value={formData.title}
            />
          </label>

          <div className="form-grid">
            <label>
              <span>Data</span>
              <input name="date" onChange={handleChange} required type="date" value={formData.date} />
            </label>

            <label>
              <span>Ora</span>
              <input
                inputMode="numeric"
                name="time"
                onChange={handleChange}
                pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$"
                placeholder="14:30"
                title="Usa il formato HH:MM, ad esempio 14:30"
                value={formData.time}
              />
            </label>
          </div>

          <label>
            <span>Tipo</span>
            <select name="type" onChange={handleChange} value={formData.type}>
              {appointmentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Cliente o progetto collegato</span>
            <input
              name="related"
              onChange={handleChange}
              placeholder="Es. Amministratore Neri"
              value={formData.related}
            />
          </label>

          <label>
            <span>Note operative</span>
            <textarea
              name="detail"
              onChange={handleChange}
              placeholder="Misure da prendere, documenti da portare, tecnico assegnato..."
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
              {isSaving ? "Salvataggio" : isEditing ? "Salva modifiche" : "Salva appuntamento"}
            </button>
          </div>
          {errorMessage && <p className="form-error">{errorMessage}</p>}
        </form>
      </section>
    </div>
  );
}
