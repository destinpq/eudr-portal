import { TableClient, AzureNamedKeyCredential, odata, TableTransaction } from '@azure/data-tables';
import { hashPassword, validatePasswordPolicy } from '../utils/password';

export interface AuthEntity {
  partitionKey: string; // Fixed value "user"
  rowKey: string;       // customerId (primary identifier)
  customerId: string;   // Same as rowKey for consistency
  passwordHash: string;
  passwordLastChanged: string; // ISO date string
  passwordExpiryDate: string; // ISO date string
  failedLoginAttempts: number;
  accountLockedUntil: string; // ISO date string or empty
  lastPasswordChange: string; // ISO date string
  passwordHistory: string;  // JSON stringified array of previous password hashes
  forcePasswordChange: boolean;
  role: 'admin' | 'customer';
  dateCreated: string;
}

export class AuthService {
  private tableClient: TableClient;
  private readonly partitionKey = 'user'; // Using a fixed partition key

  constructor() {
    // Only use process.env, do not require .env file
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is not set');
    }

    // Extract account name and key from connection string
    const matches = connectionString.match(/AccountName=([^;]+);AccountKey=([^;]+)/);
    if (!matches) {
      throw new Error('Invalid connection string format');
    }

    const [, accountName, accountKey] = matches;
    const credential = new AzureNamedKeyCredential(accountName, accountKey);
    
    this.tableClient = new TableClient(
      `https://${accountName}.table.core.windows.net`,
      'auth', // Table name for authentication data
      credential
    );
  }

  async getAllUsers(): Promise<AuthEntity[]> {
    console.log('AuthService: Fetching all users from table storage.');
    const iterator = this.tableClient.listEntities<AuthEntity>({
      queryOptions: { filter: odata`PartitionKey eq ${this.partitionKey}` }
    });

    const users: AuthEntity[] = [];
    for await (const entity of iterator) {
      users.push(entity);
    }
    console.log(`AuthService: Found ${users.length} users.`);
    return users;
  }

  async createUser(customerId: string, password: string, role: 'admin' | 'customer' = 'customer'): Promise<AuthEntity> {
      console.log('AuthService: Creating new user with customerId:', customerId);
      // Check if customerId already exists
      const existingUser = await this.getUserByCustomerId(customerId);
      if (existingUser) {
          throw new Error('User with this Customer ID already exists.');
      }

      // Validate password policy
      const policyErrors = validatePasswordPolicy(password, role === 'admin');
      if (policyErrors.length > 0) {
          throw new Error('Password does not meet policy requirements: ' + policyErrors.join(' '));
      }

      // Hash password
      const passwordHash = await hashPassword(password);
      const now = new Date();
      const expiry = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
      const nowIso = now.toISOString();
      const expiryIso = expiry.toISOString();

      const entity: AuthEntity = {
          partitionKey: this.partitionKey,
          rowKey: customerId, // Use customerId as RowKey
          customerId: customerId,
          passwordHash,
          passwordLastChanged: nowIso,
          passwordExpiryDate: expiryIso,
          failedLoginAttempts: 0,
          accountLockedUntil: '',
          lastPasswordChange: nowIso,
          passwordHistory: JSON.stringify([passwordHash]),
          forcePasswordChange: true,
          role: role,
          dateCreated: nowIso.split('T')[0],
      };

      await this.tableClient.createEntity(entity);
      console.log('AuthService: User created successfully:', customerId);
      return entity;
  }

  async getUserByCustomerId(customerId: string): Promise<AuthEntity | undefined> {
      console.log('AuthService: Getting user by customerId:', customerId);
      try {
          const entity = await this.tableClient.getEntity<AuthEntity>(this.partitionKey, customerId);
          console.log('AuthService: User found:', customerId);
          return entity;
      } catch (error: any) {
          if (error.statusCode === 404) {
              console.log('AuthService: User not found:', customerId);
              return undefined; // User not found
          }
          console.error('AuthService: Error getting user by customerId:', customerId, error);
          throw error;
      }
  }

  async updateUser(customerId: string, updates: Partial<AuthEntity>): Promise<AuthEntity> {
      console.log('AuthService: Attempting to update user with customerId:', customerId);
      const userToUpdate = await this.getUserByCustomerId(customerId);
      if (!userToUpdate) {
          throw new Error('User not found.');
      }
      const updatedEntity: AuthEntity = {
          ...userToUpdate,
          ...updates,
          partitionKey: userToUpdate.partitionKey,
          rowKey: userToUpdate.rowKey,
          customerId: userToUpdate.customerId,
      };
      await this.tableClient.updateEntity(updatedEntity, 'Replace');
      console.log('AuthService: User updated successfully:', customerId);
      return updatedEntity;
  }

  async deleteUser(customerId: string): Promise<void> {
      console.log('AuthService: Attempting to delete user with customerId:', customerId);
      
      const userToDelete = await this.getUserByCustomerId(customerId);
      if (!userToDelete) {
          console.log('AuthService: User not found for deletion:', customerId);
          throw new Error('User not found.');
      }

      await this.tableClient.deleteEntity(userToDelete.partitionKey, userToDelete.rowKey);
      console.log('AuthService: User deleted successfully:', customerId);
  }
} 