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

export interface OperationOptions {
  onErrorThrow?: boolean;
}

export type Operation<
  TInput extends Record<string, unknown>,
  TOutput extends Record<string, unknown>,
> = (input: TInput, opts?: OperationOptions) => Promise<TOutput>;

export interface APIConfig {
  presignedUrl: {
    privateObject: Operation<{ keys: string[] }, any>;
  };
}
