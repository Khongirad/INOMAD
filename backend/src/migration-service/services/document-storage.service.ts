import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient, DocumentType } from '@prisma/client-migration';
import * as crypto from 'crypto';

@Injectable()
export class DocumentStorageService {
  constructor(
    @Inject('MIGRATION_PRISMA') private prisma: PrismaClient,
  ) {}

  /**
   * Upload and encrypt document
   */
  async uploadDocument(data: {
    applicationId: string;
    documentType: DocumentType;
    fileName: string;
    fileBuffer: Buffer;
    mimeType: string;
    uploadedBy: string;
  }) {
    // Generate encryption key
    const encryptionKey = crypto.randomBytes(32).toString('hex');
    
    // Encrypt file content
    const { encryptedData, iv } = this.encryptData(data.fileBuffer, encryptionKey);
    
    // Generate checksum for integrity
    const checksum = crypto.createHash('sha256').update(data.fileBuffer).digest('hex');

    // TODO: Save encrypted file to secure storage (S3, local encrypted folder, etc.)
    const encryptedPath = await this.saveEncryptedFile(
      data.applicationId,
      data.fileName,
      encryptedData,
      iv,
    );

    // Store metadata in database
    return this.prisma.document.create({
      data: {
        applicationId: data.applicationId,
        documentType: data.documentType,
        fileName: data.fileName,
        fileSize: data.fileBuffer.length,
        mimeType: data.mimeType,
        encryptedPath,
        encryptionKey: this.encryptKey(encryptionKey), // Encrypt the key itself
        checksum,
        uploadedBy: data.uploadedBy,
      },
    });
  }

  /**
   * Retrieve and decrypt document
   */
  async getDocument(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return null;
    }

    // Decrypt encryption key
    const encryptionKey = this.decryptKey(document.encryptionKey);

    // Load encrypted file
    const { encryptedData, iv } = await this.loadEncryptedFile(document.encryptedPath);

    // Decrypt file content
    const decryptedData = this.decryptData(encryptedData, encryptionKey, iv);

    // Verify checksum
    const checksum = crypto.createHash('sha256').update(decryptedData).digest('hex');
    if (checksum !== document.checksum) {
      throw new Error('Document integrity check failed');
    }

    return {
      ...document,
      fileContent: decryptedData,
    };
  }

  /**
   * Get all documents for application
   */
  async getDocumentsByApplication(applicationId: string) {
    return this.prisma.document.findMany({
      where: { applicationId },
      orderBy: { uploadedAt: 'asc' },
    });
  }

  /**
   * Encrypt data using AES-256
   */
  private encryptData(data: Buffer, key: string): { encryptedData: Buffer; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    const encryptedData = Buffer.concat([cipher.update(data), cipher.final()]);
    
    return {
      encryptedData,
      iv: iv.toString('hex'),
    };
  }

  /**
   * Decrypt data using AES-256
   */
  private decryptData(encryptedData: Buffer, key: string, ivHex: string): Buffer {
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    const decryptedData = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    
    return decryptedData;
  }

  /**
   * Encrypt the encryption key itself (using master key from env)
   */
  private encryptKey(key: string): string {
    // TODO: Use a master key from environment variables
    const masterKey = process.env.MIGRATION_MASTER_KEY || 'default-insecure-key-change-me';
    const cipher = crypto.createCipher('aes-256-cbc', masterKey);
    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Decrypt the encryption key
   */
  private decryptKey(encryptedKey: string): string {
    const masterKey = process.env.MIGRATION_MASTER_KEY || 'default-insecure-key-change-me';
    const decipher = crypto.createDecipher('aes-256-cbc', masterKey);
    let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Save encrypted file to storage
   */
  private async saveEncryptedFile(
    applicationId: string,
    fileName: string,
    encryptedData: Buffer,
    iv: string,
  ): Promise<string> {
    // TODO: Implement actual file storage (S3, local encrypted folder, etc.)
    // For now, return a placeholder path
    const path = `encrypted/${applicationId}/${Date.now()}-${fileName}`;
    
    // Store metadata about storage location
    return JSON.stringify({ path, iv });
  }

  /**
   * Load encrypted file from storage
   */
  private async loadEncryptedFile(encryptedPath: string): Promise<{ encryptedData: Buffer; iv: string }> {
    // TODO: Implement actual file loading
    const metadata = JSON.parse(encryptedPath);
    
    // Placeholder - return empty buffer and IV from metadata
    return {
      encryptedData: Buffer.from(''),
      iv: metadata.iv,
    };
  }
}
