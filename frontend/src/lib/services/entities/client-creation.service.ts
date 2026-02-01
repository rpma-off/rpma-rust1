import { ClientService } from './client.service';
import { Client } from '@/lib/backend';

export class ClientCreationService {
  static async findOrCreateClient(
    customerData: { name: string; email?: string; phone?: string },
    sessionToken: string
  ): Promise<{ clientId: string | null; error?: string }> {
    try {
      // First try to find existing client
      if (customerData.email) {
        const clientsResponse = await ClientService.getClients(sessionToken);
        if (clientsResponse.success && clientsResponse.data?.data) {
          const existingClient = clientsResponse.data.data.find(
            (client: Client) => client.email?.toLowerCase() === customerData.email?.toLowerCase()
          );
          if (existingClient) {
            return { clientId: existingClient.id };
          }
        }
      }

      // Create new client
      const clientData = {
        name: customerData.name.trim(),
        email: customerData.email?.trim(),
        phone: customerData.phone?.replace(/\s/g, ''),
        customer_type: 'individual' as const
      };

      const createResponse = await ClientService.createClient(clientData, sessionToken);
      if (createResponse.success && createResponse.data) {
        return { clientId: createResponse.data.id };
      }

      return { clientId: null, error: typeof createResponse.error === 'string' ? createResponse.error : (createResponse.error as any)?.message || 'Client creation failed' };
    } catch (error) {
      return { clientId: null, error: `Client operation failed: ${error}` };
    }
  }
}