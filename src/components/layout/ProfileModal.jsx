import { useEffect, useState } from "react";

export function ProfileModal({ currentName, email, isOpen, onClose, onSave }) {
  const [displayName, setDisplayName] = useState(currentName || "");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentName || "");
      setErrorMessage("");
    }
  }, [currentName, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    try {
      await onSave(displayName);
      onClose();
    } catch (error) {
      setErrorMessage(error.message || "Non sono riuscito a salvare il nome.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="appointment-modal profile-modal" aria-labelledby="profile-title" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Profilo</p>
            <h2 id="profile-title">Nome visualizzato</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Chiudi">
            x
          </button>
        </div>

        <form className="appointment-form" onSubmit={handleSubmit}>
          <label>
            <span>Email account</span>
            <input disabled value={email || ""} />
          </label>
          <label>
            <span>Nome visualizzato nel CRM</span>
            <input
              autoComplete="name"
              maxLength="80"
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Es. Flaviano Gei"
              required
              value={displayName}
            />
          </label>
          {errorMessage && <p className="form-error">{errorMessage}</p>}
          <div className="modal-actions">
            <button className="ghost-button" onClick={onClose} type="button">
              Annulla
            </button>
            <button className="primary-button" disabled={isSaving} type="submit">
              {isSaving ? "Salvataggio" : "Salva nome"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
