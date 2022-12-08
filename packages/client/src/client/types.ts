import type { OperationError } from "../error.js";

/**
 * Options used to initialize Uploadjoy client
 *
 * @interface ClientOptions
 * @member {string} apiToken API token used to authorize client API calls for a specific Uploadjoy project.
 */
export interface ClientOptions {
  apiToken: string;
  /**
   * Base URL for API
   * @internal
   */
  _apiUrlBase?: string;
}
/**
 * User provided options during API call.
 */
export interface OperationOptions {
  /**
   * Throw error during API call.
   *
   * @default false
   */
  throwOnError?: boolean;
}

// Operation is synonymous with a specific "API call" in this context
export type Operation<
  TInput extends Record<string, unknown>,
  TOutput extends Record<string, unknown> | void,
> = (
  input: TInput,
  opts?: OperationOptions,
) => Promise<TOutput | OperationError>;

type Visibility = "public" | "private";
type PresignedUrlOptions = {
  /**
   * URL expiration in seconds.
   */
  expiresIn?: number;
};

type PresignedUrlOperationConfigs = {
  getPrivateObjects: {
    input: {
      /**
       * Object keys to get presigned URLs for.
       */
      keys: string[];
      presignedUrlOptions?: PresignedUrlOptions;
    };
    output: {
      presignedUrls: {
        key: string;
        url?: string;
        error?: string;
      }[];
    };
  };
  putObjects: {
    input: {
      objects: {
        key: string;
        visibility: Visibility;
        presignedUrlOptions?: PresignedUrlOptions;
      }[];
    };
    output: {
      presignedUrls: (
        | {
            key: string;
            visibility: Visibility;
            url: string;
            fields: Record<string, string>;
          }
        | {
            key: string;
            visibility: Visibility;
            error: string;
          }
      )[];
    };
  };
};

export type PresignedUrlApi = <TOp extends keyof PresignedUrlOperationConfigs>(
  key: TOp,
  input: PresignedUrlOperationConfigs[TOp]["input"],
  opts?: OperationOptions,
) => Promise<PresignedUrlOperationConfigs[TOp]["output"] | OperationError>;

export type APIConfig = {
  presignedUrl: PresignedUrlApi;
};

export type OperationReturnType<
  TOp extends keyof PresignedUrlOperationConfigs,
> = PresignedUrlOperationConfigs[TOp]["output"];

export type OperationParamsType<
  TOp extends keyof PresignedUrlOperationConfigs,
> = PresignedUrlOperationConfigs[TOp]["input"];
