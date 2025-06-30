require("dotenv").config();
const { TableClient } = require("@azure/data-tables");
const bcrypt = require("bcryptjs");

async function createAdminIfNotExists() {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const tableUsers = process.env.AZURE_TABLE_USERS;
    
    const usersTableClient = TableClient.fromConnectionString(
      connectionString,
      tableUsers
    );
    
    console.log("🔍 Checking for admin user...");
    
    // Check if admin exists
    try {
      const admin = await usersTableClient.getEntity("admin", "admin");
      console.log("✅ Admin user already exists:", admin.username);
      return;
    } catch (error) {
      if (!error.message.includes('ResourceNotFound')) {
        throw error;
      }
    }
    
    console.log("👤 Creating new admin user...");
    
    // Generate a secure temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + 
                        Math.random().toString(36).slice(-4).toUpperCase() + 
                        "!@#$%".charAt(Math.floor(Math.random() * 5));
    
    console.log("🔑 TEMPORARY ADMIN PASSWORD:", tempPassword);
    console.log("🔑 TEMPORARY ADMIN PASSWORD:", tempPassword);
    console.log("🔑 TEMPORARY ADMIN PASSWORD:", tempPassword);
    
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    const adminUser = {
      partitionKey: "admin",
      rowKey: "admin",
      username: "admin",
      email: "admin@company.com",
      password: hashedPassword,
      role: "admin",
      createdAt: new Date().toISOString(),
      hasTempPassword: true,
      tempPasswordExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      failedAttempts: 0,
      isLocked: false,
      isActive: true,
      passwordHistory: JSON.stringify([hashedPassword]),
      passwordExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    };
    
    await usersTableClient.upsertEntity(adminUser, "Merge");
    
    console.log("✅ Admin user created successfully!");
    console.log("📋 Login Details:");
    console.log("   URL: http://localhost:3000/admin");
    console.log("   Username: admin");
    console.log("   Password:", tempPassword);
    console.log("   (You will be required to change this password on first login)");
    
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
  }
}

createAdminIfNotExists(); 