import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

import { trpc } from "../utils/trpc";

export const Dropzone = () => {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const { mutateAsync: fetchPresignedUrls } =
    trpc.uploadjoy.uploadObjects.useMutation();

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } =
    useDropzone({
      maxFiles: 1,
      maxSize: 5 * 2 ** 30, // roughly 5GB
      multiple: false,
      onDropAccepted: async (files, event) => {
        const file = files[0] as File;

        const presignedUrlFetchResponse = await fetchPresignedUrls({
          objects: [{ key: file.name, visibility: "private" }],
        });

        if (presignedUrlFetchResponse) {
          const presignedUrlData =
            presignedUrlFetchResponse.presignedUrls.filter(
              (data) => data.key === file.name,
            )[0];

          if (presignedUrlData?.url) {
            setPresignedUrl(presignedUrlData?.url);
          }
        }
      },
    });

  const files = acceptedFiles.map((file) => (
    <li key={file.name}>
      {file.name} - {file.size} bytes
    </li>
  ));

  const handleSubmit = useCallback(async () => {
    if (acceptedFiles.length > 0 && presignedUrl !== null) {
      const file = acceptedFiles[0] as File;
      await axios
        .put(presignedUrl, file.slice(), {
          headers: { "Content-Type": file.type },
        })
        .then((response) => console.log(response))
        .catch((err) => console.error(err));
    }
  }, [acceptedFiles, presignedUrl]);

  return (
    <section className="p-10">
      <h2 className="text-lg font-semibold">Standard Dropzone</h2>
      <p className="mb-3">Simple example for uploading one file at a time</p>
      <div {...getRootProps()} className="dropzone-container">
        <input {...getInputProps()} />
        {isDragActive ? (
          <div className="flex h-full items-center justify-center font-semibold">
            <p>Drop the files here...</p>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center font-semibold">
            <p>Drag n drop some files here, or click to select files</p>
          </div>
        )}
      </div>
      <aside className="my-2">
        <h4 className="text-zinc-500 font-semibold">Files pending upload</h4>
        <ul>{files}</ul>
      </aside>
      <button
        onClick={() => handleSubmit()}
        disabled={presignedUrl === null || acceptedFiles.length === 0}
        className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70"
      >
        Upload
      </button>
    </section>
  );
};
