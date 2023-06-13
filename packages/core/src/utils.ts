import {
  FileRouterInputConfig,
  AllowedFileType,
  FileSize,
  RouteConfig,
  ExpandedNestedFileRouterConfig,
} from "./types";

const getDefaultSizeForType = (fileType: AllowedFileType): FileSize => {
  if (fileType === "image") return "4MB";
  if (fileType === "video") return "16MB";
  if (fileType === "audio") return "8MB";
  if (fileType === "application") return "8MB";
  if (fileType === "font") return "2MB";
  if (fileType === "text") return "4MB";
  if (fileType === "model") return "16MB";

  return "4MB";
};

const getDefaultAcceptedFilesForType = (fileType: AllowedFileType) => {
  // simply return all files that match the type
  return [`${fileType}/*`];
};

/**
 * This function takes in the user's input and "upscales" it to a full config
 *
 * Example:
 * ```ts
 * ["image"] => { image: { maxFileSize: "4MB", limit: 1 } }
 * ```
 */
export const fillInputRouteConfig = (
  routeConfig: FileRouterInputConfig,
): ExpandedNestedFileRouterConfig => {
  // Backfill defaults onto config
  const newConfig: Partial<{ [TType in AllowedFileType]: RouteConfig<TType> }> =
    {};

  Object.keys(routeConfig).forEach((key) => {
    const value = (routeConfig as any)[key] as RouteConfig<AllowedFileType>;
    if (value === undefined || value === null)
      throw new Error("Invalid config");

    const defaultValues = {
      maxFileSize: getDefaultSizeForType(key as AllowedFileType),
      maxFileCount: 1,
      acceptedFiles: getDefaultAcceptedFilesForType(key as AllowedFileType),
    };

    (newConfig as any)[key] = { ...defaultValues, ...value };
  }, {} as ExpandedNestedFileRouterConfig);

  if (Object.keys(newConfig).length === 0) {
    throw new Error("Invalid config");
  }

  // we can cast here because we know the config has at least one key
  return newConfig as ExpandedNestedFileRouterConfig;
};

export const signatureIsValid = async (
  message: string,
  signature: string,
  secret: string,
  crypto: Crypto,
) => {
  const subtle = crypto.subtle;
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await subtle.sign(
    { name: "HMAC", hash: "SHA-256" },
    key,
    new TextEncoder().encode(message),
  );

  // compare the signatures in base64
  return signature === Buffer.from(sig).toString("base64");
};

export const createSignature = async (
  message: string,
  secret: string,
  crypto: Crypto,
) => {
  const subtle = crypto.subtle;
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await subtle.sign(
    { name: "HMAC", hash: "SHA-256" },
    key,
    new TextEncoder().encode(message),
  );

  return Buffer.from(sig).toString("base64");
};

export const GET_DEFAULT_URL = () => {
  /**
   * Use VERCEL_URL as the default callbackUrl if it's set
   * they don't set the protocol, so we need to add it
   * User can override this with the UPLOADTHING_URL env var,
   * if they do, they should include the protocol
   *
   * The pathname must be /api/uploadthing
   * since we call that via webhook, so the user
   * should not override that. Just the protocol and host
   */
  const vcurl = process.env.VERCEL_URL;
  if (vcurl) return `https://${vcurl}/api/uploadjoy`; // SSR should use vercel url
  const ujurl = process.env.UPLOADJOY_URL;
  if (ujurl) return `${ujurl}/api/uploadthing`;

  return `http://localhost:${process.env.PORT ?? 3000}/api/uploadjoy`; // dev SSR should use localhost
};
