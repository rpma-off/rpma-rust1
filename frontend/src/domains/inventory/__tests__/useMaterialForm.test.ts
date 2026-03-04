import { normalizeMaterialRequest } from '../hooks/useMaterialForm';
import type { UnitOfMeasure } from '../api/types';

describe('normalizeMaterialRequest', () => {
  it('keeps valid unit_of_measure values', () => {
    const validUnits: UnitOfMeasure[] = ['piece', 'meter', 'liter', 'gram', 'roll'];
    validUnits.forEach(unit => {
      const result = normalizeMaterialRequest({ unit_of_measure: unit, name: 'x' });
      expect(result.unit_of_measure).toBe(unit);
    });
  });

  it('strips empty-string unit_of_measure to undefined', () => {
    const result = normalizeMaterialRequest({ unit_of_measure: '' as UnitOfMeasure, name: 'x' });
    expect(result.unit_of_measure).toBeUndefined();
  });

  it('strips unknown variant to undefined', () => {
    const result = normalizeMaterialRequest({ unit_of_measure: 'kg' as UnitOfMeasure, name: 'x' });
    expect(result.unit_of_measure).toBeUndefined();
  });

  it('preserves other fields unchanged', () => {
    const result = normalizeMaterialRequest({ unit_of_measure: 'roll' as UnitOfMeasure, name: 'My Film', sku: 'SKU-1' });
    expect(result.name).toBe('My Film');
    expect(result.sku).toBe('SKU-1');
    expect(result.unit_of_measure).toBe('roll');
  });
});

