import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, DocumentType } from '@prisma/client-migration';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class DocumentStorageService {
  private readonly storagePath: string;
  private readonly masterKey: Buffer;

  constructor(
    @Inject('MIGRATION_PRISMA') private prisma: PrismaClient,
    private configService: ConfigService,
  ) {
    // Get storage path from env, default to ./storage/encrypted_documents
    this.storagePath = this.configService.get('DOCUMENT_STORAGE_PATH') || './storage/encrypted_documents';
    
    // Get master key from env - MUST be set, no default for security
    const masterKeyBase64 = this.configService.get('MIGRATION_MASTER_KEY');
    if (!masterKeyBase64 || masterKeyBase64 === 'CHANGE_ME_32_BYTE_BASE64_ENCODED_KEY') {
      throw new Error(
        'MIGRATION_MASTER_KEY must be set in environment variables. ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
      );
    }
    
    this.masterKey = Buffer.from(masterKeyBase64, 'base64');
    
    // Ensure storage directory exists
    this.ensureStorageDirectory();
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDirectory() {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
    } catch (error) {
      console.error('Failed to create storage directory:', error);
    }
  }

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
    // Use master key from environment (already validated in constructor)
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.masterKey, iv);
    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Prepend IV to encrypted key
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt the encryption key
   */
  private decryptKey(encryptedKey: string): string {
    // Extract IV and encrypted data
    const [ivHex, encrypted] = encryptedKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.masterKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
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
    // Create application-specific directory
    const appDir = path.join(this.storagePath, applicationId);
    await fs.mkdir(appDir, { recursive: true });
    
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(appDir, `${timestamp}-${safeFileName}.enc`);
    
    // Write encrypted data to file
    await fs.writeFile(filePath, encryptedData);
    
    // Return metadata as JSON (relative path + IV)
    return JSON.stringify({
      path: path.relative(this.storagePath, filePath),
      iv,
      timestamp,
    });
  }

  /**
   * Load encrypted file from storage
   */
  private async loadEncryptedFile(encryptedPath: string): Promise<{ encryptedData: Buffer; iv: string }> {
    const metadata = JSON.parse(encryptedPath);
    
    // Construct full file path
    const filePath = path.join(this.storagePath, metadata.path);
    
    // Read encrypted data from file
    const encryptedData = await fs.readFile(filePath);
    
    return {
      encryptedData,
      iv: metadata.iv,
    };
  }
}
