import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client!: Minio.Client;
  private bucket!: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.bucket = this.config.get<string>('MINIO_BUCKET') ?? 'sterling';
    this.client = new Minio.Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT') ?? 'localhost',
      port: this.config.get<number>('MINIO_PORT') ?? 9000,
      useSSL: this.config.get<boolean>('MINIO_USE_SSL') ?? false,
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY') ?? 'minioadmin',
      secretKey: this.config.get<string>('MINIO_SECRET_KEY') ?? 'minioadmin',
    });

    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Created MinIO bucket: ${this.bucket}`);
      }
    } catch (err) {
      this.logger.warn(`MinIO unavailable — file storage disabled: ${(err as Error).message}`);
    }
  }

  async uploadBuffer(
    objectPath: string,
    buffer: Buffer,
    contentType = 'application/octet-stream',
  ): Promise<string> {
    await this.client.putObject(this.bucket, objectPath, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    return objectPath;
  }

  async getPresignedUrl(objectPath: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, objectPath, expirySeconds);
  }

  async deleteObject(objectPath: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectPath);
  }
}
