import { useEffect, useMemo, useState } from "react";
import { navItems } from "./data.js";
import {
  addCustomerNote,
  createAppointment,
  createCustomer,
  createOpportunity,
  createOpportunityStep,
  createPriceItem,
  createQuote,
  deletePriceItem,
  deleteQuote,
  demoUser,
  fetchCrmState,
  isDemoMode,
  saveCurrentProfile,
  setCustomerArchived,
  updateAppointment,
  updateCustomer,
  updateDisplayName,
  updateOpportunity,
  updateOpportunityStage,
  updateOpportunityStep,
  updatePriceItem,
  updateQuote,
} from "./services/dataSource.js";
import { isSupabaseConfigured, supabase } from "./services/supabaseClient.js";
import { initialCrmState } from "./store/seedData.js";
import { formatLongDate, fromDateKey, toDateKey } from "./utils/format.js";

import { Sidebar } from "./components/layout/Sidebar.jsx";
import { Topbar } from "./components/layout/Topbar.jsx";
import { ProfileModal } from "./components/layout/ProfileModal.jsx";
import { AppointmentModal } from "./components/layout/AppointmentModal.jsx";
import { AuthPage } from "./components/auth/AuthPage.jsx";
import { CenteredState, LoadingState } from "./components/shared/CenteredStates.jsx";
import { DashboardView } from "./components/dashboard/DashboardView.jsx";
import { OpportunitiesPage } from "./components/opportunita/OpportunitiesPage.jsx";
import { PriceListPage } from "./components/prezzario/PriceListPage.jsx";
import { QuotesPage } from "./components/preventivi/QuotesPage.jsx";
import { CustomersPage } from "./components/clienti/CustomersPage.jsx";
import { PratichePage } from "./components/pratiche/PratichePage.jsx";
import { AgendaPage } from "./components/agenda/AgendaPage.jsx";

