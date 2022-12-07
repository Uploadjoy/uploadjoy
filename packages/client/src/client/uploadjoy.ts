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

  #createApiUrl = (endpoint: string) => {
    return `${this.apiBaseUrl}${endpoint}`;
  };

  public presignedUrl: APIConfig["presignedUrl"] = async (
    key,
    input,
    opts = { throwOnError: false },
  ) => {
    if (key === "privateObject") {
      const url = this.#createApiUrl(ENDPOINTS.presignedUrl.privateObject);
      const response = await callApi<
        OperationParamsType<typeof key>,
        OperationReturnType<typeof key>
      >({
        url,
        method: "POST",
        token: this.apiToken,
        options: opts,
        input,
      });
      return response;
    }
    return;
  };
}
