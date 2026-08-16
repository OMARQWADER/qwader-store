
import { v2 as cloudinary } from "cloudinary";

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary config missing: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET",
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  return cloudinary;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");

  if (lastDot === -1) {
    return `${relKey}_${hash}`;
  }

  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const cloud = getCloudinaryConfig();
  const key = appendHashSuffix(normalizeKey(relKey));

  const buffer =
    typeof data === "string" ? Buffer.from(data) : Buffer.from(data);

  const result = await new Promise<any>((resolve, reject) => {
    const upload = cloud.uploader.upload_stream(
      {
        resource_type: "auto",
        public_id: key.replace(/\.[^/.]+$/, ""),
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );

    upload.end(buffer);
  });

  if (!result?.secure_url) {
    throw new Error("Cloudinary returned no secure URL");
  }

  return {
    key,
    url: result.secure_url,
  };
}

export async function storageGet(
  relKey: string,
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  return {
    key,
    url: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${key}`,
  };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const cloud = getCloudinaryConfig();
  const key = normalizeKey(relKey).replace(/\.[^/.]+$/, "");

  return cloud.url(key, {
    secure: true,
    resource_type: "image",
  });
}