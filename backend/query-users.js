require("dotenv").config();
const { TableClient } = require("@azure/data-tables");

async function queryAllUsers() {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const tableUsers = process.env.AZURE_TABLE_USERS;
    
    const usersTableClient = TableClient.fromConnectionString(
      connectionString,
      tableUsers
    );
    
    console.log("Connecting to Azure Table Storage...");
    console.log("Table:", tableUsers);
    
    // Query all users
    const users = [];
    const entitiesIter = usersTableClient.listEntities();
    
    for await (const entity of entitiesIter) {
      users.push(entity);
    }
    
    console.log(`\n📊 Found ${users.length} users in the database:\n`);
    
    if (users.length === 0) {
      console.log("No users found in the database.");
    } else {
      users.forEach((user, index) => {
        console.log(`👤 User ${index + 1}:`);
        console.log(`   Username: ${user.username || 'N/A'}`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        console.log(`   Role: ${user.role || 'N/A'}`);
        console.log(`   Status: ${user.status || 'N/A'}`);
        console.log(`   Created: ${user.createdAt || 'N/A'}`);
        console.log(`   Last Login: ${user.lastLogin || 'Never'}`);
        console.log(`   Password Expires: ${user.passwordExpiry || 'N/A'}`);
        console.log(`   Failed Attempts: ${user.failedAttempts || 0}`);
        console.log(`   Is Locked: ${user.isLocked || false}`);
        console.log(`   Has Temp Password: ${user.hasTempPassword || false}`);
        console.log(`   Row Key: ${user.rowKey || 'N/A'}`);
        console.log(`   Partition Key: ${user.partitionKey || 'N/A'}`);
        console.log('   ---');
      });
    }
    
  } catch (error) {
    console.error("❌ Error querying users:", error.message);
    if (error.message.includes('does not exist')) {
      console.log("\n💡 The Users table might not have been created yet.");
      console.log("Run your backend server first to create the admin user and table.");
    }
  }
}

queryAllUsers(); 