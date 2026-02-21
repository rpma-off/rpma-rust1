// Technician service
import { ipcClient } from '@/lib/ipc';
import { AuthSecureStorage } from '@/lib/secureStorage';

export interface Technician {
  id: string;
  userId: string;
  name: string;
  email: string;
  specialization: string[];
  isActive: boolean;
  workload: number; // 0-100
}

export class TechnicianService {
  static getInstance(): TechnicianService {
    return TechnicianService as unknown as TechnicianService;
  }

  private static async getSessionToken(): Promise<string> {
    const session = await AuthSecureStorage.getSession();
    if (!session.token) {
      throw new Error('Authentication required');
    }
    return session.token;
  }

  private static mapUserToTechnician(user: Record<string, unknown>): Technician {
    return {
      id: String(user.id || ''),
      userId: String(user.id || ''),
      name: String(user.full_name || user.name || user.email || ''),
      email: String(user.email || ''),
      specialization: Array.isArray(user.specialization) ? user.specialization.map(String) : [],
      isActive: user.is_active !== false && user.banned !== true,
      workload: typeof user.workload === 'number' ? user.workload : 0,
    };
  }

  static async getTechnicians(): Promise<Technician[]> {
    try {
      const token = await this.getSessionToken();
      const result = await ipcClient.users.list(100, 0, token);

      const users = (result.data || []) as Array<Record<string, unknown>>;
      return users
        .filter(u => u.role === 'technician' || u.role === 'Technician')
        .map(u => this.mapUserToTechnician(u));
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch technicians');
    }
  }

  static async getTechnician(id: string): Promise<Technician | null> {
    try {
      const token = await this.getSessionToken();
      const user = await ipcClient.users.get(id, token);

      if (!user) return null;
      const raw = user as unknown as Record<string, unknown>;
      return this.mapUserToTechnician(raw);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch technician');
    }
  }

  static async getAvailableTechnicians(): Promise<Technician[]> {
    try {
      const technicians = await this.getTechnicians();
      return technicians.filter(t => t.isActive && t.workload < 90);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch available technicians');
    }
  }
}

export const technicianService = TechnicianService;
