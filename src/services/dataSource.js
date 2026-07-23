// Punto unico di accesso ai dati del CRM. Sceglie automaticamente tra le
// query Supabase reali (src/services/crmRepository.js) e il repository demo
// in memoria (src/mock/mockRepository.js) in base a isSupabaseConfigured.
//
// Quando in futuro collegherai Supabase, questo file non va toccato: basta
// che le variabili d'ambiente VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
// siano impostate e l'app userà automaticamente crmRepository.js.

import { isSupabaseConfigured } from "./supabaseClient.js";
import { DEMO_USER } from "../mock/mockData.js";
import * as realRepository from "./crmRepository.js";
import * as mockRepository from "../mock/mockRepository.js";

const source = isSupabaseConfigured ? realRepository : mockRepository;

export const isDemoMode = !isSupabaseConfigured;
export const demoUser = DEMO_USER;

// Solo per la modalità demo: permette di "vedere come" un altro collaboratore
// per verificare in locale che la visibilità per ruolo (vedi mockRepository.js
// / migrazione RLS) si comporti come atteso. In produzione (Supabase) il ruolo
// arriva da auth.uid() + crm_profiles, quindi queste funzioni non si usano.
export const getDemoActorId = mockRepository.getCurrentActorId;
export const setDemoActorId = mockRepository.setCurrentActorId;

export const saveCurrentProfile = (...args) => source.saveCurrentProfile(...args);
export const updateDisplayName = (...args) => source.updateDisplayName(...args);
export const fetchCrmState = (...args) => source.fetchCrmState(...args);

export const createCustomer = (...args) => source.createCustomer(...args);
export const updateCustomer = (...args) => source.updateCustomer(...args);
export const setCustomerArchived = (...args) => source.setCustomerArchived(...args);
export const addCustomerNote = (...args) => source.addCustomerNote(...args);

export const createQuote = (...args) => source.createQuote(...args);
export const updateQuote = (...args) => source.updateQuote(...args);
export const deleteQuote = (...args) => source.deleteQuote(...args);

export const createAppointment = (...args) => source.createAppointment(...args);
export const updateAppointment = (...args) => source.updateAppointment(...args);

export const createOpportunity = (...args) => source.createOpportunity(...args);
export const updateOpportunity = (...args) => source.updateOpportunity(...args);
export const updateOpportunityStage = (...args) => source.updateOpportunityStage(...args);
export const createOpportunityStep = (...args) => source.createOpportunityStep(...args);
export const updateOpportunityStep = (...args) => source.updateOpportunityStep(...args);

export const createPriceItem = (...args) => source.createPriceItem(...args);
export const updatePriceItem = (...args) => source.updatePriceItem(...args);
export const deletePriceItem = (...args) => source.deletePriceItem(...args);

export const fetchPraticheData = (...args) => source.fetchPraticheData(...args);
export const createPratica = (...args) => source.createPratica(...args);
export const moveToNextStep = (...args) => source.moveToNextStep(...args);
export const reassignResponsabile = (...args) => source.reassignResponsabile(...args);

export const fetchAgendaEventi = (...args) => source.fetchAgendaEventi(...args);
export const createAgendaEvento = (...args) => source.createAgendaEvento(...args);
export const deleteAgendaEvento = (...args) => source.deleteAgendaEvento(...args);

export const fetchPraticaDocumenti = (...args) => source.fetchPraticaDocumenti(...args);
export const createPraticaDocumento = (...args) => source.createPraticaDocumento(...args);
export const deletePraticaDocumento = (...args) => source.deletePraticaDocumento(...args);
