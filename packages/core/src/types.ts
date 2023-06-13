import type { NextApiRequest, NextApiResponse } from "next";
import { NextRequest } from "next/server";

// Utils
export const unsetMarker = "unsetMarker" as "unsetMarker" & {
  __brand: "unsetMarker";
};
export type UnsetMarker = typeof unsetMarker;

type Simplify<TType> = { [TKey in keyof TType]: TType[TKey] } & {};

export type MaybePromise<TType> = TType | Promise<TType>;

// Package
export type AnyRuntime = "app" | "pages" | "web";
export interface AnyParams {
  _metadata: any; // imaginary field used to bind metadata return type to an Upload resolver
  _runtime: any;
}

type UploadedFile = {
  name: string;
  key: string;
  url: string;
  access: "public" | "private";
  size: number;
};

/**
 * Discrete MIME type https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_Types
 * "blob" is a catch-all for any file type not explicitly supported
 */
export type AllowedFileType =
  | "image"
  | "video"
  | "audio"
  | "font"
  | "text"
  | "model"
  | "application"
  | "blob";

type FileExtension = `.${string}`;

export type ClientOnUploadCallback = (input: {
  file: File;
  access: "private" | "public";
}) => Promise<void> | void;

export type ClientOnUploadFailureCallback = (input: {
  file: File;
  access: "private" | "public";
}) => Promise<void> | void;

export type ClientOnUploadProgressCallback = (input: {
  file: File;
  access: "private" | "public";
  uploadProgress: Pick<ProgressEvent, "loaded" | "total">;
}) => Promise<void> | void;

export type PresignedUrlRequestResponse = {
  urls: {
    uploadType: "standard";
    url: string;
    fields: Record<string, string>;
    key: string;
    uploadjoyUploadRequestId: string;
    access: "public" | "private";
  }[];
};

type PowOf2 = 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024;
export type SizeUnit = "B" | "KB" | "MB" | "GB";
export type FileSize = `${PowOf2}${SizeUnit}`;

type BlobTypeRouteConfig = {
  maxFileSize?: FileSize;
  maxFileCount?: number;
};

export type RouteConfigExBlob<TMime extends Exclude<AllowedFileType, "blob">> =
  {
    maxFileSize?: FileSize;
    maxFileCount?: number;
    /**
     * Specific MIME types to accept. Specifying `${type}/*` takes precedence over other MIME types, and accepts all types.
     *
     * @example ["image/png", "image/jpeg"]
     * @example ["video/*"]
     */
    acceptedFiles?: `${TMime}/${string}`[];
  };

export type RouteConfig<TMime extends AllowedFileType> = TMime extends "blob"
  ? BlobTypeRouteConfig
  : TMime extends Exclude<AllowedFileType, "blob">
  ? RouteConfigExBlob<TMime>
  : never;

// Used to ensure that at least one of the keys is set in the config
type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> &
  U[keyof U];

export type NestedFileRouterConfig = AtLeastOne<{
  [TType in AllowedFileType]: RouteConfig<TType>;
}>;

export type ExpandedNestedFileRouterConfig = AtLeastOne<{
  [TType in AllowedFileType]: Required<RouteConfig<TType>>;
}>;

export type FileRouterInputConfig = NestedFileRouterConfig;

type ResolverOptions<TParams extends AnyParams> = {
  metadata: Simplify<
    TParams["_metadata"] extends UnsetMarker ? undefined : TParams["_metadata"]
  >;

  file: UploadedFile;
  uploadjoyUploadRequestId: string;
};

// middleware context allows users to easily access data relevant to the upload request
type MiddlewareContext = {
  files: { name: string; size: number; type: string }[];
};

/** middleware output allows users to pass metadata and add per upload configuration to the upload */
type MiddlewareOutput = {
  /** metadata stored with the object on upload */
  metadata?: Record<string, unknown>;

  /** Folder to upload object to. If not set,
   * the object will be uploaded to the root of your project.
   *
   * Folders need not exist prior to upload.
   * Folders should not end with a trailing slash.
   *
   * @example `${userId}/images`
   *
   * The S3 key of an object uploaded to
   * the above example folder would be
   * `${projectName}/${userId}/images/${fileName}`
   */
  folder?: string;
};

export type ReqMiddlewareFn<TOutput extends MiddlewareOutput> = (
  req: Request,
  ctx: MiddlewareContext,
) => MaybePromise<TOutput>;
export type NextReqMiddlewareFn<TOutput extends MiddlewareOutput> = (
  req: NextRequest,
  ctx: MiddlewareContext,
) => MaybePromise<TOutput>;
export type NextApiMiddlewareFn<TOutput extends MiddlewareOutput> = (
  req: NextApiRequest,
  ctx: MiddlewareContext,
  res: NextApiResponse,
) => MaybePromise<TOutput>;

type MiddlewareFn<
  TOutput extends MiddlewareOutput,
  TRuntime extends string,
> = TRuntime extends "web"
  ? ReqMiddlewareFn<TOutput>
  : TRuntime extends "app"
  ? NextReqMiddlewareFn<TOutput>
  : NextApiMiddlewareFn<TOutput>;

type ResolverFn<TParams extends AnyParams> = (
  opts: ResolverOptions<TParams>,
) => MaybePromise<void>;

export interface UploadBuilder<TParams extends AnyParams> {
  access: (access: "public" | "private") => UploadBuilder<TParams>;
  middleware: <TOutput extends MiddlewareOutput>(
    fn: MiddlewareFn<TOutput, TParams["_runtime"]>,
  ) => UploadBuilder<{
    _metadata: TOutput["metadata"];
    _runtime: TParams["_runtime"];
  }>;

  onUploadComplete: (fn: ResolverFn<TParams>) => Uploader<TParams>;
}

export type UploadBuilderDef<TRuntime extends AnyRuntime> = {
  access: "public" | "private";
  middleware: MiddlewareFn<MiddlewareOutput, TRuntime>;
  routerConfig: FileRouterInputConfig;
};

export interface Uploader<TParams extends AnyParams> {
  _def: TParams & UploadBuilderDef<TParams["_runtime"]>;
  resolver: ResolverFn<TParams>;
}

export type FileRouter<TParams extends AnyParams = AnyParams> = Record<
  string,
  Uploader<TParams>
>;
