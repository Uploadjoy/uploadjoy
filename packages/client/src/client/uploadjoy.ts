import { API_BASE } from "../constants.js";
import type { APIConfig, ClientOptions } from "./types.js";

/**
 * Uploadjoy client
 */
export class Uploadjoy {
  private readonly apiToken: string;
  private readonly apiBaseUrl: string = API_BASE;

  constructor({ apiToken, _apiUrlBase }: ClientOptions) {
    this.apiToken = apiToken;
    if (_apiUrlBase) this.apiBaseUrl = _apiUrlBase;
  }

  presignedUrl: APIConfig["presignedUrl"] = {
    privateObject: async (input, opts = { throwOnError: false }) => {
      console.log(this.apiBaseUrl, input, opts);
      console.log(this.apiToken);
      return {
        presignedUrls: [],
      };
    },
  } as const;
}
