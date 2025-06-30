require("dotenv").config();
const { TableClient } = require("@azure/data-tables");

async function resetAdminUser() {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const tableUsers = process.env.AZURE_TABLE_USERS;
    
    const usersTableClient = TableClient.fromConnectionString(
      connectionString,
      tableUsers
    );
    
    console.log("🔄 Resetting admin user...");
    
    // Delete the existing admin user
    try {
      await usersTableClient.deleteEntity("admin", "admin");
      console.log("✅ Deleted existing admin user from database");
    } catch (error) {
      if (error.message.includes('ResourceNotFound')) {
        console.log("ℹ️  No existing admin user found (that's okay)");
      } else {
        throw error;
      }
    }
    
    console.log("✅ Admin user reset complete!");
    console.log("\n📋 Next steps:");
    console.log("1. Restart your backend server");
    console.log("2. The server will automatically create a new admin user");
    console.log("3. Check the server console for the new temporary password");
    console.log("4. Login at http://localhost:3000/admin with:");
    console.log("   Username: admin");
    console.log("   Password: [new temporary password from console]");
    
  } catch (error) {
    console.error("❌ Error resetting admin user:", error.message);
  }
}

resetAdminUser(); 