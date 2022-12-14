import { z } from "zod";

import { router, publicProcedure } from "../trpc";

export const uploadjoyRouter = router({
  downloadPrivateObject: publicProcedure
    .input(z.object({ keys: z.array(z.string()) }))
    .query(async ({ input, ctx }) => {
      console.info("Uploadjoy presignedUrl.downloadPrivateObjects API call");
      const uj = ctx.uploadJoy;
      const { keys } = input;
      try {
        const response = await uj.presignedUrl.downloadPrivateObjects(
          {
            keys,
            presignedUrlOptions: { expiresIn: 3600 },
          },
          { throwOnError: false },
        );
        console.info("UploadJoy response: ", response);
      } catch (e) {
        console.error("Error calling UJ client: ", e);
        throw e;
      }
    }),
  uploadObjects: publicProcedure.query(async ({ input, ctx }) => {
    console.info("Uploadjoy presignedUrl.uploadObjects API call");
    const uj = ctx.uploadJoy;
    try {
      const response = await uj.presignedUrl.uploadObjects(
        {
          objects: [
            {
              key: "new.jpg",
              visibility: "private",
            },
          ],
        },
        { throwOnError: false },
      );
      console.info("UploadJoy response: ", response);
    } catch (e) {
      console.error("Error calling UJ client: ", e);
      throw e;
    }
  }),
  multipartUploadObject: publicProcedure.query(async ({ input, ctx }) => {
    console.info("Uploadjoy presignedUrl.multipartUploadObject API call");
    const uj = ctx.uploadJoy;
    try {
      const response = await uj.presignedUrl.multipartUploadObject({
        key: "key.jpg",
        filePartNames: ["1.jpg"],
        visibility: "private",
      });
      console.info("UploadJoy response: ", response);
      return response.data;
    } catch (e) {
      console.error("Error calling UJ client: ", e);
      throw e;
    }
  }),
  completeMultiPartUpload: publicProcedure
    .input(
      z.object({
        uploadId: z.string(),
        key: z.string(),
        completedParts: z.array(
          z.object({
            partNumber: z.number(),
            eTag: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      console.info("Uploadjoy multipartUpload.complete API call");
      const uj = ctx.uploadJoy;
      try {
        const response = await uj.multipartUpload.complete({
          uploadId: input.uploadId,
          key: input.key,
          completedParts: input.completedParts,
        });
        console.info("UploadJoy response: ", response);
        console.log("\n\n");
        return response;
      } catch (e) {
        console.error("Error calling UJ client: ", e);
        console.log("\n\n");
        throw e;
      }
    }),
  abortMultiPartUpload: publicProcedure
    .input(
      z.object({
        uploadId: z.string(),
        key: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      console.info("Uploadjoy multipartUpload.abort API call");
      const uj = ctx.uploadJoy;
      try {
        const response = await uj.multipartUpload.abort({
          uploadId: input.uploadId,
          key: input.key,
        });
        console.info("UploadJoy response: ", response);
        return response;
      } catch (e) {
        console.error("Error calling UJ client: ", e);
        throw e;
      }
    }),
});
