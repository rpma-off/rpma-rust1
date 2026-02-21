// Technician service

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
    return TechnicianService;
  }

  static async getTechnicians(): Promise<Technician[]> {
    try {
      // Mock implementation
      return [
        {
          id: 'tech-1',
          userId: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          specialization: ['PPF', 'Ceramic Coating'],
          isActive: true,
          workload: 75,
        },
      ];
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch technicians');
    }
  }

  static async getTechnician(id: string): Promise<Technician | null> {
    try {
      const technicians = await this.getTechnicians();
      return technicians.find(t => t.id === id) || null;
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
