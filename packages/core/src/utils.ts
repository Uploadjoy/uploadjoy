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
