"use client";

import { useInput } from "@uploadjoy/react/hooks";
import { OurFileRouter } from "../_uploadjoy";

export const BasicInput = () => {
  const { getInputProps, openFileDialog, upload, readyToUpload, isUploading } =
    useInput<OurFileRouter>({
      endpoint: "imageRoute",
      clientCallbacks: {
        onUploadSuccess: (ctx) => {
          console.log("onUploadSuccess", ctx);
        },
      },
    });

  return (
    <div>
      <h2 className="font-medium text-xl mb-3">Basic File Input Component</h2>
      <input {...getInputProps()} />
      <div className="flex gap-4">
        <button
          onClick={openFileDialog}
          className="p-2 rounded-md bg-indigo-700 w-fit"
        >
          Pick Files
        </button>

        {readyToUpload && (
          <button
            onClick={() => upload()}
            className="p-2 rounded-md bg-slate-700 w-fit disabled:bg-slate-400 disabled:cursor-not-allowed"
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        )}
      </div>
    </div>
  );
};
