import { useCallback, useState } from "react";
import { trpc } from "../utils/trpc";
import { useDropzone } from "react-dropzone";
import axios from "axios";

// determines the ideal file part size for multipart upload based on file's total size
const calculateChunkSize = (fileSize: number) => {
  const FiveGB = 5 * 2 ** 30;
  const FiveHundredGB = 500 * 2 ** 30;
  const FiveTB = 5 * 2 ** 40;
  if (fileSize <= FiveGB) {
    return 50 * 2 ** 20; // 50MB
  } else if (fileSize <= FiveHundredGB) {
    return 50 * 2 ** 20; // 50MB
  } else if (fileSize <= FiveTB) {
    return Math.ceil(FiveTB / 10000); // use the full 10k allowed parts
  }

  return 500 * 2 ** 20; // 500MB
};

const splitFileIntoParts = (file: File) => {
  const chunkSize = calculateChunkSize(file.size);
  const numberOfChunks = Math.ceil(file.size / chunkSize);
  let chunk = 0;
  const fileParts: File[] = [];
  while (chunk < numberOfChunks) {
    const chunkStart = chunk * chunkSize;
    const chunkEnd = Math.min(file.size, chunkStart + chunkSize);
    const filePartBlob = file.slice(chunkStart, chunkEnd);
    const filePartName = `CHUNK${chunk}-${file.name}`;
    const filePart = new File([filePartBlob], filePartName);
    fileParts.push(filePart);
    chunk += 1;
  }
  const partsAsObj: { [partName: string]: File } = {};
  for (const part of fileParts) {
    partsAsObj[part.name] = part;
  }
  return partsAsObj;
};

export const MultipartDropzone = () => {
  // presigned URLs for uploading each file part
  const [partPresignedUrls, setPartPresignedUrls] = useState<
    { partName: string; url: string; partNumber: number }[]
  >([]);
  const [fileParts, setFileParts] = useState<{ [partName: string]: File }>({});
  const [uploadId, setUploadId] = useState<string>("");
  const [submitDisabled, setSubmitDisabled] = useState(true);

  const { mutateAsync: fetchPresignedUrls } =
    trpc.uploadjoy.multipartUploadObject.useMutation();
  const { mutateAsync: completeUpload } =
    trpc.uploadjoy.completeMultiPartUpload.useMutation();

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } =
    useDropzone({
      maxFiles: 1,
      maxSize: 5 * 2 ** 40, // roughly 5TB
      minSize: 1 * 2 ** 20, // 1MB -> S3 limitation
      multiple: false,
      onDropAccepted: async (files, event) => {
        const file = files[0] as File;

        const parts = splitFileIntoParts(file);
        const partNames = Object.keys(parts);
        setFileParts(parts);

        const presignedUrlsFetchResponse = await fetchPresignedUrls({
          key: file.name,
          visibility: "private",
          filePartNames: partNames,
        });

        if (presignedUrlsFetchResponse) {
          const urls = presignedUrlsFetchResponse.presignedUrls.map((url) => ({
            partName: url.filePartName as string,
            url: url.url as string,
            partNumber: url.partNumber as number,
          }));
          setPartPresignedUrls(urls);
          setUploadId(presignedUrlsFetchResponse.uploadId);
          setSubmitDisabled(false);
        }
      },
    });

  const handleSubmit = useCallback(async () => {
    const uploadPromises: Promise<{
      partNumber: number;
      eTag: string;
    }>[] = [];
    if (acceptedFiles.length > 0) {
      const key = (acceptedFiles[0] as File).name;
      for (const { partName, url, partNumber } of partPresignedUrls) {
        const file = fileParts[partName] as File;
        uploadPromises.push(
          axios
            .put(url, file.slice(), {
              onUploadProgress(progressEvent) {
                console.log(
                  `${partName} upload progress: ${progressEvent.loaded} of ${progressEvent.total} bytes uploaded`,
                );
              },
            })
            .then((response) => ({
              eTag: response.headers.etag as string, // Entity tag for the uploaded object
              partNumber: partNumber,
            })),
        );
      }

      const awaitedUploads = await Promise.all(uploadPromises);

      await completeUpload({ completedParts: awaitedUploads, key, uploadId });
      console.log("Successfully uploaded ", key);
      setSubmitDisabled(true);
    }
  }, [acceptedFiles, completeUpload, fileParts, partPresignedUrls, uploadId]);

  const files = acceptedFiles.map((file) => (
    <li key={file.name}>
      {file.name} - {file.size} bytes
    </li>
  ));

  return (
    <section>
      <h2 className="text-lg font-semibold">Multipart Upload Dropzone</h2>
      <p className="mb-3">Example dropzone that performs a multipart upload</p>
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
        disabled={submitDisabled}
        className="submit-button"
      >
        Upload
      </button>
    </section>
  );
};
