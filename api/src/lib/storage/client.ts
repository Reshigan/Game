import AWS from 'aws-sdk';

/**
 * S3-compatible storage client.
 * Supports AWS S3, MinIO, Cloudflare R2, and other S3-compatible services.
 */
const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT;
const STORAGE_REGION = process.env.STORAGE_REGION || 'us-east-1';
const STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY_ID;
const STORAGE_SECRET_KEY = process.env.STORAGE_SECRET_ACCESS_KEY;
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'word-cloud-exports';

if (!STORAGE_ACCESS_KEY || !STORAGE_SECRET_KEY) {
  throw new Error('STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY must be set');
}

const s3Config: AWS.S3.Types.ClientConfiguration = {
  region: STORAGE_REGION,
  accessKeyId: STORAGE_ACCESS_KEY,
  secretAccessKey: STORAGE_SECRET_KEY,
};

// Add custom endpoint for MinIO, R2, etc.
if (STORAGE_ENDPOINT) {
  s3Config.endpoint = new AWS.Endpoint(STORAGE_ENDPOINT);
  s3Config.s3ForcePathStyle = true;
}

export const s3Client = new AWS.S3(s3Config);

/**
 * Upload a file to S3-compatible storage.
 */
export async function uploadFile(
  key: string,
  body: Buffer | string,
  contentType: string,
  tenantId: string
): Promise<string> {
  const prefixedKey = `${tenantId}/${key}`;

  await s3Client
    .putObject({
      Bucket: STORAGE_BUCKET,
      Key: prefixedKey,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // 1 year cache
    })
    .promise();

  return prefixedKey;
}

/**
 * Download a file from S3-compatible storage.
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const response = await s3Client
    .getObject({
      Bucket: STORAGE_BUCKET,
      Key: key,
    })
    .promise();

  return response.Body as Buffer;
}

/**
 * Generate a signed URL for direct download.
 */
export function getSignedUrl(key: string, expiresIn: number = 3600): string {
  return s3Client.getSignedUrl('getObject', {
    Bucket: STORAGE_BUCKET,
    Key: key,
    Expires: expiresIn,
  });
}

/**
 * Delete a file from S3-compatible storage.
 */
export async function deleteFile(key: string): Promise<void> {
  await s3Client
    .deleteObject({
      Bucket: STORAGE_BUCKET,
      Key: key,
    })
    .promise();
}

/**
 * List files for a tenant.
 */
export async function listTenantFiles(tenantId: string): Promise<string[]> {
  const response = await s3Client
    .listObjectsV2({
      Bucket: STORAGE_BUCKET,
      Prefix: `${tenantId}/`,
    })
    .promise();

  return (response.Contents || []).map((obj) => obj.Key).filter(Boolean) as string[];
}