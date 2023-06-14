import { createUploadjoy, type FileRouter } from "@uploadjoy/core/solid-start";

const f = createUploadjoy();

export const uploadRouter = {
  imageRoute: f({
    image: {
      maxFileSize: "8MB",
      acceptedFiles: ["image/png", "image/jpeg"],
      maxFileCount: 1,
    },
  })
    .access("private")
    .middleware(async (req, ctx) => {
      const filesToUpload = ctx.files;
      return { metadata: { countInUpload: filesToUpload.length } };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete", metadata, file);
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
