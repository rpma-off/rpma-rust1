import { Client } from '@/lib/backend';
import { normalizeOptionalText } from '@/lib/utils';
import { ClientService } from './client.service';

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
        // normalizeOptionalText trims and converts empty strings to null; ?? undefined
        // converts that null to undefined to satisfy the DTO's optional field type.
        email: normalizeOptionalText(customerData.email) ?? undefined,
        phone: normalizeOptionalText(customerData.phone?.replace(/\s/g, '')) ?? undefined,
        customer_type: 'individual' as const
      };

      const createResponse = await ClientService.createClient(clientData, sessionToken);
      if (createResponse.success && createResponse.data) {
        return { clientId: createResponse.data.id };
      }

      return { clientId: null, error: createResponse.error || 'Client creation failed' };
    } catch (error) {
      return { clientId: null, error: `Client operation failed: ${error}` };
    }
  }
}
