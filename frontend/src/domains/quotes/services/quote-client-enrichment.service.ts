import { clientIpc } from '@/domains/clients';
import type { Client } from '@/types/client.types';

/**
 * Fetches all clients and returns them as a lookup map.
 * Used to enrich quotes with client details.
 */
export async function fetchClientMap(): Promise<Record<string, Client>> {
  const response = await clientIpc.list({ search: '' });
  const map: Record<string, Client> = {};
  response.data.forEach((c: Client) => { map[c.id] = c; });
  return map;
}
