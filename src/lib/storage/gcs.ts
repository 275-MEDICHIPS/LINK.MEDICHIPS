import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
});

const BUCKETS = {
  media: process.env.GCS_BUCKET_MEDIA || "medichips-link-media",
  uploads: process.env.GCS_BUCKET_UPLOADS || "medichips-link-uploads",
  certs: process.env.GCS_BUCKET_CERTS || "medichips-link-certs",
};

/**
 * Generate a signed upload URL for direct client upload.
 */
export async function getSignedUploadUrl(
  bucket: keyof typeof BUCKETS,
  fileName: string,
  contentType: string,
  expiresInMin = 15
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const bucketName = BUCKETS[bucket];
  const file = storage.bucket(bucketName).file(fileName);

  const [uploadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + expiresInMin * 60 * 1000,
    contentType,
  });

  const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
  return { uploadUrl, publicUrl };
}

/**
 * Generate a signed read URL.
 */
export async function getSignedReadUrl(
  bucket: keyof typeof BUCKETS,
  fileName: string,
  expiresInMin = 60
): Promise<string> {
  const bucketName = BUCKETS[bucket];
  const file = storage.bucket(bucketName).file(fileName);

  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + expiresInMin * 60 * 1000,
  });

  return url;
}

/**
 * Delete a file from GCS.
 */
export async function deleteFile(
  bucket: keyof typeof BUCKETS,
  fileName: string
): Promise<void> {
  const bucketName = BUCKETS[bucket];
  await storage.bucket(bucketName).file(fileName).delete();
}

/**
 * Upload a buffer directly to GCS.
 */
export async function uploadBuffer(
  bucket: keyof typeof BUCKETS,
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const bucketName = BUCKETS[bucket];
  const file = storage.bucket(bucketName).file(fileName);

  await file.save(buffer, { contentType, resumable: false });
  return `https://storage.googleapis.com/${bucketName}/${fileName}`;
}
