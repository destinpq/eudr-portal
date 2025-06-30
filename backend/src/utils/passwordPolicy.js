/**
 * Password Policy Implementation
 * Based on company standards for password management
 */

class PasswordPolicy {
  constructor() {
    this.minLength = 8;
    this.adminMinLength = 12; // Recommended for admin accounts
    this.mobileMinLength = 4;
    this.maxFailedAttempts = 3;
    this.passwordExpiryDays = 90;
    this.minTimeBetweenChanges = 7; // days
    this.passwordHistoryCount = 5;
    this.tempPasswordValidityHours = 24;
  }

  /**
   * Validate password against policy
   * @param {string} password 
   * @param {boolean} isAdmin 
   * @param {boolean} isMobile 
   * @returns {Object} validation result
   */
  validatePassword(password, isAdmin = false, isMobile = false) {
    const errors = [];
    const warnings = [];

    // Determine minimum length based on account type
    let minLength = this.minLength;
    if (isMobile) {
      minLength = this.mobileMinLength;
    } else if (isAdmin) {
      minLength = this.adminMinLength;
    }

    // Check length
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (!isMobile) {
      // Check for lowercase letters
      if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter");
      }

      // Check for uppercase letters or numbers (at least one)
      if (!/[A-Z]/.test(password) && !/[0-9]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter or number");
      }

      // Check for at least one number
      if (!/[0-9]/.test(password)) {
        warnings.push("Password should contain at least one number");
      }

      // Check for special characters
      const specialChars = /[@#$%^&*+=|\\(){}:;",<.?/]/;
      if (!specialChars.test(password)) {
        errors.push("Password must contain at least one special character (@#$%^&*+=|\\(){}:;\",<.?/)");
      }
    }

    // Check for common patterns (basic)
    if (password.toLowerCase().includes('password')) {
      errors.push("Password cannot contain the word 'password'");
    }

    if (password.toLowerCase().includes('admin')) {
      errors.push("Password cannot contain the word 'admin'");
    }

    // Check for sequential patterns
    if (/123456|abcdef|qwerty/i.test(password)) {
      errors.push("Password cannot contain common sequential patterns");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      strength: this.calculatePasswordStrength(password)
    };
  }

  /**
   * Calculate password strength
   * @param {string} password 
   * @returns {string} strength level
   */
  calculatePasswordStrength(password) {
    let score = 0;

    // Length bonus
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[@#$%^&*+=|\\(){}:;",<.?/]/.test(password)) score += 1;

    // Complexity bonus
    if (/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@#$%^&*+=|\\(){}:;",<.?/])/.test(password)) {
      score += 1;
    }

    if (score <= 3) return 'Weak';
    if (score <= 5) return 'Medium';
    if (score <= 7) return 'Strong';
    return 'Very Strong';
  }

  /**
   * Check if password change is allowed (minimum 7 days between changes)
   * @param {Date} lastPasswordChange 
   * @returns {boolean}
   */
  canChangePassword(lastPasswordChange) {
    if (!lastPasswordChange) return true;
    
    const daysSinceLastChange = (new Date() - new Date(lastPasswordChange)) / (1000 * 60 * 60 * 24);
    return daysSinceLastChange >= this.minTimeBetweenChanges;
  }

  /**
   * Check if password has expired
   * @param {Date} lastPasswordChange 
   * @returns {boolean}
   */
  isPasswordExpired(lastPasswordChange) {
    if (!lastPasswordChange) return true;
    
    const daysSinceLastChange = (new Date() - new Date(lastPasswordChange)) / (1000 * 60 * 60 * 24);
    return daysSinceLastChange >= this.passwordExpiryDays;
  }

  /**
   * Check if password was used recently (password history)
   * @param {string} newPassword 
   * @param {Array} passwordHistory 
   * @returns {boolean}
   */
  isPasswordReused(newPassword, passwordHistory = []) {
    const bcrypt = require('bcryptjs');
    
    for (let i = 0; i < Math.min(passwordHistory.length, this.passwordHistoryCount); i++) {
      if (bcrypt.compareSync(newPassword, passwordHistory[i])) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generate a secure temporary password
   * @param {number} length 
   * @returns {string}
   */
  generateTemporaryPassword(length = 12) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specials = '@#$%^&*+=';
    
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specials[Math.floor(Math.random() * specials.length)];
    
    // Fill the rest randomly
    const allChars = lowercase + uppercase + numbers + specials;
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check if temporary password is still valid
   * @param {Date} createdAt 
   * @returns {boolean}
   */
  isTempPasswordValid(createdAt) {
    const hoursElapsed = (new Date() - new Date(createdAt)) / (1000 * 60 * 60);
    return hoursElapsed < this.tempPasswordValidityHours;
  }
}

module.exports = new PasswordPolicy(); 