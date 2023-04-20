import { type NextPage } from "next";
import { useInput } from "@uploadjoy/next/client";

const Home: NextPage = () => {
  const { uploadFiles, openFileDialog, getInputProps, presignedUrls } =
    useInput({
      folder: "test-folder/",
      fileAccess: "private",
      clientCallbacks: {
        onUploadProgress(ctx) {
          console.log(
            ctx.fileName,
            "progress:",
            ctx.uploadProgress.loaded,
            "bytes"
          );
        },
        onUploadSuccess(ctx) {
          console.log(ctx.fileName, "uploaded");
        },
        onUploadError(ctx) {
          console.log(ctx.fileName, "upload error");
        },
      },
    });

  console.log(presignedUrls);

  return (
    <>
      {/* hidden file input element */}
      <input {...getInputProps()} />
      <button onClick={openFileDialog}>Open</button>
      <button
        onClick={async () => {
          await uploadFiles();
        }}
      >
        Submit
      </button>
    </>
  );
};

export default Home;
