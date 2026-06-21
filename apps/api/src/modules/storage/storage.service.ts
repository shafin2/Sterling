import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client!: S3Client;
  private bucket!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.bucket = this.config.get<string>('S3_BUCKET') ?? 'sterling';
    this.client = new S3Client({
      region: this.config.get<string>('AWS_REGION') ?? 'us-east-1',
      credentials: {
        accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });
    this.logger.log(`S3 storage initialized — bucket: ${this.bucket}`);
  }

  async uploadBuffer(
    objectPath: string,
    buffer: Buffer,
    contentType = 'application/octet-stream',
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectPath,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return objectPath;
  }

  async getPresignedUrl(objectPath: string, expirySeconds = 3600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: objectPath }),
      { expiresIn: expirySeconds },
    );
  }

  async deleteObject(objectPath: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectPath }),
    );
  }
}
