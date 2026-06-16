export const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "⌂", title: "Calendario operativo" },
  { id: "clienti", label: "Clienti", icon: "◌", title: "Clienti e contatti" },
  { id: "opportunita", label: "Opportunità", icon: "◇", title: "Opportunità di lavoro" },
  { id: "cantieri", label: "Cantieri", icon: "▦", title: "Cantieri attivi" },
  { id: "preventivi", label: "Preventivi", icon: "□", title: "Preventivi e offerte" },
  { id: "agenda", label: "Agenda", icon: "◷", title: "Agenda operativa" },
];

export const calendarEvents = [
  { day: 5, label: "Villa del Sole", type: "project" },
  { day: 8, label: "Sopralluogo Tigli", type: "visit" },
  { day: 10, label: "Preventivo Alba", type: "quote" },
  { day: 12, label: "Magnolie", type: "project" },
  { day: 15, label: "Richiamo Neri", type: "call" },
  { day: 16, label: "09:30 Studio Bianchi", type: "visit" },
  { day: 16, label: "16:00 Revisione", type: "quote" },
  { day: 17, label: "Corso Italia", type: "project" },
  { day: 19, label: "Invio scale", type: "quote" },
  { day: 23, label: "Follow-up Serena", type: "call" },
  { day: 24, label: "Avvio Casa Ferri", type: "project" },
  { day: 26, label: "SAL Aurora", type: "project" },
];

export const todayAppointments = [
  {
    time: "09:30",
    title: "Sopralluogo Studio Bianchi",
    detail: "Uffici piano terra, verifica pareti e misure.",
  },
  {
    time: "12:00",
    title: "Richiamare Amm. Neri",
    detail: "Conferma capitolato e scelta finiture scala.",
  },
  {
    time: "16:00",
    title: "Revisione preventivo Tigli",
    detail: "Controllo impermeabilizzazione e tempi squadra.",
  },
];

export const stats = [
  { label: "Appuntamenti oggi", value: "3", note: "1 sopralluogo, 2 follow-up" },
  { label: "Progetti da seguire", value: "11", note: "4 con scadenza entro 7 giorni" },
  { label: "Preventivi in attesa", value: "12", note: "€ 186k valore aperto" },
  { label: "Cantieri attivi", value: "9", note: "3 con priorità alta" },
];

export const pipeline = [
  {
    stage: "Nuove richieste",
    count: 6,
    deals: [
      { title: "Condominio Villa Serena", subtitle: "Rifacimento facciata", note: "Valore stimato € 42.000" },
      { title: "Sig.ra Moretti", subtitle: "Ristrutturazione bagno", note: "Sopralluogo da fissare" },
    ],
  },
  {
    stage: "Sopralluogo",
    count: 5,
    deals: [
      { title: "Studio Bianchi", subtitle: "Uffici piano terra", note: "Domani alle 09:30", tone: "accent" },
      { title: "Condominio Tigli", subtitle: "Impermeabilizzazione", note: "Tecnico: Marco" },
    ],
  },
  {
    stage: "Preventivo",
    count: 8,
    deals: [
      { title: "Impresa Alba", subtitle: "Opere interne", note: "Computo in revisione" },
      { title: "Amministratore Neri", subtitle: "Scala condominiale", note: "Invio entro venerdì", tone: "accent" },
    ],
  },
  {
    stage: "Accettati",
    count: 3,
    deals: [
      { title: "Casa Ferri", subtitle: "Cappotto termico", note: "Avvio 24 giugno", tone: "won" },
      { title: "Condominio Aurora", subtitle: "Ripristino balconi", note: "Contratto firmato", tone: "won" },
    ],
  },
];

export const projects = [
  { name: "Condominio Villa del Sole", work: "Facciata, ponteggi, tinteggiatura", progress: 68 },
  { name: "Residenza Le Magnolie", work: "Copertura e lattonerie", progress: 42 },
  { name: "Negozio Corso Italia", work: "Demolizioni e nuovi impianti", progress: 81 },
];

export const tasks = [
  { label: "Caricare foto sopralluogo Villa Serena", done: false },
  { label: "Inviare computo aggiornato", done: true },
  { label: "Preparare contratto Casa Ferri", done: false },
];
