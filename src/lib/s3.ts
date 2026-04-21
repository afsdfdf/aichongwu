import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export function getS3Client() {
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing S3 credentials");
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function getS3Bucket() {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("Missing S3_BUCKET");
  }
  return bucket;
}

export function getS3PublicBaseUrl() {
  const base = process.env.S3_PUBLIC_BASE_URL;
  if (base) {
    return base.replace(/\/$/, "");
  }

  const region = process.env.S3_REGION;
  const bucket = getS3Bucket();
  if (!region) {
    throw new Error("Missing S3_REGION");
  }
  return `https://${bucket}.s3.${region}.amazonaws.com`;
}

export function buildObjectUrl(key: string) {
  return `${getS3PublicBaseUrl()}/${key.replace(/^\/+/, "")}`;
}

export async function uploadBufferToS3(params: {
  buffer: Buffer;
  folder: string;
  contentType: string;
  fileName?: string;
}) {
  const client = getS3Client();
  const ext = params.contentType.includes("png")
    ? "png"
    : params.contentType.includes("webp")
      ? "webp"
      : params.contentType.includes("jpeg") || params.contentType.includes("jpg")
        ? "jpg"
        : "bin";

  const key = `${params.folder}/${params.fileName ?? randomUUID()}.${ext}`;

  await client.send(
    new PutObjectCommand({
      Bucket: getS3Bucket(),
      Key: key,
      Body: params.buffer,
      ContentType: params.contentType,
    }),
  );

  return {
    key,
    url: buildObjectUrl(key),
  };
}

export async function fetchRemoteFileAsBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download remote file: ${response.status}`);
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "application/octet-stream",
  };
}
