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

type HTTPMethods = "GET" | "POST" | "PUT";

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

export interface APIConfig {
  presignedUrl: {
    privateObject: Operation<
      { keys: string[] },
      {
        presignedUrls: {
          key: string;
          url?: string;
          error?: string;
        }[];
      }
    >;
  };
}

export type OperationReturnType<
  T extends keyof APIConfig,
  K extends keyof APIConfig[T],
> = ReturnType<APIConfig[T][K]>;

export type OperationParamsType<
  T extends keyof APIConfig,
  K extends keyof APIConfig[T],
> = Parameters<APIConfig[T][K]>;
