import { formatCents } from '../utils/formatting';

describe('formatCents', () => {
  it('formats integer cents to euro string', () => {
    expect(formatCents(15000)).toBe('150.00 €');
  });

  it('formats zero correctly', () => {
    expect(formatCents(0)).toBe('0.00 €');
  });

  it('formats small amounts', () => {
    expect(formatCents(1)).toBe('0.01 €');
    expect(formatCents(99)).toBe('0.99 €');
  });

  it('formats large amounts', () => {
    expect(formatCents(1234567)).toBe('12345.67 €');
  });
});
