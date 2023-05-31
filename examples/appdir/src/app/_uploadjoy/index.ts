import { createUploadjoy, type FileRouter } from "@uploadjoy/core/next";

const f = createUploadjoy();

export const uploadRouter = {
  imageRoute: f({ image: {} })
    .middleware(async (req, ctx) => {
      const filesToUpload = ctx.files;
      return { metadata: { countInUpload: filesToUpload.length } };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete", metadata, file);
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
