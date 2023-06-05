"use client";

import { useInput } from "@uploadjoy/react/hooks";
import { OurFileRouter } from "../_uploadjoy";
import { useState } from "react";

export const WithProgress = () => {
  const [percentUploaded, setPercentUploaded] = useState(0);
  const { getInputProps, openFileDialog, upload } = useInput<OurFileRouter>({
    // reset the progress indicator when the file dialog is opened
    onFileDialogOpen: () => {
      setPercentUploaded(0);
    },

    endpoint: "imageRoute",

    clientCallbacks: {
      onUploadSuccess: (ctx) => {
        console.log("onUploadSuccess", ctx);
      },

      onUploadProgress: (ctx) => {
        setPercentUploaded(
          Number(
            (ctx.uploadProgress.loaded / ctx.uploadProgress.total).toFixed(2),
          ),
        );
      },
    },
  });

  console.log("percentUploaded", percentUploaded);

  return (
    <div>
      <h2 className="font-medium text-xl mb-3">
        File Input Component With Upload Progress Indicator
      </h2>
      <input {...getInputProps()} />
      <div className="flex gap-4">
        <button
          onClick={openFileDialog}
          className="p-2 rounded-md bg-indigo-700 w-fit"
        >
          Pick Files
        </button>
        <button
          onClick={() => upload()}
          className="p-2 rounded-md bg-slate-700 w-fit"
        >
          Upload
        </button>
      </div>
      <div className="mt-2">
        {percentUploaded > 0 && <>Upload progress: {percentUploaded * 100}%</>}
      </div>
    </div>
  );
};
