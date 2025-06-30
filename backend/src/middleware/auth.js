/**
 * Authentication Middleware
 *
 * This middleware handles JWT-based authentication:
 * 1. Extracts JWT token from Authorization header
 * 2. Verifies token validity
 * 3. Attaches user object to request
 *
 * Used to protect routes that require authentication
 */

const jwt = require("jsonwebtoken");
const { usersTableClient } = require("../azureService");

const auth = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      console.log("[AUTH] No token provided");
      return res.status(401).json({ error: "Please authenticate." });
    }

    // Verify token and get user data
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("[AUTH] Decoded token:", decoded);
    
    // Try to fetch user from Azure Table Storage
    // Users can be stored in different partition key formats:
    // 1. "USER" partition (newer format)
    // 2. Email as partition key (older format)
    let userEntity;
    
    try {
      // First try the standard USER partition
      console.log("[AUTH] Looking for user in USER partition:", decoded.userId);
      userEntity = await usersTableClient.getEntity("USER", decoded.userId);
      console.log("[AUTH] Found user in USER partition");
    } catch (e) {
      console.log("[AUTH] User not found in USER partition, searching all entities...");
      // If not found, try to find user by searching all partitions
      try {
        const entities = usersTableClient.listEntities();
        for await (const entity of entities) {
          console.log(`[AUTH] Checking entity: partition=${entity.partitionKey}, row=${entity.rowKey}, username=${entity.username}`);
          if (entity.rowKey === decoded.userId || entity.username === decoded.userId) {
            // Skip admin users
            if (entity.partitionKey === 'admin') continue;
            userEntity = entity;
            console.log("[AUTH] Found user:", entity.username);
            break;
          }
        }
      } catch (searchError) {
        console.error("[AUTH] Error searching for user:", searchError);
      }
    }
    
    if (!userEntity) {
      console.error("[AUTH] User not found for token:", decoded);
      return res.status(401).json({ error: "Please authenticate." });
    }

    console.log("[AUTH] Successfully authenticated user:", userEntity.username);

    // Attach user and token to request object
    req.user = {
      id: userEntity.rowKey,
      username: userEntity.username,
      email: userEntity.email || `${userEntity.username}@company.com`,
      partitionKey: userEntity.partitionKey,
      rowKey: userEntity.rowKey
    };
    req.token = token;
    next();
  } catch (error) {
    console.error("[AUTH] Auth middleware error:", error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Invalid token." });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expired." });
    }
    res.status(401).json({ error: "Please authenticate." });
  }
};

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: "Access token required" 
      });
    }

    // Verify token and get user data
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("[AUTH] Decoded admin token:", decoded);
    
    // Fetch admin user from Azure Table Storage (admin users are in "admin" partition)
    let userEntity;
    try {
      // Token contains 'username' field, use that to look up the admin
      const lookupUsername = decoded.username || decoded.id;
      userEntity = await usersTableClient.getEntity("admin", lookupUsername);
    } catch (e) {
      console.error("[AUTH] Admin user lookup failed:", e);
      return res.status(401).json({ 
        success: false, 
        error: "Invalid admin token" 
      });
    }
    
    if (!userEntity) {
      return res.status(401).json({ 
        success: false, 
        error: "Admin user not found" 
      });
    }

    // Check if user has admin role
    if (userEntity.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: "Access denied. Admin privileges required." 
      });
    }

    // Check if account is active
    if (!userEntity.isActive) {
      return res.status(401).json({ 
        success: false, 
        error: "Admin account is disabled" 
      });
    }

    // Attach user and token to request object
    req.user = {
      id: userEntity.rowKey,
      username: userEntity.username,
      email: userEntity.email,
      role: userEntity.role
    };
    req.token = token;
    next();
  } catch (error) {
    console.error("[AUTH] Admin auth error:", error);
    res.status(401).json({ 
      success: false, 
      error: "Invalid admin token" 
    });
  }
};

module.exports = { auth, adminAuth };
