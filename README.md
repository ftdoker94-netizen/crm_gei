# CRM Gei

Base iniziale React/Vite per un CRM operativo dedicato a una azienda edile.

La home page mette al centro il calendario di lavoro e il CRM include clienti,
opportunita commerciali e preventivi con voci, IVA, sconti e stati di avanzamento.
I dati sono salvati nel progetto Supabase dedicato `CRM Gei`.

La schermata di creazione preventivo consente anche di importare un computo metrico
da PDF, XLSX o CSV: le voci riconosciute restano modificabili prima del salvataggio.

## Struttura

- `src/App.jsx`: composizione dell'interfaccia
- `src/data.js`: navigazione principale
- `src/services/`: client Supabase e repository CRM
- `src/styles.css`: tema grafico bianco con viola secondario
- `index.html`: entrypoint Vite
- `outputs/crm-edile-interface/`: copia consegnabile dell'interfaccia

## Configurazione Supabase

Creare un file `.env.local` con:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

In produzione le stesse variabili vanno configurate su Vercel. Il CRM usa solo
la publishable key nel frontend; la service-role key non deve essere esposta.

## Avvio

Installare le dipendenze:

```bash
npm install
```

Avviare l'app in sviluppo:

```bash
npm run dev
```

Creare una build di produzione:

```bash
npm run build
```

## Prossimi moduli

- Esportazione PDF e invio preventivi
- Cantieri, stati avanzamento e rapportini
- Inviti utenti aziendali e ruoli operativi
