/**
 * Password Validation Utilities
 *
 * Provides robust client-side password validation functionality
 */

export interface PasswordValidationResult {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number; // 0-100 score
  issues: string[];
  feedback: {
    suggestions: string[];
    warning?: string;
  };
}

export interface PasswordPolicy {
  minLength: number;
  requireLowercase: boolean;
  requireUppercase: boolean;
  requireDigits: boolean;
  requireSymbols: boolean;
  maxRepeatingChars: number;
  checkCommonPasswords: boolean;
}

// Default password policy (can be overridden)
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireLowercase: true,
  requireUppercase: true,
  requireDigits: true,
  requireSymbols: true,
  maxRepeatingChars: 3,
  checkCommonPasswords: true,
};

// Common passwords that should be rejected
const COMMON_PASSWORDS = [
  'password', '123456', 'qwerty', 'welcome', 'admin',
  'letmein', 'test', 'password123', '123456789', 'abc123',
  '111111', '12345678', 'sunshine', 'princess', 'football',
  'baseball', 'iloveyou', 'monkey', 'master', '1234',
  // Add more common passwords as needed
];

// Common patterns to avoid
const SEQUENTIAL_PATTERNS = [
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
];

/**
 * Validates a password against the specified policy
 * @param password The password to validate
 * @param policy The password policy to use
 * @returns Detailed validation result
 */
export function validatePassword(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): PasswordValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let warning: string | undefined;
  let score = 100; // Start with perfect score and deduct points

  // Length check
  if (password.length < policy.minLength) {
    issues.push(`Password must be at least ${policy.minLength} characters long`);
    suggestions.push(`Use at least ${policy.minLength} characters`);
    score -= 25;
  }

  // Character type checks
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasDigits = /\d/.test(password);
  const hasSymbols = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (policy.requireLowercase && !hasLowercase) {
    issues.push('Password must include lowercase letters');
    suggestions.push('Add lowercase letters (a-z)');
    score -= 10;
  }

  if (policy.requireUppercase && !hasUppercase) {
    issues.push('Password must include uppercase letters');
    suggestions.push('Add uppercase letters (A-Z)');
    score -= 10;
  }

  if (policy.requireDigits && !hasDigits) {
    issues.push('Password must include numbers');
    suggestions.push('Add numbers (0-9)');
    score -= 10;
  }

  if (policy.requireSymbols && !hasSymbols) {
    issues.push('Password must include special characters');
    suggestions.push('Add special characters (!@#$%^&*(),.?":{}|<>)');
    score -= 10;
  }

  // Repeating characters check
  const repeatingCharsRegex = new RegExp(`(.)\\1{${policy.maxRepeatingChars},}`, 'g');
  if (repeatingCharsRegex.test(password)) {
    issues.push(`Password contains too many repeating characters`);
    suggestions.push(`Avoid repeating the same character more than ${policy.maxRepeatingChars} times`);
    score -= 15;
  }

  // Check for sequential patterns
  for (const pattern of SEQUENTIAL_PATTERNS) {
    for (let i = 0; i < pattern.length - 3; i++) {
      const sequence = pattern.slice(i, i + 4);
      if (password.toLowerCase().includes(sequence)) {
        issues.push('Password contains a sequential pattern');
        suggestions.push('Avoid sequential patterns like "1234" or "abcd"');
        score -= 15;
        break;
      }
    }
  }

  // Common password check
  if (policy.checkCommonPasswords) {
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.some(p => lowerPassword.includes(p))) {
      issues.push('Password contains a common password pattern');
      suggestions.push('Avoid common words or patterns that could be easily guessed');
      warning = 'This password is similar to commonly used passwords';
      score -= 25;
    }
  }

  // Personal information check (if provided)
  if (/\d{4}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])/.test(password)) {
    issues.push('Password appears to contain a date pattern like YYYYMMDD');
    suggestions.push('Avoid using dates, especially those related to personal information');
    score -= 10;
  }

  // Calculate strength
  let strength: 'weak' | 'medium' | 'strong' | 'very-strong';

  if (score < 40) {
    strength = 'weak';
  } else if (score < 70) {
    strength = 'medium';
  } else if (score < 85) {
    strength = 'strong';
  } else {
    strength = 'very-strong';
  }

  // Add general suggestions for improvement
  if (strength === 'weak' || strength === 'medium') {
    if (!suggestions.includes('Use a longer password')) {
      suggestions.push('Use a longer password for better security');
    }
    if (!suggestions.includes('Use a mix of character types')) {
      suggestions.push('Use a mix of uppercase, lowercase, numbers, and special characters');
    }
  }

  return {
    isValid: issues.length === 0,
    strength,
    score: Math.max(0, score),
    issues,
    feedback: {
      suggestions,
      warning,
    }
  };
}

/**
 * Generates password strength requirements text based on policy
 */
export function generatePasswordRequirements(
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): string {
  const requirements: string[] = [];

  requirements.push(`At least ${policy.minLength} characters`);

  if (policy.requireLowercase) {
    requirements.push('At least one lowercase letter (a-z)');
  }

  if (policy.requireUppercase) {
    requirements.push('At least one uppercase letter (A-Z)');
  }

  if (policy.requireDigits) {
    requirements.push('At least one number (0-9)');
  }

  if (policy.requireSymbols) {
    requirements.push('At least one special character (!@#$%^&*(),.?":{}|<>)');
  }

  if (policy.maxRepeatingChars) {
    requirements.push(`No more than ${policy.maxRepeatingChars} identical characters in a row`);
  }

  return requirements.join('\n• ');
}

/**
 * Utility to check if a password has been compromised
 * Uses the k-Anonymity model to check haveibeenpwned API
 */
export async function checkPasswordCompromised(password: string): Promise<{
  isCompromised: boolean;
  occurrences?: number;
  error?: string;
}> {
  try {
    // Generate SHA-1 hash of the password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Send first 5 characters of hash to API
    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5).toUpperCase();

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!response.ok) {
      return {
        isCompromised: false,
        error: `API error: ${response.status}`
      };
    }

    const text = await response.text();
    const lines = text.split('\n');

    // Check if hash suffix exists in response
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix.trim().toUpperCase() === suffix) {
        return {
          isCompromised: true,
          occurrences: parseInt(count.trim(), 10)
        };
      }
    }

    return { isCompromised: false };
  } catch (error) {
    return {
      isCompromised: false,
      error: error instanceof Error ? error.message : 'Unknown error checking password'
    };
  }
}