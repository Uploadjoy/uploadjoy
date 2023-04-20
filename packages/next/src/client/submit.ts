import { externalApiPutObjectApiOutputSchema } from "@uploadjoy/uploader-common";
import { z } from "zod";

type CallbackParams = {
  fileName: string;
  fileSize: number;
  fileType: string;
  location: string;
  fileAccess: "public" | "private";
};

export type ClientUploadCallback<T = object> = (
  input: CallbackParams & T,
) => Promise<void> | void;

export type ClientUploadProgressCallback = ClientUploadCallback<{
  uploadProgress: Pick<ProgressEvent, "loaded" | "total">;
}>;

const upload = async ({
  file,
  url,
  clientCallbacks,
  location,
  fileAccess,
}: {
  file: File;
  url: string;
  location: string;
  fileAccess: "public" | "private";
  clientCallbacks?: {
    onUploadProgress?: ClientUploadProgressCallback;
    onUploadSuccess?: ClientUploadCallback;
    onUploadError?: ClientUploadCallback;
  };
}) => {
  const buffer = await file.arrayBuffer();
  const {
    onUploadProgress: clientOnUploadProgress,
    onUploadSuccess: clientOnUploadSuccess,
    onUploadError: clientOnUploadError,
  } = clientCallbacks ?? {};

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = async (event: ProgressEvent) => {
      if (clientOnUploadProgress)
        await clientOnUploadProgress({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          location,
          fileAccess,
          uploadProgress: {
            loaded: event.loaded,
            total: event.total,
          },
        });
    };

    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.onreadystatechange = async function () {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (clientOnUploadSuccess)
            await clientOnUploadSuccess({
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              location,
              fileAccess,
            });
          resolve();
        } else {
          if (clientOnUploadError)
            await clientOnUploadError({
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              location,
              fileAccess,
            });
          reject();
        }
      }
    };

    xhr.onerror = async () => {
      if (clientOnUploadError)
        await clientOnUploadError({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          location,
          fileAccess,
        });
      reject();
    };

    xhr.send(buffer);
  });
};

export const submit = async ({
  acceptedFiles,
  presignedUrls,
  clientCallbacks,
  fileAccess,
}: {
  acceptedFiles: File[];
  presignedUrls: z.infer<typeof externalApiPutObjectApiOutputSchema>;
  fileAccess: "public" | "private";
  clientCallbacks?: {
    onUploadProgress?: ClientUploadProgressCallback;
    onUploadSuccess?: ClientUploadCallback;
    onUploadError?: ClientUploadCallback;
  };
}) => {
  const promises = acceptedFiles.map((file) => {
    const presignedUrlData = presignedUrls[file.name];
    if (!presignedUrlData) {
      throw new Error("No presigned URL found for file");
    }
    return upload({
      file,
      url: presignedUrlData.url,
      location: presignedUrlData.location,
      fileAccess,
      clientCallbacks,
    });
  });

  await Promise.allSettled(promises);
};
