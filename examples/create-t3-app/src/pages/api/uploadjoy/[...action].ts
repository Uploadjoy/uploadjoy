import { Uploadjoy } from "@uploadjoy/next/server";
import { env } from "~/env.mjs";

export default Uploadjoy({
  apiKey: env.UPLOADJOY_API_KEY,
  customApiUrl: env.UPLOADJOY_API_URL,

  canUpload: (ctx, req, res) => {
    if (ctx.fileAccess === "public") {
      return {
        canUpload: false,
        message: "Public uploads are not allowed",
      };
    }

    return {
      canUpload: true,
    };
  },

  webhooks: {
    onUploadSuccess: (params) => {
      console.log("[SERVER]: onUploadSuccess", params);
    },
  },
});
