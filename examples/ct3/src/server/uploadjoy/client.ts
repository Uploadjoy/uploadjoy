import { Uploadjoy } from "@uploadjoy/client";
import { env } from "../../env/server.mjs";

export const ujClient = new Uploadjoy({
  apiToken: env.UPLOADJOY_TOKEN,
});
