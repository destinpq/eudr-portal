/**
 * Admin Service
 * 
 * Handles admin account initialization and business logic
 */

const { usersTableClient } = require("../azureService");
const { logger } = require("../utils/logger");
const { 
  createUserEntity, 
  createAdminEntity, 
  createPasswordResetData, 
  formatUserEntity 
} = require("../utils/userUtils");

/**
 * Create default admin account if it doesn't exist
 */
const createDefaultAdmin = async () => {
  try {
    logger.info("Checking for default admin account...");
    
    // Check if admin already exists
    try {
      await usersTableClient.getEntity("admin", "admin");
      logger.info("Default admin account already exists");
      return;
    } catch (error) {
      if (error.statusCode !== 404) {
        throw error;
      }
    }

    // Create default admin
    const { entity: adminUser, password: adminPassword } = await createAdminEntity();
    await usersTableClient.createEntity(adminUser);
    
    logger.info("=".repeat(60));
    logger.info("🔐 DEFAULT ADMIN ACCOUNT CREATED");
    logger.info("=".repeat(60));
    logger.info("Username: admin");
    logger.info("Email: admin@company.com");
    logger.info(`Password: ${adminPassword}`);
    logger.info("🔗 Access: http://localhost:3000/admin");
    logger.info("ℹ️  Admin manages all user passwords");
    logger.info("=".repeat(60));
    
  } catch (error) {
    logger.error("Error creating default admin", {
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Gets all users (excluding admin users)
 * @returns {Array} - Array of users
 */
async function getAllUsers() {
  try {
    const users = [];
    const entities = usersTableClient.listEntities();
    
    for await (const entity of entities) {
      // Don't include admin users in the list
      if (entity.partitionKey !== 'admin') {
        users.push(formatUserEntity(entity));
      }
    }

    return users;
  } catch (error) {
    throw new Error(`Failed to get users: ${error.message}`);
  }
}

/**
 * Creates a new user
 * @param {Object} userData - User data
 * @param {string} createdBy - Admin who created the user
 * @returns {Object} - Created user and credentials
 */
async function createUser(userData, createdBy) {
  try {
    const { email, username, role = 'user', sendCredentials = false } = userData;

    if (!email || !username) {
      throw new Error("Email and username are required");
    }

    // Check if user already exists
    try {
      await usersTableClient.getEntity(email, username);
      throw new Error("User with this email and username already exists");
    } catch (error) {
      if (error.statusCode !== 404) {
        throw error;
      }
    }

    // Create user entity
    const { entity: newUser, password: userPassword } = await createUserEntity(userData, createdBy);
    await usersTableClient.createEntity(newUser);

    const result = {
      user: {
        id: username,
        email,
        username,
        role,
        isActive: true,
        mustChangePassword: true
      }
    };

    // Include credentials if requested
    if (sendCredentials) {
      result.credentials = {
        username,
        password: userPassword,
        message: 'Permanent password - admin can reset if needed'
      };
    }

    return result;
  } catch (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }
}

/**
 * Updates an existing user
 * @param {string} username - Username to update
 * @param {Object} updateData - Data to update
 * @returns {Object} - Update result with new password if reset
 */
async function updateUser(username, updateData) {
  try {
    const { email, role, isActive, resetPassword } = updateData;

    // Get existing user
    const user = await usersTableClient.getEntity(email || username, username);

    const entityUpdate = {
      partitionKey: user.partitionKey,
      rowKey: user.rowKey
    };

    if (role) entityUpdate.role = role;
    if (typeof isActive === 'boolean') entityUpdate.isActive = isActive;

    let newPassword = null;
    
    // Reset password if requested
    if (resetPassword) {
      const { updateData, password } = await createPasswordResetData();
      Object.assign(entityUpdate, updateData);
      newPassword = password;
    }

    await usersTableClient.updateEntity(entityUpdate, "Merge");

    const result = {
      success: true,
      message: "User updated successfully"
    };

    if (resetPassword && newPassword) {
      result.newPassword = newPassword;
      result.passwordMessage = "New permanent password generated.";
    }

    return result;
  } catch (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }
}

/**
 * Unlocks a user account
 * @param {string} username - Username to unlock
 * @param {string} email - User email
 */
async function unlockUser(username, email) {
  try {
    await usersTableClient.updateEntity({
      partitionKey: email || username,
      rowKey: username,
      isLocked: false,
      failedLoginAttempts: 0,
      lockedAt: null
    }, "Merge");
  } catch (error) {
    throw new Error(`Failed to unlock user: ${error.message}`);
  }
}

module.exports = {
  createDefaultAdmin,
  getAllUsers,
  createUser,
  updateUser,
  unlockUser
}; 