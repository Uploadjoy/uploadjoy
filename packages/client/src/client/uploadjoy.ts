import { OperationError } from "../error.js";
import { API_BASE, ENDPOINTS } from "../constants.js";
import { callApi } from "./call.js";
import {
  APIConfig,
  ClientOptions,
  MultipartUploadApiGroupConfig,
  OperationParamsType,
  OperationReturnType,
  PresignedUrlApiGroupConfig,
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
    let url: string | undefined;
    if (key === "getPrivateObjects") {
      url = this.#createApiUrl(ENDPOINTS.presignedUrl.getPrivateObjects);
    }

    if (key === "putObjects") {
      url = this.#createApiUrl(ENDPOINTS.presignedUrl.putObjects);
    }

    if (key === "multipartUploadObject") {
      url = this.#createApiUrl(ENDPOINTS.presignedUrl.multipartUploadObject);
    }

    if (url) {
      const response = await callApi<
        OperationParamsType<PresignedUrlApiGroupConfig, typeof key>,
        OperationReturnType<PresignedUrlApiGroupConfig, typeof key>
      >({
        url,
        method: "POST",
        token: this.apiToken,
        options: opts,
        input,
      });
      return response;
    }

    if (opts.throwOnError) {
      throw new OperationError(500, { error: "unknown error" });
    }
    return new OperationError(500, { error: "unknown error" });
  };

  public multipartUpload: APIConfig["multipartUpload"] = async (
    key,
    input,
    opts = { throwOnError: false },
  ) => {
    let url: string | undefined;
    if (key === "complete") {
      url = this.#createApiUrl(ENDPOINTS.multipartUpload.complete);
    }

    if (key === "abort") {
      url = this.#createApiUrl(ENDPOINTS.multipartUpload.abort);
    }

    if (url) {
      const response = await callApi<
        OperationParamsType<MultipartUploadApiGroupConfig, typeof key>,
        OperationReturnType<MultipartUploadApiGroupConfig, typeof key>
      >({
        url,
        method: "POST",
        token: this.apiToken,
        options: opts,
        input,
      });
      return response;
    }

    if (opts.throwOnError) {
      throw new OperationError(500, { error: "unknown error" });
    }
    return new OperationError(500, { error: "unknown error" });
  };
}
