import { TableClient, AzureNamedKeyCredential } from '@azure/data-tables';

export interface MappingEntity {
  partitionKey: string;  // customerId
  rowKey: string;       // invoiceNumber
  blobUrl: string;
  uploadDate: string;
}

export class MappingService {
  private tableClient: TableClient;

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
      'mapping',
      credential
    );
  }

  async createMapping(mapping: Omit<MappingEntity, 'partitionKey' | 'rowKey'> & { customerId: string, invoiceNumber: string }): Promise<void> {
    const entity: MappingEntity = {
      partitionKey: mapping.customerId,
      rowKey: mapping.invoiceNumber,
      blobUrl: mapping.blobUrl,
      uploadDate: mapping.uploadDate
    };

    await this.tableClient.createEntity(entity);
  }

  async getMappingsByCustomerId(customerId: string): Promise<MappingEntity[]> {
    const iterator = this.tableClient.listEntities<MappingEntity>({
      queryOptions: { filter: `PartitionKey eq '${customerId}'` }
    });

    const mappings: MappingEntity[] = [];
    for await (const entity of iterator) {
      mappings.push(entity);
    }

    return mappings;
  }

  async getAllMappings(): Promise<MappingEntity[]> {
    const iterator = this.tableClient.listEntities<MappingEntity>();
    const mappings: MappingEntity[] = [];
    
    for await (const entity of iterator) {
      mappings.push(entity);
    }

    return mappings;
  }

  async deleteMapping(customerId: string, invoiceNumber: string): Promise<void> {
    await this.tableClient.deleteEntity(customerId, invoiceNumber);
  }
} 