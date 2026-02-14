import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private minioClient: Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.minioClient = new Client({
      endPoint: this.configService.get('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.configService.get('MINIO_PORT', '9000')),
      useSSL: this.configService.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get('MINIO_ACCESS_KEY', 'admin'),
      secretKey: this.configService.get('MINIO_SECRET_KEY', 'password123'),
    });

    this.bucketName = this.configService.get('MINIO_BUCKET', 'battala-uploads');
  }

  async uploadFile(file: Express.Multer.File, userId: string): Promise<string> {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${userId}/${uuidv4()}.${fileExtension}`;
    
    await this.minioClient.putObject(
      this.bucketName,
      fileName,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
      },
    );

    // Return public URL
    const baseUrl = this.configService.get('MINIO_PUBLIC_URL', `http://localhost:${this.configService.get('MINIO_PORT', '9000')}`);
    return `${baseUrl}/${this.bucketName}/${fileName}`;
  }

  async deleteFile(fileName: string): Promise<void> {
    await this.minioClient.removeObject(this.bucketName, fileName);
  }
}