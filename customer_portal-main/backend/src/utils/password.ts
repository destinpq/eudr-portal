import bcrypt from 'bcrypt';

// Password policy configuration
export const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  ADMIN_MIN_LENGTH: 12,
  REQUIRE_LOWER: true,
  REQUIRE_UPPER: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true,
  SPECIAL_CHARS: /[!@#$%^&*()_\-+=`|\{}\[\]:;"'<>,.?/]/,
};

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordPolicy(password: string, isAdmin: boolean = false): string[] {
  const errors: string[] = [];
  const minLength = isAdmin ? PASSWORD_POLICY.ADMIN_MIN_LENGTH : PASSWORD_POLICY.MIN_LENGTH;
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long.`);
  }
  if (PASSWORD_POLICY.REQUIRE_LOWER && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  }
  if (PASSWORD_POLICY.REQUIRE_UPPER && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  }
  if (PASSWORD_POLICY.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number.');
  }
  if (PASSWORD_POLICY.REQUIRE_SPECIAL && !PASSWORD_POLICY.SPECIAL_CHARS.test(password)) {
    errors.push('Password must contain at least one special character.');
  }
  return errors;
} 