/**
 * Authentication Service
 * 
 * Handles user authentication, login, and password management
 */

const bcrypt = require("bcryptjs");
const { usersTableClient } = require("../azureService");
const passwordPolicy = require("../utils/passwordPolicy");
const { logger } = require("../utils/logger");
const { 
  checkPasswordStatus, 
  generateToken, 
  validatePasswordChange, 
  updateUserPassword 
} = require("../utils/passwordUtils");

/**
 * Authenticates admin user login
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Object} - Authentication result
 */
async function authenticateAdmin(username, password) {
  try {
    if (!username || !password) {
      throw new Error("Username and password are required");
    }

    // Get user from storage
    let user;
    try {
      user = await usersTableClient.getEntity("admin", username);
    } catch (error) {
      logger.warn("Login attempt for non-existent user", { username });
      throw new Error("Invalid credentials");
    }

    // Check if account is locked
    if (user.isLocked) {
      logger.warn("Login attempt for locked account", { username });
      throw new Error("Account is locked due to too many failed login attempts. Contact administrator.");
    }

    // Check if account is active
    if (!user.isActive) {
      throw new Error("Account is disabled");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      // Increment failed login attempts
      await handleFailedLogin(user, username);
      throw new Error("Invalid credentials");
    }

    // Reset failed login attempts on successful login
    await usersTableClient.updateEntity({
      partitionKey: user.partitionKey,
      rowKey: user.rowKey,
      failedLoginAttempts: 0,
      lastLogin: new Date().toISOString()
    }, "Merge");

    // Check password expiry and requirements
    const passwordStatus = checkPasswordStatus(user);

    if (passwordStatus.mustChange) {
      return {
        success: true,
        mustChangePassword: true,
        message: passwordStatus.message,
        user: {
          id: user.rowKey,
          username: user.username,
          email: user.email,
          role: user.role
        }
      };
    }

    // Generate JWT token
    const token = generateToken(user);

    logger.info("Successful admin login", { username });

    return {
      success: true,
      token,
      user: {
        id: user.rowKey,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };

  } catch (error) {
    logger.error("Admin login error", {
      error: error.message,
      username
    });
    throw error;
  }
}

/**
 * Changes user password
 * @param {string} username - Username
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Object} - Change password result
 */
async function changePassword(username, currentPassword, newPassword) {
  try {
    if (!username || !currentPassword || !newPassword) {
      throw new Error("Username, current password, and new password are required");
    }

    // Get user
    const user = await usersTableClient.getEntity("admin", username);

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error("Current password is incorrect");
    }

    // Validate password change
    const validation = validatePasswordChange(newPassword, user);
    if (!validation.isValid) {
      const error = new Error(validation.error);
      if (validation.details) error.details = validation.details;
      throw error;
    }

    // Update password
    await updateUserPassword(user, newPassword, usersTableClient);

    logger.info("Password changed successfully", { username });

    // Generate new token
    const token = generateToken(user);

    return {
      success: true,
      message: "Password changed successfully",
      token,
      user: {
        id: user.rowKey,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };

  } catch (error) {
    logger.error("Change password error", {
      error: error.message,
      username
    });
    throw error;
  }
}

/**
 * Handle failed login attempt
 * @param {Object} user - User object
 * @param {string} username - Username
 */
async function handleFailedLogin(user, username) {
  const failedAttempts = (user.failedLoginAttempts || 0) + 1;
  const updateData = {
    partitionKey: user.partitionKey,
    rowKey: user.rowKey,
    failedLoginAttempts: failedAttempts
  };

  // Lock account after max failed attempts
  if (failedAttempts >= passwordPolicy.maxFailedAttempts) {
    updateData.isLocked = true;
    updateData.lockedAt = new Date().toISOString();
    logger.warn("Account locked due to failed attempts", { username });
  }

  await usersTableClient.updateEntity(updateData, "Merge");

  if (failedAttempts >= passwordPolicy.maxFailedAttempts) {
    throw new Error("Account locked due to too many failed login attempts");
  }
}



module.exports = {
  authenticateAdmin,
  changePassword
}; 