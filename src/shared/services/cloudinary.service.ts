import { Injectable, Logger } from '@nestjs/common';
import fetch from 'node-fetch';
import * as FormData from 'form-data';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private cloudName = 'dmtzusaxg';
  private uploadPreset = 'starlight_upload';

  constructor() {
    this.logger.log('✅ Cloudinary service initialized (unsigned upload)');
  }

  async uploadImage(fileBuffer: Buffer, fileName: string, mimeType?: string): Promise<string | null> {
    try {
      this.logger.log(`Starting upload for file: ${fileName}, size: ${fileBuffer.length}, mimeType: ${mimeType}`);

      const form = new FormData();
      form.append('file', fileBuffer, {
        filename: fileName,
        contentType: mimeType || 'application/octet-stream',
      });
      form.append('upload_preset', this.uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        {
          method: 'POST',
          body: form,
        },
      );

      const data = await response.json() as any;

      if (!response.ok) {
        throw new Error(`Cloudinary upload failed: ${data.error?.message || data}`);
      }

      this.logger.log(`Upload successful: ${data.secure_url}`);
      return data.secure_url;
    } catch (error) {
      this.logger.error(`❌ Failed to upload file to Cloudinary:`, error);
      return null;
    }
  }
}