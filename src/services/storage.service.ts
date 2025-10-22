import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

class StorageService {
  private containerClient: ContainerClient | null = null;
  private readonly containerName: string;

  constructor() {
    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'poster-images';
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

      if (!connectionString) {
        console.warn('Azure Storage connection string not configured. Image upload will be disabled.');
        return;
      }

      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      this.containerClient = blobServiceClient.getContainerClient(this.containerName);
    } catch (error) {
      console.error('Failed to initialize Azure Blob Storage client:', error);
    }
  }

  async ensureContainerExists(): Promise<void> {
    if (!this.containerClient) {
      throw new Error('Storage client not initialized');
    }

    try {
      await this.containerClient.createIfNotExists({
        access: 'blob', // Public read access for images
      });
    } catch (error) {
      console.error('Failed to create container:', error);
      throw error;
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    userId: string
  ): Promise<string> {
    if (!this.containerClient) {
      throw new Error('Storage client not initialized');
    }

    await this.ensureContainerExists();

    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const blobName = `${userId}/${uuidv4()}.${fileExtension}`;

    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    // Upload file
    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: {
        blobContentType: file.mimetype,
      },
    });

    // Return the URL
    return blockBlobClient.url;
  }

  async deleteImage(imageUrl: string): Promise<void> {
    if (!this.containerClient) {
      throw new Error('Storage client not initialized');
    }

    try {
      // Extract blob name from URL
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const blobName = pathParts.slice(2).join('/'); // Skip container name

      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.deleteIfExists();
    } catch (error) {
      console.error('Failed to delete image:', error);
      // Don't throw - allow deletion to continue even if image doesn't exist
    }
  }
}

export default new StorageService();
