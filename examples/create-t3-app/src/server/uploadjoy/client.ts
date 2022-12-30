import { Uploadjoy } from "@uploadjoy/client";

export const ujClient = new Uploadjoy({
  apiToken: process.env.UPLOADJOY_TOKEN as string,
});
