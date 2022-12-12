import { z } from "zod";

import { router, publicProcedure } from "../trpc";

export const uploadjoyRouter = router({
  privateObject: publicProcedure
    .input(z.object({ keys: z.array(z.string()) }))
    .query(async ({ input, ctx }) => {
      console.info("Uploadjoy presignedUrl.downloadPrivateObjects API call");
      const uj = ctx.uploadJoy;
      const { keys } = input;
      console.info("Input keys: ", keys);
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
        return {};
      } finally {
        console.log("\n\n");
        return {};
      }
    }),
  putObjects: publicProcedure.query(async ({ input, ctx }) => {
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
      return {};
    } finally {
      console.log("\n\n");
      return {};
    }
  }),
  multiPartPresignUrl: publicProcedure.query(async ({ input, ctx }) => {
    console.info("Uploadjoy presignedUrl.multipartUploadObject API call");
    const uj = ctx.uploadJoy;
    try {
      const response = await uj.presignedUrl.multipartUploadObject({
        key: "key.jpg",
        filePartNames: ["1.jpg"],
        visibility: "private",
      });
      console.info("UploadJoy response: ", response);
    } catch (e) {
      console.error("Error calling UJ client: ", e);
      return {};
    } finally {
      console.log("\n\n");
      return {};
    }
  }),
  completeMultiPartUpload: publicProcedure.query(async ({ input, ctx }) => {
    console.info("Uploadjoy multipartUpload.complete API call");
    const uj = ctx.uploadJoy;
    try {
      const response = await uj.multipartUpload.complete({
        uploadId: "test",
        visibility: "private",
        key: "key.jpg",
        completedParts: [
          {
            partNumber: 1,
            eTag: "test",
          },
        ],
      });
      console.info("UploadJoy response: ", response);
    } catch (e) {
      console.error("Error calling UJ client: ", e);
      return {};
    } finally {
      console.log("\n\n");
      return {};
    }
  }),
});
