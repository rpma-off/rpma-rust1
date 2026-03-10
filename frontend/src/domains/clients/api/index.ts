/**
 * clients Domain - Public API
 */

export { ClientsProvider, useClientsContext } from './ClientsProvider';
/** TODO: document */
export { useClients } from '../hooks/useClients';
/** TODO: document */
export { useClientsPage } from '../hooks/useClientsPage';
/** TODO: document */
export { useClient } from '../hooks/useClient';
/** TODO: document */
export { useClientStats } from '../hooks/useClientStats';
/** TODO: document */
export { useClientDetailPage } from '../hooks/useClientDetailPage';
/** TODO: document */
export { useEditClientPage } from '../hooks/useEditClientPage';
/** TODO: document */
export { useNewClientPage } from '../hooks/useNewClientPage';
/** TODO: document */
export { computeClientStats } from '../utils/client-stats';
/** TODO: document */
export type { LocalClientStats } from '../utils/client-stats';

/** TODO: document */
export { ClientCard } from '../components/ClientCard';
/** TODO: document */
export { ClientDetail } from '../components/ClientDetail';
/** TODO: document */
export { ClientForm } from '../components/ClientForm';
/** TODO: document */
export { ClientList } from '../components/ClientList';
/** TODO: document */
export { ClientSelector } from '../components/ClientSelector';

/** TODO: document */
export {
  ClientService,
  clientService,
  ClientCreationService,
  TechnicianService,
} from '../server';

/** TODO: document */
export { clientIpc } from '../ipc';

/** TODO: document */
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
