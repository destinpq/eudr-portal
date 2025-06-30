require("dotenv").config();
const { TableClient } = require("@azure/data-tables");
const bcrypt = require("bcryptjs");

async function fixAdminUser() {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const tableUsers = process.env.AZURE_TABLE_USERS;
    
    const usersTableClient = TableClient.fromConnectionString(
      connectionString,
      tableUsers
    );
    
    console.log("🔧 Fixing admin user with correct fields...");
    
    // First, let's check current user
    let currentUser;
    try {
      currentUser = await usersTableClient.getEntity("admin", "admin");
      console.log("Current user found");
    } catch (error) {
      console.error("No admin user found:", error.message);
      return;
    }
    
    // Create the password (same as before)
    const tempPassword = "smle343c6KMD#";
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    // Update user with ALL required fields that backend expects
    const updatedUser = {
      partitionKey: "admin",
      rowKey: "admin",
      email: "admin@company.com",
      username: "admin",
      password: hashedPassword,
      role: "admin",
      
      // Required flags that backend checks
      isActive: true,
      mustChangePassword: true,
      isTemporaryPassword: true,
      
      // Password management fields
      passwordCreatedAt: new Date().toISOString(),
      lastPasswordChange: new Date().toISOString(),
      passwordHistory: JSON.stringify([hashedPassword]),
      
      // Account security fields
      failedLoginAttempts: 0,
      isLocked: false,
      
      // Timestamps
      createdAt: new Date().toISOString(),
      lastLogin: null
    };
    
    await usersTableClient.upsertEntity(updatedUser, "Merge");
    
    console.log("✅ Admin user updated successfully!");
    console.log("📋 Login Details:");
    console.log("   URL: http://localhost:3000/admin");
    console.log("   Username: admin");
    console.log("   Password:", tempPassword);
    console.log("   (You will be required to change this password on first login)");
    
    // Verify the update
    const verifyUser = await usersTableClient.getEntity("admin", "admin");
    console.log("\n🔍 Verification - User has these key fields:");
    console.log("   isActive:", verifyUser.isActive);
    console.log("   mustChangePassword:", verifyUser.mustChangePassword);
    console.log("   isTemporaryPassword:", verifyUser.isTemporaryPassword);
    console.log("   failedLoginAttempts:", verifyUser.failedLoginAttempts);
    console.log("   isLocked:", verifyUser.isLocked);
    
  } catch (error) {
    console.error("❌ Error fixing admin user:", error.message);
  }
}

fixAdminUser(); 