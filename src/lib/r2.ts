import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Helper to get active configuration dynamically
function getStorageConfig() {
  const accessKeyId =
    process.env.S3_ACCESS_KEY_ID ||
    process.env.R2_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID;

  const secretAccessKey =
    process.env.S3_SECRET_ACCESS_KEY ||
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY;

  const region =
    process.env.S3_REGION ||
    process.env.AWS_REGION ||
    (process.env.R2_ACCOUNT_ID ? "auto" : "us-east-1");

  const bucketName =
    process.env.S3_BUCKET ||
    process.env.R2_BUCKET_NAME ||
    "anonymous-chat-media";

  const accountId = process.env.R2_ACCOUNT_ID;
  const endpoint =
    process.env.S3_ENDPOINT ||
    process.env.R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  const publicUrlBase =
    process.env.S3_CLOUDFRONT_URL ||
    process.env.R2_PUBLIC_URL ||
    "";

  return {
    accessKeyId,
    secretAccessKey,
    region,
    bucketName,
    endpoint,
    publicUrlBase,
    isConfigured: Boolean(accessKeyId && secretAccessKey && bucketName),
  };
}

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client | null {
  const config = getStorageConfig();
  if (!config.isConfigured) return null;

  if (!s3Client) {
    s3Client = new S3Client({
      region: config.region,
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
      credentials: {
        accessKeyId: config.accessKeyId!,
        secretAccessKey: config.secretAccessKey!,
      },
    });
  }

  return s3Client;
}

/**
 * Generate a presigned PUT URL allowing the client to upload media directly to S3 / Cloudflare R2.
 * Valid for 10 minutes.
 */
export async function createPresignedUploadUrl(
  storageKey: string,
  mimeType: string,
  contentLength: number
): Promise<{ uploadUrl: string; publicUrl: string } | null> {
  const client = getS3Client();
  const config = getStorageConfig();

  if (!client || !config.isConfigured) {
    console.error("Storage credentials not configured (AWS S3 or Cloudflare R2 required).");
    return null;
  }

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: storageKey,
    ContentType: mimeType,
    ContentLength: contentLength,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });

  // Use CloudFront / custom CDN URL if defined, otherwise standard S3 bucket URL
  let publicUrl = "";
  if (config.publicUrlBase) {
    publicUrl = `${config.publicUrlBase.replace(/\/$/, "")}/${storageKey}`;
  } else if (config.endpoint) {
    publicUrl = `${config.endpoint.replace(/\/$/, "")}/${config.bucketName}/${storageKey}`;
  } else {
    publicUrl = `https://${config.bucketName}.s3.${config.region}.amazonaws.com/${storageKey}`;
  }

  return {
    uploadUrl,
    publicUrl,
  };
}

/**
 * Upload an object directly from the server to S3 / Cloudflare R2.
 */
export async function uploadDirectToS3(
  storageKey: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ publicUrl: string } | null> {
  const client = getS3Client();
  const config = getStorageConfig();

  if (!client || !config.isConfigured) {
    console.error("Storage credentials not configured for server-side S3 upload.");
    return null;
  }

  try {
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: storageKey,
      Body: buffer,
      ContentType: mimeType,
      ContentLength: buffer.length,
    });

    await client.send(command);

    let publicUrl = "";
    if (config.publicUrlBase) {
      publicUrl = `${config.publicUrlBase.replace(/\/$/, "")}/${storageKey}`;
    } else if (config.endpoint) {
      publicUrl = `${config.endpoint.replace(/\/$/, "")}/${config.bucketName}/${storageKey}`;
    } else {
      publicUrl = `https://${config.bucketName}.s3.${config.region}.amazonaws.com/${storageKey}`;
    }

    return { publicUrl };
  } catch (err) {
    console.error("Failed to upload file directly to S3:", err);
    return null;
  }
}

/**
 * Delete a single object from S3 / Cloudflare R2.
 */
export async function deleteR2Object(storageKey: string): Promise<boolean> {
  const client = getS3Client();
  const config = getStorageConfig();
  if (!client || !config.isConfigured) return false;

  try {
    const command = new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: storageKey,
    });
    await client.send(command);
    return true;
  } catch (err) {
    console.error("Error deleting storage object:", err);
    return false;
  }
}

/**
 * Bulk delete up to 1000 objects from S3 / Cloudflare R2 (used during cron cleanup).
 */
export async function deleteR2Objects(storageKeys: string[]): Promise<number> {
  const client = getS3Client();
  const config = getStorageConfig();
  if (!client || !config.isConfigured || storageKeys.length === 0) return 0;

  try {
    const command = new DeleteObjectsCommand({
      Bucket: config.bucketName,
      Delete: {
        Objects: storageKeys.map((Key) => ({ Key })),
        Quiet: true,
      },
    });
    await client.send(command);
    return storageKeys.length;
  } catch (err) {
    console.error("Error bulk deleting storage objects:", err);
    return 0;
  }
}
