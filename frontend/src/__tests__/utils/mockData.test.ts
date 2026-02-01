import {
  generateTaskCompletionData,
  generateStatusDistributionData,
  generateTechnicianPerformanceData,
  generateClientAnalyticsData,
  generateQualityMetricsData,
  generateMaterialUsageData,
} from '../../app/reports/utils/mockData';

describe('Mock Data Generators', () => {
  describe('generateTaskCompletionData', () => {
    it('generates correct number of days', () => {
      const data = generateTaskCompletionData(30);
      expect(data).toHaveLength(30);
    });

    it('generates data with correct structure', () => {
      const data = generateTaskCompletionData(1);
      expect(data[0]).toHaveProperty('date');
      expect(data[0]).toHaveProperty('completed');
      expect(data[0]).toHaveProperty('inProgress');
      expect(data[0]).toHaveProperty('pending');
      expect(data[0]).toHaveProperty('total');
    });

    it('generates valid dates', () => {
      const data = generateTaskCompletionData(5);
      data.forEach((item) => {
        expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const date = new Date(item.date);
        expect(date).toBeInstanceOf(Date);
        expect(isNaN(date.getTime())).toBe(false);
      });
    });

    it('generates reasonable numeric values', () => {
      const data = generateTaskCompletionData(10);
      data.forEach((item) => {
        expect(typeof item.completed).toBe('number');
        expect(typeof item.inProgress).toBe('number');
        expect(typeof item.pending).toBe('number');
        expect(typeof item.total).toBe('number');

        expect(item.completed).toBeGreaterThanOrEqual(0);
        expect(item.inProgress).toBeGreaterThanOrEqual(0);
        expect(item.pending).toBeGreaterThanOrEqual(0);
        expect(item.total).toBe(item.completed + item.inProgress + item.pending);
      });
    });

    it('generates default 30 days when no parameter provided', () => {
      const data = generateTaskCompletionData();
      expect(data).toHaveLength(30);
    });
  });

  describe('generateStatusDistributionData', () => {
    it('generates status distribution data', () => {
      const data = generateStatusDistributionData();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      data.forEach((item) => {
        expect(item).toHaveProperty('status');
        expect(item).toHaveProperty('count');
        expect(item).toHaveProperty('percentage');
        expect(item).toHaveProperty('color');

        expect(typeof item.count).toBe('number');
        expect(typeof item.percentage).toBe('number');
        expect(typeof item.color).toBe('string');

        expect(item.count).toBeGreaterThanOrEqual(0);
        expect(item.percentage).toBeGreaterThanOrEqual(0);
        expect(item.percentage).toBeLessThanOrEqual(100);
      });
    });

    it('ensures percentages sum to approximately 100', () => {
      const data = generateStatusDistributionData();
      const totalPercentage = data.reduce((sum, item) => sum + item.percentage, 0);
      // Allow for rounding differences (should be very close to 100)
      expect(totalPercentage).toBeGreaterThanOrEqual(95);
      expect(totalPercentage).toBeLessThanOrEqual(105);
    });
  });

  describe('generateTechnicianPerformanceData', () => {
    it('generates technician performance data', () => {
      const data = generateTechnicianPerformanceData();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      data.forEach((item) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('tasksCompleted');
        expect(item).toHaveProperty('averageTimePerTask');
        expect(item).toHaveProperty('qualityScore');
        expect(item).toHaveProperty('customerSatisfaction');
        expect(item).toHaveProperty('utilizationRate');

        expect(typeof item.tasksCompleted).toBe('number');
        expect(typeof item.averageTimePerTask).toBe('number');
        expect(typeof item.qualityScore).toBe('number');
        expect(typeof item.customerSatisfaction).toBe('number');
        expect(typeof item.utilizationRate).toBe('number');

        expect(item.tasksCompleted).toBeGreaterThanOrEqual(0);
        expect(item.averageTimePerTask).toBeGreaterThan(0);
        expect(item.qualityScore).toBeGreaterThanOrEqual(0);
        expect(item.qualityScore).toBeLessThanOrEqual(100);
        expect(item.customerSatisfaction).toBeGreaterThanOrEqual(0);
        expect(item.customerSatisfaction).toBeLessThanOrEqual(5);
        expect(item.utilizationRate).toBeGreaterThanOrEqual(0);
        expect(item.utilizationRate).toBeLessThanOrEqual(100);
      });
    });

    it('generates valid names and IDs', () => {
      const data = generateTechnicianPerformanceData();

      data.forEach((item) => {
        expect(typeof item.id).toBe('string');
        expect(typeof item.name).toBe('string');
        expect(item.id.length).toBeGreaterThan(0);
        expect(item.name.length).toBeGreaterThan(0);
      });
    });
  });

  describe('generateClientAnalyticsData', () => {
    it('generates client analytics data with correct structure', () => {
      const data = generateClientAnalyticsData();

      expect(data).toHaveProperty('totalClients');
      expect(data).toHaveProperty('newClientsThisMonth');
      expect(data).toHaveProperty('returningClients');
      expect(data).toHaveProperty('clientRetentionRate');
      expect(data).toHaveProperty('averageRevenuePerClient');
      expect(data).toHaveProperty('topClients');

      expect(typeof data.totalClients).toBe('number');
      expect(typeof data.newClientsThisMonth).toBe('number');
      expect(typeof data.returningClients).toBe('number');
      expect(typeof data.averageRevenuePerClient).toBe('number');
      expect(typeof data.clientRetentionRate).toBe('number');

      expect(Array.isArray(data.topClients)).toBe(true);
    });

    it('generates reasonable numeric values', () => {
      const data = generateClientAnalyticsData();

      expect(data.totalClients).toBeGreaterThan(0);
      expect(data.newClientsThisMonth).toBeGreaterThanOrEqual(0);
      expect(data.returningClients).toBeGreaterThanOrEqual(0);
      expect(data.clientRetentionRate).toBeGreaterThanOrEqual(0);
      expect(data.clientRetentionRate).toBeLessThanOrEqual(100);
    });
  });

  describe('generateQualityMetricsData', () => {
    it('generates quality metrics data with correct structure', () => {
      const data = generateQualityMetricsData();

      expect(data).toHaveProperty('overallQualityScore');
      expect(data).toHaveProperty('photoComplianceRate');
      expect(data).toHaveProperty('stepCompletionAccuracy');
      expect(data).toHaveProperty('commonIssues');
      expect(data).toHaveProperty('qualityTrend');

      expect(typeof data.overallQualityScore).toBe('number');
      expect(typeof data.photoComplianceRate).toBe('number');
      expect(typeof data.stepCompletionAccuracy).toBe('number');

      expect(Array.isArray(data.commonIssues)).toBe(true);
      expect(Array.isArray(data.qualityTrend)).toBe(true);
    });

    it('generates values within expected ranges', () => {
      const data = generateQualityMetricsData();

      expect(data.overallQualityScore).toBeGreaterThanOrEqual(0);
      expect(data.overallQualityScore).toBeLessThanOrEqual(100);
      expect(data.photoComplianceRate).toBeGreaterThanOrEqual(0);
      expect(data.photoComplianceRate).toBeLessThanOrEqual(100);
      expect(data.stepCompletionAccuracy).toBeGreaterThanOrEqual(0);
      expect(data.stepCompletionAccuracy).toBeLessThanOrEqual(100);
    });
  });

  describe('generateMaterialUsageData', () => {
    it('generates material usage data with correct structure', () => {
      const data = generateMaterialUsageData();

      expect(data).toHaveProperty('totalMaterialCost');
      expect(data).toHaveProperty('costPerTask');
      expect(data).toHaveProperty('wastePercentage');
      expect(data).toHaveProperty('topMaterials');
      expect(data).toHaveProperty('monthlyUsage');

      expect(typeof data.totalMaterialCost).toBe('number');
      expect(typeof data.costPerTask).toBe('number');
      expect(typeof data.wastePercentage).toBe('number');

      expect(Array.isArray(data.topMaterials)).toBe(true);
      expect(Array.isArray(data.monthlyUsage)).toBe(true);
    });

    it('generates reasonable cost and usage values', () => {
      const data = generateMaterialUsageData();

      expect(data.totalMaterialCost).toBeGreaterThan(0);
      expect(data.costPerTask).toBeGreaterThan(0);
      expect(data.wastePercentage).toBeGreaterThanOrEqual(0);
      expect(data.wastePercentage).toBeLessThanOrEqual(100);
    });

    it('generates valid material breakdown', () => {
      const data = generateMaterialUsageData();

      data.topMaterials.forEach((item) => {
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('usage');
        expect(item).toHaveProperty('cost');

        expect(typeof item.usage).toBe('number');
        expect(typeof item.cost).toBe('number');

        expect(item.usage).toBeGreaterThanOrEqual(0);
        expect(item.cost).toBeGreaterThanOrEqual(0);
      });
    });
  });
});