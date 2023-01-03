import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

import { trpc } from "../utils/trpc";

export const StandardDropzone = () => {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const { mutateAsync: fetchPresignedUrls } =
    trpc.uploadjoy.uploadObjects.useMutation();
  const [submitDisabled, setSubmitDisabled] = useState(true);

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
            setSubmitDisabled(false);
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
        .then((response) => {
          console.log(response);
          console.log("Successfully uploaded ", file.name);
        })
        .catch((err) => console.error(err));
      setSubmitDisabled(true);
    }
  }, [acceptedFiles, presignedUrl]);

  return (
    <section>
      <h2 className="text-lg font-semibold">Standard Dropzone</h2>
      <p className="mb-3">Simple example for uploading one file at a time</p>
      <div {...getRootProps()} className="dropzone-container">
        <input {...getInputProps()} />
        {isDragActive ? (
          <div className="flex h-full items-center justify-center font-semibold">
            <p>Drop the file here...</p>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center font-semibold">
            <p>Drag n drop file here, or click to select files</p>
          </div>
        )}
      </div>
      <aside className="my-2">
        <h4 className="text-zinc-400 font-semibold">Files pending upload</h4>
        <ul>{files}</ul>
      </aside>
      <button
        onClick={() => handleSubmit()}
        disabled={presignedUrl === null || acceptedFiles.length === 0}
        className="submit-button"
      >
        Upload
      </button>
    </section>
  );
};
