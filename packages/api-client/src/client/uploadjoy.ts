import { API_BASE, ENDPOINTS } from "../constants.js";
import { callApi } from "./call.js";
import {
  ClientOptions,
  MultipartUploadApiGroupConfig,
  OperationOptions,
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

  public readonly presignedUrl = {
    downloadPrivateObjects: async (
      input: OperationParamsType<
        PresignedUrlApiGroupConfig,
        "downloadPrivateObjects"
      >,
      opts: OperationOptions = { throwOnError: false },
    ) => {
      const url = this.#createApiUrl(
        ENDPOINTS.presignedUrl.downloadPrivateObjects,
      );
      const response = await callApi<
        OperationParamsType<
          PresignedUrlApiGroupConfig,
          "downloadPrivateObjects"
        >,
        OperationReturnType<
          PresignedUrlApiGroupConfig,
          "downloadPrivateObjects"
        >
      >({
        url,
        method: "POST",
        token: this.apiToken,
        options: opts,
        input,
      });
      return response;
    },

    uploadObjects: async (
      input: OperationParamsType<PresignedUrlApiGroupConfig, "uploadObjects">,
      opts: OperationOptions = { throwOnError: false },
    ) => {
      const url = this.#createApiUrl(ENDPOINTS.presignedUrl.uploadObjects);
      const response = await callApi<
        OperationParamsType<PresignedUrlApiGroupConfig, "uploadObjects">,
        OperationReturnType<PresignedUrlApiGroupConfig, "uploadObjects">
      >({
        url,
        method: "POST",
        token: this.apiToken,
        options: opts,
        input,
      });
      return response;
    },

    multipartUploadObject: async (
      input: OperationParamsType<
        PresignedUrlApiGroupConfig,
        "multipartUploadObject"
      >,
      opts: OperationOptions = { throwOnError: false },
    ) => {
      const url = this.#createApiUrl(
        ENDPOINTS.presignedUrl.multipartUploadObject,
      );
      const response = await callApi<
        OperationParamsType<
          PresignedUrlApiGroupConfig,
          "multipartUploadObject"
        >,
        OperationReturnType<PresignedUrlApiGroupConfig, "multipartUploadObject">
      >({
        url,
        method: "POST",
        token: this.apiToken,
        options: opts,
        input,
      });
      return response;
    },
  };

  public readonly multipartUpload = {
    complete: async (
      input: OperationParamsType<MultipartUploadApiGroupConfig, "complete">,
      opts: OperationOptions = { throwOnError: false },
    ) => {
      const url = this.#createApiUrl(ENDPOINTS.multipartUpload.complete);
      const response = await callApi<
        OperationParamsType<MultipartUploadApiGroupConfig, "complete">,
        OperationReturnType<MultipartUploadApiGroupConfig, "complete">
      >({
        url,
        method: "POST",
        token: this.apiToken,
        options: opts,
        input,
      });
      return response;
    },
    abort: async (
      input: OperationParamsType<MultipartUploadApiGroupConfig, "abort">,
      opts: OperationOptions = { throwOnError: false },
    ) => {
      const url = this.#createApiUrl(ENDPOINTS.multipartUpload.abort);
      const response = await callApi<
        OperationParamsType<MultipartUploadApiGroupConfig, "abort">,
        OperationReturnType<MultipartUploadApiGroupConfig, "abort">
      >({
        url,
        method: "POST",
        token: this.apiToken,
        options: opts,
        input,
      });
      return response;
    },
  };
}
