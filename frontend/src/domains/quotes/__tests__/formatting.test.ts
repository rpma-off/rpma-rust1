import { formatCents } from '@/lib/format';

describe('formatCents', () => {
  it('formats integer cents to euro string', () => {
    // French locale uses comma as decimal separator and non-breaking space before €
    expect(formatCents(15000)).toBe('150,00\u00A0€');
  });

  it('formats zero correctly', () => {
    expect(formatCents(0)).toBe('0,00\u00A0€');
  });

  it('formats small amounts', () => {
    expect(formatCents(1)).toBe('0,01\u00A0€');
    expect(formatCents(99)).toBe('0,99\u00A0€');
  });

  it('formats large amounts with thousands separator', () => {
    // French locale uses non-breaking space as thousands separator
    expect(formatCents(1234567)).toBe('12\u202F345,67\u00A0€');
  });
});
