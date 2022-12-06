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
        const response = await uj.presignedUrl("privateObject", { keys });
        console.info("UploadJoy response: ", response);
      } catch (e) {
        console.error("Error calling UJ client: ", e);
      } finally {
        console.log("\n\n");
      }
    }),
});
