import { useState } from "react";
import { Building2 } from "lucide-react";
import { supabase } from "../../services/supabaseClient.js";

export function AuthPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage("Credenziali non valide o utente non ancora attivo.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-hero" aria-label="Accesso CRM Gei">
        <div className="brand large-brand">
          <div className="brand-mark" aria-hidden="true">
            <Building2 size={26} strokeWidth={2.2} />
          </div>
          <div>
            <strong>CRM Gei</strong>
            <span>Accesso riservato al team</span>
          </div>
        </div>
      </section>
      <section className="panel auth-panel">
        <p className="eyebrow">Supabase</p>
        <h1>Accedi al CRM</h1>
        <p className="auth-copy">Usa il tuo account aziendale per lavorare su clienti, agenda e cantieri.</p>

        <form className="appointment-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {errorMessage && <p className="form-error">{errorMessage}</p>}
          <button className="primary-button full-width" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Accesso in corso" : "Accedi"}
          </button>
        </form>
      </section>
    </main>
  );
}
