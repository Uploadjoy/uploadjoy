import { Uploadjoy } from "@uploadjoy/client";
import { env } from "../../env/server.mjs";

const ujClient = new Uploadjoy({
  apiToken: env.UPLOADJOY_TOKEN,
  _apiUrlBase: env.UPLOADJOY_SERVICE_BASE_URL,
});

const a = ujClient.presignedUrl("privateObject", { keys: [] });
