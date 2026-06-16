# crm_gei

Base iniziale per un CRM operativo dedicato a una azienda edile.

La home page mette al centro il calendario di lavoro: appuntamenti, sopralluoghi,
follow-up, cantieri e progetti da seguire. Pipeline commerciale, avanzamento
cantieri e attivita restano disponibili come pannelli secondari.

## Struttura

- `index.html`: interfaccia principale
- `styles.css`: tema grafico bianco con viola secondario
- `script.js`: piccole interazioni UI
- `outputs/crm-edile-interface/`: copia consegnabile dell'interfaccia

## Avvio

Aprire `index.html` nel browser oppure servire la cartella con un server statico.

```bash
python -m http.server 8101 --bind 127.0.0.1
```

Poi visitare:

```text
http://127.0.0.1:8101/
```

## Prossimi moduli

- Anagrafiche clienti, amministratori e condomini
- Schede opportunita e pipeline commerciale
- Calendario con appuntamenti e scadenze reali
- Sopralluoghi, preventivi e documenti
- Cantieri, stati avanzamento e rapportini
- Autenticazione e ruoli operativi
