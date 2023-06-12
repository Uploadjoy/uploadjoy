import { createNextPageApiHandler } from "@uploadjoy/core/next-legacy";
import { fileRouter } from "@/server/uploadjoy";

const handler = createNextPageApiHandler({
  router: fileRouter,
  config: {
    debug: true,
    uploadjoySecret: process.env.UPLOADJOY_SECRET,
  },
});

export default handler;
