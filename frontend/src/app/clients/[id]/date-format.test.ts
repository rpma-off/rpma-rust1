import { formatClientDate } from './date-format';

describe('formatClientDate', () => {
  it('formats dates using French locale by default', () => {
    const toLocaleDateStringSpy = jest
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockReturnValue('02/01/2026');

    const result = formatClientDate('2026-01-02T00:00:00.000Z');

    expect(result).toBe('02/01/2026');
    expect(toLocaleDateStringSpy).toHaveBeenCalledWith('fr-FR');
  });

  it('returns N/A for missing values', () => {
    expect(formatClientDate(undefined)).toBe('N/A');
    expect(formatClientDate(null)).toBe('N/A');
  });
});
