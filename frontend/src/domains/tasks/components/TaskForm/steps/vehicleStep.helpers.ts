import { VEHICLE_MAKES } from '../types';

export type VinValidationState = 'valid' | 'invalid' | 'checking' | null;

const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export function getFilteredMakes(makeFilter: string) {
  return VEHICLE_MAKES.filter((make) =>
    make.toLowerCase().includes(makeFilter.toLowerCase()),
  ).slice(0, 8);
}

export function formatLicensePlate(value: string) {
  let normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (normalized.length > 2 && normalized.length <= 5) {
    normalized = `${normalized.slice(0, 2)}-${normalized.slice(2)}`;
  } else if (normalized.length > 5) {
    normalized = `${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5, 7)}`;
  }

  return normalized;
}

export function sanitizeVin(value: string) {
  return value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
}

function getVinCharValue(char: string) {
  if (/[0-9]/.test(char)) {
    return parseInt(char, 10);
  }

  const overrides: Record<string, number> = {
    S: 2,
    T: 3,
    U: 4,
    V: 5,
    W: 6,
    X: 7,
    Y: 8,
    Z: 9,
  };

  return overrides[char] ?? char.charCodeAt(0) - 65 + 1;
}

export function validateVIN(vin: string) {
  if (!vin) {
    return true;
  }

  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i;
  if (!vinRegex.test(vin)) {
    return false;
  }

  const vinArray = vin.toUpperCase().split('');
  const sum = vinArray.reduce(
    (total, char, index) => total + getVinCharValue(char) * (VIN_WEIGHTS[index] ?? 0),
    0,
  );
  const checksum = sum % 11;
  const expectedChecksum = vinArray[8];

  return checksum === 10 ? expectedChecksum === 'X' : expectedChecksum === checksum.toString();
}

export function getVinInputClass(vinValidationState: VinValidationState) {
  if (vinValidationState === 'valid') {
    return 'border-[hsl(var(--rpma-teal))] bg-white focus:border-[hsl(var(--rpma-teal))] focus:ring-[hsl(var(--rpma-teal))]/20';
  }

  if (vinValidationState === 'invalid') {
    return 'border-red-500 bg-white focus:border-red-500 focus:ring-red-500/50';
  }

  return 'border-border bg-white focus:border-border-light focus:ring-border-light/50';
}