function DemoModeBanner() {
  return (
    <p className="sync-banner">
      Modalità demo locale: dati di esempio, nessuna connessione Supabase attiva. Collega VITE_SUPABASE_URL e
      VITE_SUPABASE_PUBLISHABLE_KEY per passare ai dati reali.
    </p>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setActionError] = useState("");
  const [authLoading, setAuthLoading] = useState(!isDemoMode);
  const [currentDate] = useState(() => new Date());
  const [crmState, setCrmState] = useState(initialCrmState);
  const [dataLoading, setDataLoading] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [praticaDeepLinkId, setPraticaDeepLinkId] = useState(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [session, setSession] = useState(isDemoMode ? { user: demoUser } : null);
  const [userProfile, setUserProfile] = useState(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const todayKey = useMemo(() => toDateKey(currentDate), [currentDate]);
  const currentDateLabel = useMemo(() => formatLongDate(currentDate), [currentDate]);
  const pageTitle = navItems.find((item) => item.id === activeView)?.title || "Calendario operativo";
  const searchPlaceholder = {
    agenda: "Cerca nell'agenda",
    cantieri: "Cerca cantiere o referente",
    clienti: "Cerca cliente, referente o indirizzo",
    dashboard: "Cerca appuntamento, cliente o attività",
    opportunita: "Cerca opportunità o cliente",
    pratiche: "Cerca pratica, cliente o responsabile",
    prezzario: "Cerca codice, lavorazione o categoria",
    preventivi: "Cerca preventivo o cliente",
  }[activeView] || "Cerca nel CRM";
  const userLabel = userProfile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email || "Profilo";
  const sortedAppointments = useMemo(
    () => [...crmState.todayAppointments].sort((first, second) => first.time.localeCompare(second.time)),
    [crmState.todayAppointments],
  );
  const selectedAppointment = useMemo(
    () => crmState.appointments.find((appointment) => appointment.id === selectedAppointmentId) || null,
    [crmState.appointments, selectedAppointmentId],
  );

  useEffect(() => {
    if (isDemoMode) {
      return undefined;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session);
        setAuthLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setCrmState(initialCrmState);
      setEditingAppointment(null);
      setSelectedAppointmentId(null);
      setUserProfile(null);
      return;
    }

    let isMounted = true;

    async function loadData() {
      setDataLoading(true);
      setActionError("");

      try {
        const profile = await saveCurrentProfile(session.user);
        const nextState = await fetchCrmState();

        if (isMounted) {
          setUserProfile(profile);
          setCrmState(nextState);
        }
      } catch (error) {
        if (isMounted) {
          setActionError(error.message || "Non sono riuscito a caricare i dati.");
        }
      } finally {
        if (isMounted) {
          setDataLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [session]);

  useEffect(() => {
    if (selectedAppointmentId && !selectedAppointment) {
      setSelectedAppointmentId(null);
    }
  }, [selectedAppointment, selectedAppointmentId]);

  const handleOpenPratica = (praticaId) => {
    setPraticaDeepLinkId(praticaId);
    setActiveView("pratiche");
    setSearchQuery("");
  };

  const openNewAppointment = () => {
    setEditingAppointment(null);
    setIsAppointmentModalOpen(true);
  };

  const openEditAppointment = (appointment) => {
    setEditingAppointment(appointment);
    setIsAppointmentModalOpen(true);
  };

  const closeAppointmentModal = () => {
    setEditingAppointment(null);
    setIsAppointmentModalOpen(false);
  };

  const handleSelectAppointment = (appointmentId) => {
    const appointment = crmState.appointments.find((item) => item.id === appointmentId);
    setSelectedAppointmentId(appointmentId);

    if (appointment?.date) {
      const appointmentDate = fromDateKey(appointment.date);
      setVisibleMonth(new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), 1));
    }
  };

  const handleSaveAppointment = async (appointment) => {
    setActionError("");
    const savedAppointment = appointment.id
      ? await updateAppointment(appointment, session.user.id)
      : await createAppointment(appointment, session.user.id);
    const nextState = await fetchCrmState();

    setCrmState(nextState);
    setSelectedAppointmentId(savedAppointment.id);
    setVisibleMonth(new Date(fromDateKey(savedAppointment.date).getFullYear(), fromDateKey(savedAppointment.date).getMonth(), 1));
    setEditingAppointment(null);
    setIsAppointmentModalOpen(false);
  };

  const handleCreateCustomer = async (customer) => {
    setActionError("");
    const savedCustomer = await createCustomer(customer, session.user.id);
    const nextState = await fetchCrmState();

    setCrmState(nextState);

    return savedCustomer;
  };

  const handleUpdateCustomer = async (customer) => {
    setActionError("");
    const savedCustomer = await updateCustomer(customer, session.user.id);
    const nextState = await fetchCrmState();
    setCrmState(nextState);
    return savedCustomer;
  };

  const handleArchiveCustomer = async (customer, archived) => {
    setActionError("");
    const savedCustomer = await setCustomerArchived(customer, archived, session.user.id);
    const nextState = await fetchCrmState();
    setCrmState(nextState);
    return savedCustomer;
  };

  const handleAddCustomerNote = async (customerId, detail) => {
    setActionError("");
    await addCustomerNote(customerId, detail, session.user.id);
    const nextState = await fetchCrmState();
    setCrmState(nextState);
  };

  const handleCreateQuote = async (quote) => {
    setActionError("");
    const savedQuote = await createQuote(quote, session.user.id);
    const nextState = await fetchCrmState();
    setCrmState(nextState);
    return savedQuote;
  };

  const handleUpdateQuote = async (quote) => {
    setActionError("");
    const savedQuote = await updateQuote(quote, session.user.id);
    const nextState = await fetchCrmState();
    setCrmState(nextState);
    return savedQuote;
  };

  const handleDeleteQuote = async (quoteId) => {
    setActionError("");
    await deleteQuote(quoteId);
    const nextState = await fetchCrmState();
    setCrmState(nextState);
  };

  const handleCreatePriceItem = async (item) => {
    const saved = await createPriceItem(item, session.user.id);
    setCrmState(await fetchCrmState());
    return saved;
  };

  const handleUpdatePriceItem = async (item) => {
    const saved = await updatePriceItem(item, session.user.id);
    setCrmState(await fetchCrmState());
    return saved;
  };

  const handleDeletePriceItem = async (itemId) => {
    await deletePriceItem(itemId);
    setCrmState(await fetchCrmState());
  };

  const handleSavePriceItems = async (items) => {
    await Promise.all(items.map((item) => createPriceItem({
      active: true,
      category: "Da preventivo",
      code: "",
      description: item.description,
      unit: item.unit,
      unitPrice: item.unitPrice,
    }, session.user.id)));
    setCrmState(await fetchCrmState());
  };

  const handleCreateOpportunity = async (opportunity) => {
    setActionError("");
    const savedOpportunity = await createOpportunity(opportunity, session.user.id);
    const nextState = await fetchCrmState();

    setCrmState(nextState);
    return savedOpportunity;
  };

  const handleCreateOpportunityStep = async (step) => {
    setActionError("");
    const savedStep = await createOpportunityStep(step, session.user.id);
    const nextState = await fetchCrmState();

    setCrmState(nextState);
    return savedStep;
  };

  const handleUpdateOpportunity = async (opportunity) => {
    setActionError("");
    const savedOpportunity = await updateOpportunity(opportunity, session.user.id);
    const nextState = await fetchCrmState();

    setCrmState(nextState);
    return savedOpportunity;
  };

  const handleUpdateOpportunityStage = async (opportunityId, status) => {
    setActionError("");
    const savedOpportunity = await updateOpportunityStage(opportunityId, status, session.user.id);
    const nextState = await fetchCrmState();

    setCrmState(nextState);
    return savedOpportunity;
  };

  const handleUpdateOpportunityStep = async (step) => {
    setActionError("");
    const savedStep = await updateOpportunityStep(step, session.user.id);
    const nextState = await fetchCrmState();

    setCrmState(nextState);
    return savedStep;
  };

  const handleSaveDisplayName = async (displayName) => {
    setActionError("");
    const profile = await updateDisplayName(session.user, displayName);
    setUserProfile(profile);

    if (!isDemoMode) {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    }

    const nextState = await fetchCrmState();
    setCrmState(nextState);
  };

  const handleSignOut = async () => {
    if (isDemoMode) {
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setCrmState(initialCrmState);
    setEditingAppointment(null);
    setSelectedAppointmentId(null);
    setUserProfile(null);
  };

  if (!isDemoMode && !isSupabaseConfigured) {
    return (
      <CenteredState>
        <p className="eyebrow">Configurazione</p>
        <h1>Supabase non configurato</h1>
        <p className="auth-copy">Aggiungi URL e publishable key nelle variabili ambiente del progetto.</p>
      </CenteredState>
    );
  }

  if (authLoading) {
    return <LoadingState />;
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onViewChange={(view) => { setActiveView(view); setSearchQuery(""); }} userLabel={userLabel} />
      <main className="workspace">
        <Topbar
          currentDateLabel={currentDateLabel}
          onEditProfile={() => setIsProfileModalOpen(true)}
          onNewAppointment={openNewAppointment}
          onSearchChange={setSearchQuery}
          onSignOut={handleSignOut}
          searchPlaceholder={searchPlaceholder}
          searchQuery={searchQuery}
          title={pageTitle}
          userEmail={session.user.email}
          userLabel={userLabel}
        />
        {isDemoMode && <DemoModeBanner />}
        {dataLoading && <p className="sync-banner">Sincronizzazione in corso...</p>}
        {actionError && <p className="form-error workspace-error">{actionError}</p>}
        {activeView === "clienti" ? (
          <CustomersPage
            actionError={actionError}
            customers={crmState.customers}
            onAddCustomerNote={handleAddCustomerNote}
            onArchiveCustomer={handleArchiveCustomer}
            onCreateCustomer={handleCreateCustomer}
            onOpenOpportunities={() => { setActiveView("opportunita"); setSearchQuery(""); }}
            onUpdateCustomer={handleUpdateCustomer}
            opportunities={crmState.opportunities}
            searchQuery={searchQuery}
            teamMembers={crmState.teamMembers}
          />
        ) : activeView === "pratiche" ? (
          <PratichePage
            currentUserId={session.user.id}
            customers={crmState.customers}
            deepLinkPraticaId={praticaDeepLinkId}
            onDeepLinkHandled={() => setPraticaDeepLinkId(null)}
            searchQuery={searchQuery}
            teamMembers={crmState.teamMembers}
          />
        ) : activeView === "agenda" ? (
          <AgendaPage
            currentUserId={session.user.id}
            searchQuery={searchQuery}
            teamMembers={crmState.teamMembers}
          />
        ) : activeView === "opportunita" ? (
          <OpportunitiesPage
            actionError={actionError}
            customers={crmState.customers}
            onCreateOpportunity={handleCreateOpportunity}
            onCreateStep={handleCreateOpportunityStep}
            onUpdateOpportunity={handleUpdateOpportunity}
            onUpdateOpportunityStage={handleUpdateOpportunityStage}
            onUpdateStep={handleUpdateOpportunityStep}
            opportunities={crmState.opportunities}
            searchQuery={searchQuery}
            teamMembers={crmState.teamMembers}
          />
        ) : activeView === "prezzario" ? (
          <PriceListPage
            onCreate={handleCreatePriceItem}
            onDelete={handleDeletePriceItem}
            onUpdate={handleUpdatePriceItem}
            priceList={crmState.priceList || []}
            searchQuery={searchQuery}
          />
        ) : activeView === "preventivi" ? (
          <QuotesPage
            customers={crmState.customers}
            onCreateQuote={handleCreateQuote}
            onDeleteQuote={handleDeleteQuote}
            onSavePriceItems={handleSavePriceItems}
            onUpdateQuote={handleUpdateQuote}
            opportunities={crmState.opportunities}
            priceList={crmState.priceList || []}
            quotes={crmState.quotes || []}
            searchQuery={searchQuery}
          />
        ) : (
          <DashboardView
            appointments={sortedAppointments}
            currentDate={currentDate}
            crmState={crmState}
            onEditAppointment={openEditAppointment}
            onMonthChange={setVisibleMonth}
            onNewAppointment={openNewAppointment}
            onOpenPratica={handleOpenPratica}
            onSelectAppointment={handleSelectAppointment}
            selectedAppointment={selectedAppointment}
            selectedAppointmentId={selectedAppointmentId}
            searchQuery={searchQuery}
            todayKey={todayKey}
            visibleMonth={visibleMonth}
          />
        )}
      </main>
      <AppointmentModal
        appointment={editingAppointment}
        defaultDate={todayKey}
        isOpen={isAppointmentModalOpen}
        onClose={closeAppointmentModal}
        onSave={handleSaveAppointment}
        teamMembers={crmState.teamMembers}
      />
      <ProfileModal
        currentName={userProfile?.full_name || session.user.user_metadata?.full_name || ""}
        email={session.user.email}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={handleSaveDisplayName}
      />
    </div>
  );
}
