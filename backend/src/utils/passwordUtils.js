/**
 * Password Utilities
 * 
 * Helper functions for password operations
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passwordPolicy = require("./passwordPolicy");
const { logger } = require("./logger");

/**
 * Check password status and requirements
 * @param {Object} user - User object
 * @returns {Object} - Password status
 */
function checkPasswordStatus(user) {
  const passwordExpired = passwordPolicy.isPasswordExpired(user.lastPasswordChange);
  const tempPasswordExpired = user.isTemporaryPassword && 
    !passwordPolicy.isTempPasswordValid(user.passwordCreatedAt);

  if (passwordExpired || tempPasswordExpired || user.mustChangePassword) {
    return {
      mustChange: true,
      message: passwordExpired 
        ? "Password has expired. Please change your password."
        : tempPasswordExpired 
        ? "Temporary password has expired. Please contact administrator."
        : "You must change your password before continuing."
    };
  }

  return { mustChange: false };
}

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {string} - JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.rowKey,
      username: user.username,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
}

/**
 * Validates password change request
 * @param {string} newPassword - New password
 * @param {Object} user - User object
 * @returns {Object} - Validation result
 */
function validatePasswordChange(newPassword, user) {
  // Validate new password against policy
  const validation = passwordPolicy.validatePassword(newPassword, user.role === 'admin');
  if (!validation.isValid) {
    return {
      isValid: false,
      error: "Password does not meet policy requirements",
      details: validation.errors
    };
  }

  // Check if password is being reused
  const passwordHistory = JSON.parse(user.passwordHistory || '[]');
  if (passwordPolicy.isPasswordReused(newPassword, passwordHistory)) {
    return {
      isValid: false,
      error: `Password cannot be one of the last ${passwordPolicy.passwordHistoryCount} passwords used`
    };
  }

  // Check minimum time between password changes (except for first-time/temporary passwords)
  if (!user.mustChangePassword && !user.isTemporaryPassword) {
    if (!passwordPolicy.canChangePassword(user.lastPasswordChange)) {
      return {
        isValid: false,
        error: `Password can only be changed once every ${passwordPolicy.minTimeBetweenChanges} days`
      };
    }
  }

  return { isValid: true };
}

/**
 * Updates user password in database
 * @param {Object} user - User object
 * @param {string} newPassword - New password
 * @param {Object} usersTableClient - Azure table client
 * @returns {string} - Hashed password
 */
async function updateUserPassword(user, newPassword, usersTableClient) {
  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password history
  const passwordHistory = JSON.parse(user.passwordHistory || '[]');
  const updatedHistory = [hashedPassword, ...passwordHistory]
    .slice(0, passwordPolicy.passwordHistoryCount);

  // Update user
  await usersTableClient.updateEntity({
    partitionKey: user.partitionKey,
    rowKey: user.rowKey,
    password: hashedPassword,
    passwordHistory: JSON.stringify(updatedHistory),
    lastPasswordChange: new Date().toISOString(),
    mustChangePassword: false,
    isTemporaryPassword: false,
    passwordCreatedAt: new Date().toISOString()
  }, "Merge");

  return hashedPassword;
}

module.exports = {
  checkPasswordStatus,
  generateToken,
  validatePasswordChange,
  updateUserPassword
}; 