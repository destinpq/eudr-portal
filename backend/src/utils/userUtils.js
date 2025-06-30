/**
 * User Utilities
 * 
 * Helper functions for user operations
 */

const bcrypt = require("bcryptjs");
const passwordPolicy = require("./passwordPolicy");

/**
 * Creates user entity object
 * @param {Object} userData - User data
 * @param {string} createdBy - Admin who created the user
 * @returns {Object} - User entity
 */
async function createUserEntity(userData, createdBy) {
  const { email, username, role = 'user' } = userData;
  
  // Generate temporary password for first-time users
  const userPassword = passwordPolicy.generateTemporaryPassword(12);
  const hashedPassword = await bcrypt.hash(userPassword, 10);

  return {
    entity: {
      partitionKey: email,
      rowKey: username,
      email,
      username,
      password: hashedPassword,
      role,
      isActive: true,
      mustChangePassword: true, // Force password change on first login
      isTemporaryPassword: true, // Mark as temporary password
      passwordCreatedAt: new Date().toISOString(),
      passwordHistory: JSON.stringify([hashedPassword]),
      failedLoginAttempts: 0,
      isLocked: false,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      lastPasswordChange: new Date().toISOString(),
      createdBy
    },
    password: userPassword
  };
}

/**
 * Creates admin user entity
 * @returns {Object} - Admin entity and password
 */
async function createAdminEntity() {
  const adminPassword = passwordPolicy.generateTemporaryPassword(12);
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  return {
    entity: {
      partitionKey: "admin",
      rowKey: "admin",
      email: "admin@company.com",
      username: "admin",
      password: hashedPassword,
      role: "admin",
      isActive: true,
      mustChangePassword: true, // Force password change on first login
      isTemporaryPassword: true, // Mark as temporary password
      passwordCreatedAt: new Date().toISOString(),
      passwordHistory: JSON.stringify([hashedPassword]),
      failedLoginAttempts: 0,
      isLocked: false,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      lastPasswordChange: new Date().toISOString()
    },
    password: adminPassword
  };
}

/**
 * Creates password reset update object
 * @returns {Object} - Password reset data and new password
 */
async function createPasswordResetData() {
  const newPassword = passwordPolicy.generateTemporaryPassword(12);
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  return {
    updateData: {
      password: hashedPassword,
      mustChangePassword: true, // Force password change after reset
      isTemporaryPassword: true, // Mark as temporary password
      passwordCreatedAt: new Date().toISOString(),
      isLocked: false,
      failedLoginAttempts: 0,
      lastPasswordChange: new Date().toISOString()
    },
    password: newPassword
  };
}

/**
 * Formats user entity for response
 * @param {Object} entity - Raw entity from database
 * @returns {Object} - Formatted user object
 */
function formatUserEntity(entity) {
  return {
    id: entity.rowKey,
    email: entity.email,
    username: entity.username,
    role: entity.role || 'user',
    isActive: entity.isActive,
    isLocked: entity.isLocked,
    lastLogin: entity.lastLogin,
    createdAt: entity.createdAt,
    mustChangePassword: entity.mustChangePassword,
    isTemporaryPassword: entity.isTemporaryPassword,
    failedLoginAttempts: entity.failedLoginAttempts || 0
  };
}

module.exports = {
  createUserEntity,
  createAdminEntity,
  createPasswordResetData,
  formatUserEntity
};