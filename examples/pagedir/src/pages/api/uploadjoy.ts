import { createNextPageApiHandler } from "@uploadjoy/core/next-legacy";
import { fileRouter } from "@/server/uploadjoy";

const handler = createNextPageApiHandler({
  router: fileRouter,
  config: {
    debug: true,
  },
});

export default handler;
