/**
 * clients Domain - Public API
 */

export { ClientsProvider, useClientsContext } from './ClientsProvider';
export { useClients } from '../hooks/useClients';
export { useClientsPage } from '../hooks/useClientsPage';
export { useClient } from '../hooks/useClient';
export { useClientStats } from '../hooks/useClientStats';
export { useClientDetailPage } from '../hooks/useClientDetailPage';
export { useEditClientPage } from '../hooks/useEditClientPage';
export { useNewClientPage } from '../hooks/useNewClientPage';
export { computeClientStats } from '../utils/client-stats';
export type { LocalClientStats } from '../utils/client-stats';

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

export { clientIpc } from '../ipc';

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
