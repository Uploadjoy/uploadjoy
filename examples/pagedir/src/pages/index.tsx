import Image from "next/image";

import { useInput } from "@uploadjoy/react/hooks";
import type { OurFileRouter } from "@/server/uploadjoy";

export default function Home() {
  const { getInputProps, openFileDialog, upload } = useInput<OurFileRouter>({
    endpoint: "imageUploader",
    clientCallbacks: {
      onUploadSuccess: (ctx) => {
        console.log(ctx);
      },
    },
  });

  return (
    <>
      <input {...getInputProps()} />
      <button
        onClick={openFileDialog}
        className="p-2 rounded-md bg-indigo-700 m-2"
      >
        Pick Files
      </button>
      <button
        onClick={() => upload()}
        className="p-2 rounded-md bg-slate-700 m-2"
      >
        Upload
      </button>
    </>
  );
}
