/**
 * Password Generator Utility
 *
 * Generates secure temporary passwords that meet all policy requirements:
 * - Minimum 12 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 * - No more than 3 identical consecutive characters
 */

import { validatePassword, DEFAULT_PASSWORD_POLICY } from './password-validator';

export const PASSWORD_CHARSETS = {
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  lower: 'abcdefghjkmnpqrstuvwxyz',
  digits: '23456789',
  special: '!@#$%^&*',
} as const;

const ALL_CHARS = 
  PASSWORD_CHARSETS.upper + 
  PASSWORD_CHARSETS.lower + 
  PASSWORD_CHARSETS.digits + 
  PASSWORD_CHARSETS.special;

function getRandomChar(charset: string): string {
  const index = Math.floor(Math.random() * charset.length);
  return charset.charAt(index);
}

function shuffleArray(array: string[]): string[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j]!;
    result[j] = temp!;
  }
  return result;
}

export function generateTempPassword(): string {
  const parts: string[] = [
    getRandomChar(PASSWORD_CHARSETS.upper),
    getRandomChar(PASSWORD_CHARSETS.lower),
    getRandomChar(PASSWORD_CHARSETS.digits),
    getRandomChar(PASSWORD_CHARSETS.special),
  ];

  const remainingLength = DEFAULT_PASSWORD_POLICY.minLength - parts.length;
  for (let i = 0; i < remainingLength; i++) {
    parts.push(getRandomChar(ALL_CHARS));
  }

  const shuffled = shuffleArray(parts);
  let password = shuffled.join('');

  const validation = validatePassword(password);
  if (!validation.isValid) {
    password = generateTempPassword();
  }

  return password;
}

export function generateMultiplePasswords(count: number): string[] {
  return Array.from({ length: count }, () => generateTempPassword());
}