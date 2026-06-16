# crm_gei

Base iniziale React/Vite per un CRM operativo dedicato a una azienda edile.

La home page mette al centro il calendario di lavoro: appuntamenti, sopralluoghi,
follow-up, cantieri e progetti da seguire. L'app parte senza dati dimostrativi:
clienti e appuntamenti possono essere inseriti dall'interfaccia e restano nello
stato locale della sessione finche non verra collegato un database.

## Struttura

- `src/App.jsx`: composizione dell'interfaccia
- `src/data.js`: dati finti iniziali per calendario, pipeline e cantieri
- `src/styles.css`: tema grafico bianco con viola secondario
- `index.html`: entrypoint Vite
- `outputs/crm-edile-interface/`: copia consegnabile dell'interfaccia

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

- Anagrafiche clienti, amministratori e condomini
- Schede opportunita e pipeline commerciale
- Calendario con appuntamenti e scadenze reali
- Sopralluoghi, preventivi e documenti
- Cantieri, stati avanzamento e rapportini
- Autenticazione e ruoli operativi
