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

export type Operation<
  TInput extends Record<string, unknown>,
  TOutput extends Record<string, unknown> | void,
> = (input: TInput, opts?: OperationOptions) => Promise<TOutput>;

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
