export function CenteredState({ children }) {
  return (
    <main className="centered-state">
      <section className="panel auth-panel">{children}</section>
    </main>
  );
}

export function ConfigMissing() {
  return (
    <CenteredState>
      <p className="eyebrow">Configurazione</p>
      <h1>Supabase non configurato</h1>
      <p className="auth-copy">Aggiungi URL e publishable key nelle variabili ambiente del progetto.</p>
    </CenteredState>
  );
}

export function LoadingState() {
  return (
    <CenteredState>
      <p className="eyebrow">CRM Gei</p>
      <h1>Caricamento dati</h1>
      <p className="auth-copy">Sto preparando il gestionale con i dati Supabase.</p>
    </CenteredState>
  );
}
