import type { OurFileRouter } from "@/server/uploadjoy";
import { useDropzone } from "@uploadjoy/react/hooks";

export const Dropzone = () => {
  const {
    getInputProps,
    openFileDialog,
    upload,
    getDropzoneRootProps,
    presignedUrls,
    ...rest
  } = useDropzone<OurFileRouter>({
    endpoint: "imageUploader",
    clientCallbacks: {
      onUploadSuccess: (ctx) => {
        console.log("onUploadSuccess", ctx);
      },
    },
  });

  console.log(presignedUrls);

  return (
    <div>
      <h2 className="font-medium text-xl mb-3">Dropzone Component</h2>
      <div
        {...getDropzoneRootProps()}
        className="h-[200px] w-[200px] border-indigo-500 border rounded-md mb-2 focus:border-white flex items-center justify-center border-dashed hover:cursor-pointer flex-col"
        onClick={() => openFileDialog()}
      >
        <p className="text-slate-500">Drag and Drop here!</p>
        <p className="text-slate-500 text-sm">or click to open file dialog</p>
        <input {...getInputProps()} />
      </div>
      <div className="flex gap-4">
        <button
          onClick={() => upload()}
          className="p-2 rounded-md bg-slate-700 w-fit"
        >
          Upload
        </button>
      </div>
    </div>
  );
};
