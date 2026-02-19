/**
 * clients Domain - Public API
 */

export { ClientsProvider, useClientsContext } from './ClientsProvider';
export { useClients } from '../hooks/useClients';
export { useClient } from '../hooks/useClient';
export { useClientStats } from '../hooks/useClientStats';

export { ClientCard } from '../components/ClientCard';
export { ClientDetail } from '../components/ClientDetail';
export { ClientForm } from '../components/ClientForm';
export { ClientList } from '../components/ClientList';
export { ClientSelector } from '../components/ClientSelector';

export {
  ClientService,
  clientService,
  ClientCreationService,
  TechnicianService,
} from '../server';

export type {
  Client,
  ClientWithTasks,
  ClientStatistics,
  CustomerType,
  Technician,
  UseClientsReturn,
  ClientFilters,
  UseClientReturn,
  UseClientStatsReturn,
} from './types';
