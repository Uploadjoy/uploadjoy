/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export type {
  AllowedFiles,
  ClientOnUploadCallback,
  ClientOnUploadFailureCallback,
  ClientOnUploadProgressCallback,
} from "./src/types";
import type {
  PresignedUrlRequestResponse,
  ClientOnUploadCallback,
  ClientOnUploadFailureCallback,
  ClientOnUploadProgressCallback,
} from "./src/types";

const createRequestPermsUrl = (config: { url?: string; slug: string }) => {
  const queryParams = `?actionType=upload&slug=${config.slug}`;

  return `${config?.url ?? "/api/uploadjoy"}${queryParams}`;
};

export const fetchPresignedUrls = async <T extends string>(
  files: File[],
  endpoint: T,
) => {
  const url = createRequestPermsUrl({ slug: endpoint });

  const presignedUrlRes = await fetch(url, {
    method: "POST",
    body: JSON.stringify({
      files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
    }),
  }).then(async (res) => {
    // check for 200 response
    if (!res.ok) throw new Error("Failed to get presigned URLs");

    // attempt to parse response
    try {
      return (await res.json()) as PresignedUrlRequestResponse;
    } catch (e) {
      // response is not JSON
      console.error(e);
      throw new Error(`Failed to parse response as JSON. Got: ${res.body}`);
    }
  });

  return presignedUrlRes;
};

const uploadFile = async ({
  file,
  url,
  fields,
  access,
  clientCallbacks,
}: {
  file: File;
  url: string;
  fields: Record<string, string>;
  access: "public" | "private";
  clientCallbacks?: {
    onUploadProgress?: ClientOnUploadProgressCallback;
    onUploadSuccess?: ClientOnUploadCallback;
    onUploadError?: ClientOnUploadFailureCallback;
  };
}) => {
  const { onUploadError, onUploadProgress, onUploadSuccess } =
    clientCallbacks ?? {};

  await new Promise<void>((resolve, reject) => {
    const form = new FormData();
    for (const name in fields) {
      form.append(name, fields[name] as string);
    }
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = async (event: ProgressEvent) => {
      if (onUploadProgress)
        await onUploadProgress({
          file,
          access,
          uploadProgress: {
            loaded: event.loaded,
            total: event.total,
          },
        });
    };

    xhr.onerror = async () => {
      if (onUploadError)
        await onUploadError({
          file,
          access,
        });
      reject();
    };

    xhr.onreadystatechange = async function () {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onUploadSuccess)
            await onUploadSuccess({
              file,
              access,
            });
          resolve();
        } else {
          if (onUploadError)
            await onUploadError({
              file,
              access,
            });
          reject();
        }
      }
    };

    xhr.send(form);
  });
};

export const uploadFiles = async ({
  files,
  access,
  presignedUrls,
  clientCallbacks,
}: {
  files: File[];
  access: "public" | "private";
  presignedUrls: PresignedUrlRequestResponse;
  clientCallbacks?: {
    onUploadProgress?: ClientOnUploadProgressCallback;
    onUploadSuccess?: ClientOnUploadCallback;
    onUploadError?: ClientOnUploadFailureCallback;
  };
}) => {
  const urls = presignedUrls.urls;
  const uploadPromises = urls.map((urlData) => {
    const fileName = urlData.key.split("/").pop() as string;
    const file = files.find((f) => f.name === fileName);

    if (!file) {
      console.error("No file found for presigned URL", urlData);
      throw new Error("No file found for presigned URL");
    }

    return uploadFile({
      file,
      url: urlData.url,
      fields: urlData.fields,
      access,
      clientCallbacks,
    });
  });

  await Promise.all(uploadPromises);
};

export const classNames = (...classes: string[]) => {
  return classes.filter(Boolean).join(" ");
};

export const generateMimeTypes = (fileTypes: string[]) => {
  return fileTypes.map((type) => `${type}/*`);
};

export const generateClientDropzoneAccept = (fileTypes: string[]) => {
  const mimeTypes = generateMimeTypes(fileTypes);
  return Object.fromEntries(mimeTypes.map((type) => [type, []]));
};
