import { z } from "zod";

import { router, publicProcedure } from "../trpc";

export const uploadjoyRouter = router({
  privateObject: publicProcedure
    .input(z.object({ keys: z.array(z.string()) }))
    .query(async ({ input, ctx }) => {
      console.info("Uploadjoy presignedUrl privateObject API call");
      const uj = ctx.uploadJoy;
      const { keys } = input;
      console.info("Input keys: ", keys);
      try {
        const response = await uj.presignedUrl(
          "getPrivateObjects",
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
    console.info("Uploadjoy presignedUrl putObjects API call");
    const uj = ctx.uploadJoy;
    try {
      const response = await uj.presignedUrl(
        "putObjects",
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
});
