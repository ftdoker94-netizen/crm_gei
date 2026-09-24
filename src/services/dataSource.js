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

export const fetchOpportunityStorico = (...args) => source.fetchOpportunityStorico(...args);
export const fetchOpportunityDocumenti = (...args) => source.fetchOpportunityDocumenti(...args);
export const createOpportunityDocumento = (...args) => source.createOpportunityDocumento(...args);
export const deleteOpportunityDocumento = (...args) => source.deleteOpportunityDocumento(...args);

export const fetchAgendaEventi = (...args) => source.fetchAgendaEventi(...args);
export const createAgendaEvento = (...args) => source.createAgendaEvento(...args);
export const deleteAgendaEvento = (...args) => source.deleteAgendaEvento(...args);

export const fetchCantieri = (...args) => source.fetchCantieri(...args);
export const createCantiere = (...args) => source.createCantiere(...args);
export const updateCantiere = (...args) => source.updateCantiere(...args);
export const fetchCantiereCosti = (...args) => source.fetchCantiereCosti(...args);
export const createCantiereCosto = (...args) => source.createCantiereCosto(...args);
export const deleteCantiereCosto = (...args) => source.deleteCantiereCosto(...args);
export const fetchCantiereOre = (...args) => source.fetchCantiereOre(...args);
export const createCantiereOra = (...args) => source.createCantiereOra(...args);
export const deleteCantiereOra = (...args) => source.deleteCantiereOra(...args);

export const fetchMovimentiCassa = (...args) => source.fetchMovimentiCassa(...args);
export const createMovimentoCassa = (...args) => source.createMovimentoCassa(...args);
export const deleteMovimentoCassa = (...args) => source.deleteMovimentoCassa(...args);
