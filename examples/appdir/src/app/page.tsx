"use client";

import { Inter } from "next/font/google";
import { useInput } from "@uploadjoy/react/hooks";
import { OurFileRouter } from "./_uploadjoy";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const { getInputProps, openFileDialog, upload } = useInput<OurFileRouter>({
    endpoint: "imageRoute",
    clientCallbacks: {
      onUploadSuccess: (ctx) => {
        console.log(ctx);
      },
    },
  });
  return (
    <main>
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
    </main>
  );
}
