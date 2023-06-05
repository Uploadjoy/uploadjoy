import { createUploadjoy, type FileRouter } from "@uploadjoy/core/next-legacy";

const f = createUploadjoy();

export const fileRouter = {
  imageUploader: f({
    image: {
      maxFileSize: "1GB",
    },
  })
    .middleware(async (req, ctx, res) => {
      const filesToUpload = ctx.files;
      return { metadata: { countInUpload: filesToUpload.length } };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete", metadata, file);
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof fileRouter;
