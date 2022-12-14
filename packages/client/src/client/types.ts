export interface HTTPError extends Record<string, unknown> {
  statusCode: number;
  message?: string;
  body: any;
}

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

type APIGroupConfig = Record<string, { input: any; output: any }>;

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
  TOutput extends Record<string, unknown>,
> = (input: TInput, opts?: OperationOptions) => Promise<TOutput | HTTPError>;

type Visibility = "public" | "private";
type PresignedUrlOptions = {
  /**
   * URL expiration in seconds.
   */
  expiresIn?: number;
};

export type PresignedUrlApiGroupConfig = {
  downloadPrivateObjects: {
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
  uploadObjects: {
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
  multipartUploadObject: {
    input: {
      key: string;
      visibility: Visibility;
      presignedUrlOptions?: PresignedUrlOptions;
      filePartNames: string[];
    };
    output: {
      key: string;
      visibility: Visibility;
      uploadId: string;
      presignedUrls:
        | {
            filePartName: string;
            url: string;
            fields: Record<string, string>;
            partNumber: number;
          }
        | {
            filePartName: string;
            error: string;
          }[];
    };
  };
};

export type MultipartUploadApiGroupConfig = {
  complete: {
    input: {
      uploadId: string;
      key: string;
      completedParts: {
        partNumber: number;
        eTag: string;
      }[];
    };
    output: {
      uploadId: string;
      key: string;
    };
  };
  abort: {
    input: {
      uploadId: string;
      key: string;
    };
    output: {
      uploadId: string;
      key: string;
    };
  };
};

export type OperationReturnType<
  TConfig extends APIGroupConfig,
  TOperation extends keyof TConfig,
> = TConfig[TOperation]["output"];

export type OperationParamsType<
  TConfig extends APIGroupConfig,
  TOperation extends keyof TConfig,
> = TConfig[TOperation]["input"];
