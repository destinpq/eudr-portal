/**
 * Authentication Routes
 *
 * This module handles user authentication endpoints:
 * 1. User registration
 * 2. User login
 * 3. JWT token generation
 */

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { usersTableClient } = require("../azureService");
const { checkPasswordStatus, validatePasswordChange, updateUserPassword, generateToken } = require("../utils/passwordUtils");
const { logger } = require("../utils/logger");

/**
 * Register New User
 *
 * Endpoint: POST /api/auth/register
 *
 * Creates a new user account with:
 * - Username
 * - Password (automatically hashed)
 *
 * Returns:
 * - User data (without password)
 * - JWT token for authentication
 */
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    // Username: at least 3 characters
    if (!username || username.length < 3) {
      return res
        .status(400)
        .json({ error: "Username must be at least 3 characters long." });
    }
    // Password: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      return res
        .status(400)
        .json({
          error:
            "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
        });
    }
    // Check if user exists
    try {
      await usersTableClient.getEntity("USER", username);
      return res.status(400).json({ error: "User already exists" });
    } catch (e) {
      if (e.statusCode !== 404)
        return res.status(500).json({ error: e.message });
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create user entity with active status
    await usersTableClient.createEntity({
      partitionKey: "USER",
      rowKey: username,
      username,
      password: hashedPassword,
      isActive: true, // New users are active by default
      createdAt: new Date().toISOString(),
      lastLogin: null,
      failedAttempts: 0,
      isLocked: false
    });
    // Generate JWT
    const token = jwt.sign({ userId: username }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    res.status(201).json({
      user: { id: username, username },
      token,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * User Login
 *
 * Endpoint: POST /api/auth/login
 *
 * Authenticates user with:
 * - Username
 * - Password
 *
 * Returns:
 * - User data (without password)
 * - JWT token for authentication
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`[${new Date().toISOString()}] LOGIN ATTEMPT - Username: "${username}", Password: "${password ? '[HIDDEN]' : 'EMPTY'}"`);
    console.log(`[${new Date().toISOString()}] REQUEST BODY:`, req.body);
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    // Fetch user - need to search across all entities since admin-created users use email as partition
    let userEntity;
    try {
      // First try the old "USER" partition for backward compatibility
      try {
        userEntity = await usersTableClient.getEntity("USER", username);
      } catch (e) {
        if (e.statusCode !== 404) throw e;
        
        // If not found in USER partition, search all entities for the username
        const entities = usersTableClient.listEntities();
        for await (const entity of entities) {
          if (entity.rowKey === username && entity.partitionKey !== 'admin') {
            userEntity = entity;
            break;
          }
        }
        
        if (!userEntity) {
          console.log(`[${new Date().toISOString()}] User not found: ${username}`);
          return res.status(401).json({ error: "Invalid credentials" });
        }
      }
    } catch (e) {
      console.error("[AUTH] User lookup error:", e);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Check if account is locked
    if (userEntity.isLocked) {
      console.log(`[${new Date().toISOString()}] Account locked: ${username}`);
      return res.status(423).json({ 
        error: "Your account has been locked due to too many failed login attempts. Please contact an administrator to unlock your account." 
      });
    }
    
    // Check if account is inactive/disabled
    if (userEntity.isActive === false) {
      console.log(`[${new Date().toISOString()}] Account inactive: ${username}`);
      return res.status(403).json({ 
        error: "Your account has been deactivated. Please contact an administrator to reactivate your account." 
      });
    }
    
    // Compare password
    const isMatch = await bcrypt.compare(password, userEntity.password);
    if (!isMatch) {
      console.log(`[${new Date().toISOString()}] Invalid password for: ${username}`);
      
      // Increment failed login attempts
      const failedAttempts = (userEntity.failedAttempts || 0) + 1;
      const updateData = {
        partitionKey: userEntity.partitionKey,
        rowKey: userEntity.rowKey,
        failedAttempts: failedAttempts
      };
      
      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        updateData.isLocked = true;
        updateData.lockedAt = new Date().toISOString();
        console.log(`[${new Date().toISOString()}] Account locked due to failed attempts: ${username}`);
        
        await usersTableClient.updateEntity(updateData, "Merge");
        return res.status(423).json({ 
          error: "Your account has been locked due to too many failed login attempts. Please contact an administrator to unlock your account." 
        });
      }
      
      await usersTableClient.updateEntity(updateData, "Merge");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Reset failed attempts on successful login and update last login
    try {
      await usersTableClient.updateEntity({
        partitionKey: userEntity.partitionKey,
        rowKey: userEntity.rowKey,
        failedAttempts: 0,
        lastLogin: new Date().toISOString()
      }, "Merge");
    } catch (updateError) {
      console.error("Failed to update user login info:", updateError);
      // Don't fail login for this
    }

    // Check password expiry and requirements (temporary password, expired password, etc.)
    const passwordStatus = checkPasswordStatus(userEntity);

    if (passwordStatus.mustChange) {
      console.log(`[${new Date().toISOString()}] User must change password: ${username} - ${passwordStatus.message}`);
      return res.json({
        success: true,
        mustChangePassword: true,
        message: passwordStatus.message,
        user: {
          id: username,
          username: userEntity.username,
          email: userEntity.email || `${username}@company.com`,
          role: userEntity.role || 'user'
        }
      });
    }

    // Generate JWT
    const token = jwt.sign({ userId: username }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    console.log(`[${new Date().toISOString()}] User logged in successfully: ${username}`);
    const loginResponse = {
      user: { 
        id: username, 
        username,
        email: userEntity.email || `${username}@company.com`,
        role: userEntity.role || 'user',
        isActive: userEntity.isActive !== false // Default to true if not set
      },
      token,
    };
    console.log(`[${new Date().toISOString()}] LOGIN RESPONSE:`, JSON.stringify(loginResponse, null, 2));
    res.json(loginResponse);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Login error:`, error);
    res.status(500).json({ error: "An error occurred during login. Please try again." });
  }
});

/**
 * User Password Change
 *
 * Endpoint: POST /api/auth/change-password
 *
 * Changes user password (for temporary passwords, expired passwords, etc.)
 */
router.post("/change-password", async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;

    // Validate input
    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Username, current password, and new password are required"
      });
    }

    // Find user - search across all partitions since admin-created users use email as partition
    let userEntity;
    try {
      // First try the old "USER" partition for backward compatibility
      try {
        userEntity = await usersTableClient.getEntity("USER", username);
      } catch (e) {
        if (e.statusCode !== 404) throw e;
        
        // If not found in USER partition, search all entities for the username
        const entities = usersTableClient.listEntities();
        for await (const entity of entities) {
          if (entity.rowKey === username && entity.partitionKey !== 'admin') {
            userEntity = entity;
            break;
          }
        }
        
        if (!userEntity) {
          return res.status(404).json({
            success: false,
            error: "User not found"
          });
        }
      }
    } catch (e) {
      logger.error("User lookup error during password change", { error: e.message, username });
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, userEntity.password);
    if (!isValidPassword) {
      logger.warn("Invalid current password during password change", { username });
      return res.status(400).json({
        success: false,
        error: "Current password is incorrect"
      });
    }

    // Validate password change
    const validation = validatePasswordChange(newPassword, userEntity);
    if (!validation.isValid) {
      const error_response = {
        success: false,
        error: validation.error
      };
      if (validation.details) error_response.details = validation.details;
      return res.status(400).json(error_response);
    }

    // Update password
    await updateUserPassword(userEntity, newPassword, usersTableClient);

    logger.info("User password changed successfully", { username });

    // Generate new token
    const token = generateToken(userEntity);

    res.json({
      success: true,
      message: "Password changed successfully",
      token,
      user: {
        id: userEntity.rowKey,
        username: userEntity.username,
        email: userEntity.email || `${username}@company.com`,
        role: userEntity.role || 'user'
      }
    });

  } catch (error) {
    logger.error("User password change error", {
      error: error.message,
      username: req.body.username
    });
    
    if (error.details) {
      res.status(400).json({
        success: false,
        error: error.message,
        details: error.details
      });
    } else {
      res.status(500).json({
        success: false,
        error: "An error occurred while changing password. Please try again."
      });
    }
  }
});

// Get current user
router.get("/me", async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Please authenticate." });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userEntity = await usersTableClient.getEntity("USER", decoded.userId);
    if (!userEntity) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check if account is still active
    if (userEntity.isActive === false) {
      return res.status(403).json({ error: "Your account has been deactivated." });
    }
    
    res.json({
      id: userEntity.rowKey,
      username: userEntity.username,
      email: userEntity.email || `${userEntity.username}@company.com`,
      isActive: userEntity.isActive !== false
    });
  } catch (error) {
    res.status(401).json({ error: "Please authenticate." });
  }
});

module.exports = router;
