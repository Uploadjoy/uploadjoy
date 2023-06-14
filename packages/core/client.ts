/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export type {
  ClientOnUploadCallback,
  ClientOnUploadFailureCallback,
  ClientOnUploadProgressCallback,
  PresignedUrlRequestResponse,
  EndpointMetadata,
} from "./src/internal/types";
import type {
  PresignedUrlRequestResponse,
  ClientOnUploadCallback,
  ClientOnUploadFailureCallback,
  ClientOnUploadProgressCallback,
} from "./src/internal/types";

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
  urlData,
  fields,
  clientCallbacks,
}: {
  file: File;
  urlData: PresignedUrlRequestResponse["urls"][number];
  fields?: Record<string, string>;
  clientCallbacks?: {
    onUploadProgress?: ClientOnUploadProgressCallback;
    onUploadSuccess?: ClientOnUploadCallback;
    onUploadError?: ClientOnUploadFailureCallback;
  };
}) => {
  // TODO: support multipart uploads
  if (urlData.uploadType === "standard") {
    const access = urlData.access;
    const { onUploadError, onUploadProgress, onUploadSuccess } =
      clientCallbacks ?? {};

    await new Promise<void>((resolve, reject) => {
      const form = new FormData();
      for (const name in fields) {
        form.append(name, fields[name] as string);
      }
      form.append("file", file);

      const uploadId = urlData.uploadjoyUploadRequestId;
      form.append(
        "tagging",
        `<Tagging><TagSet><Tag><Key>UploadRequestId</Key><Value>${uploadId}</Value></Tag></TagSet></Tagging>`,
      );

      const xhr = new XMLHttpRequest();

      xhr.open("POST", urlData.url, true);

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
    }).catch((e) => {
      console.error(e);
    });
  }
};

export const uploadFiles = async ({
  files,
  presignedUrls,
  clientCallbacks,
}: {
  files: File[];
  presignedUrls: PresignedUrlRequestResponse;
  clientCallbacks?: {
    onUploadProgress?: ClientOnUploadProgressCallback;
    onUploadSuccess?: ClientOnUploadCallback;
    onUploadError?: ClientOnUploadFailureCallback;
  };
}) => {
  const urls = presignedUrls.urls;
  const isDev = process.env.NODE_ENV === "development";

  const uploadPromises = urls.map((urlData) => {
    const fileName = urlData.key.split("/").pop() as string;
    const file = files.find((f) => f.name === fileName);

    if (!file) {
      console.error("No file found for presigned URL", urlData);
      throw new Error("No file found for presigned URL");
    }

    if (isDev) {
      // we trigger the dev server in order to simulate a upload webhook
      void fetch("/api/uploadjoy", {
        method: "POST",
        body: JSON.stringify({
          uploadRequestId: urlData.uploadjoyUploadRequestId,
        }),
        headers: {
          "uploadjoy-hook": "devServer",
        },
      });
    }

    // TODO: support multipart uploads
    if (urlData.uploadType === "standard") {
      return uploadFile({
        file,
        urlData,
        fields: urlData.fields,
        clientCallbacks,
      });
    }
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

export { GET_DEFAULT_URL as getUploadjoyUrl } from "./src/utils";
