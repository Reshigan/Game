import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

// Minimum password requirements
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

export async function hashPassword(password: string): Promise<string> {
  // Validate password strength before hashing
  const validation = validatePasswordStrength(password);
  if (!validation.valid) {
    throw new Error(`Invalid password: ${validation.errors.join(', ')}`);
  }

  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  // Timing-safe comparison
  return bcrypt.compare(password, hashedPassword);
}

export function validatePasswordStrength(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Password must be at most ${PASSWORD_MAX_LENGTH} characters`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common patterns
  const commonPatterns = [
    'password',
    '123456',
    'qwerty',
    'abc123',
    'letmein',
    'welcome',
  ];

  const lowerPassword = password.toLowerCase();
  for (const pattern of commonPatterns) {
    if (lowerPassword.includes(pattern)) {
      errors.push('Password contains common patterns');
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const randomValues = new Uint8Array(length);
  
  // Use crypto.getRandomValues for cryptographically secure random
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  
  return token;
}