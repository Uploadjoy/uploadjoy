import { uploadRouter } from "../../_uploadjoy";
import { createNextRouteHandler } from "@uploadjoy/core/next";

export const runtime = "edge";

export const { GET, POST } = createNextRouteHandler({
  router: uploadRouter,
  config: {
    debug: true,
  },
});
