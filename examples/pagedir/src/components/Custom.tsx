import { generateReactHelpers } from "@uploadjoy/react/hooks";
import type { OurFileRouter } from "@/server/uploadjoy";
import { useState } from "react";
import { PresignedUrlRequestResponse } from "@uploadjoy/core/client";

const { useUploadjoy } = generateReactHelpers<OurFileRouter>();

export const CustomComponentWithHelpers = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [presignedUrls, setPresignedUrls] = useState<
    PresignedUrlRequestResponse | undefined
  >(undefined);

  const {
    isUploading,
    fetchPresignedUrls,
    startUpload,
    permittedFileInfo,
    getMimeTypesFromConfig,
  } = useUploadjoy({ endpoint: "imageUploader" });

  return (
    <div>
      <h2 className="font-medium text-xl mb-3">
        Custom Component with Helpers
      </h2>
      {permittedFileInfo && (
        <div>
          <input
            type="file"
            onChange={async (e) => {
              setFiles(Array.from(e.target.files ?? []));
              const presignedUrls = await fetchPresignedUrls({
                files: Array.from(e.target.files ?? []),
              });
              setPresignedUrls(presignedUrls);
            }}
            accept={getMimeTypesFromConfig(permittedFileInfo.config).join(",")}
          />
          {files.length > 0 &&
            files.map((file) => <div key={file.name}>{file.name}</div>)}

          {presignedUrls && (
            <button
              onClick={() =>
                startUpload({
                  presignedUrls,
                  files,
                  clientCallbacks: {
                    onUploadSuccess: (ctx) => {
                      console.log("onUploadSuccess", ctx);
                    },
                  },
                })
              }
              className="p-2 rounded-md bg-slate-700 w-fit disabled:bg-slate-400 disabled:cursor-not-allowed"
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
