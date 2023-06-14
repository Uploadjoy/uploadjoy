import { createServerHandler } from "@uploadjoy/core/solid-start";

import { uploadRouter } from "~/server/uploadjoy";

export const { GET, POST } = createServerHandler({
  router: uploadRouter,
  config: {
    callbackUrl: `http://localhost:${process.env.PORT ?? 3003}/api/uploadjoy`,
    uploadjoySecret: process.env.UPLOADJOY_SECRET as string,
  },
});
