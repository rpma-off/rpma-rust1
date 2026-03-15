// Re-export from the canonical implementation in the clients domain.
// Consumers that imported from this shared path continue to work unchanged.
export { useClients } from '@/domains/clients';
export type { UseClientsReturn, ClientFilters, UseClientsOptions } from '@/domains/clients';
