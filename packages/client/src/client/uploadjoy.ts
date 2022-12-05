import { API_BASE, ENDPOINTS } from "../constants.js";
import { callApi } from "./call.js";
import {
  APIConfig,
  ClientOptions,
  OperationParamsType,
  OperationReturnType,
} from "./types.js";

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

  _createApiUrl = (endpoint: string) => {
    return `${this.apiBaseUrl}${endpoint}`;
  };

  presignedUrl: APIConfig["presignedUrl"] = {
    privateObject: async (input, opts = { throwOnError: false }) => {
      const url = this._createApiUrl(ENDPOINTS.presignedUrl.privateObject);
      const response = await callApi<
        OperationParamsType<"presignedUrl", "privateObject">[0],
        OperationReturnType<"presignedUrl", "privateObject">
      >({
        url,
        method: "GET",
        token: this.apiToken,
        options: opts,
        input,
      });
      return response;
    },
  } as const;
}
