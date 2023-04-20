import type {
  GetPresignedUrlOpts,
  OnUploadWebhookParam,
} from "@uploadjoy/uploader-common";
import type { NextApiRequest, NextApiResponse } from "next";

export type NextRouteHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
) => Promise<void>;

export type Configure = (options: Options) => Handler;
export type Handler = NextRouteHandler & { configure: Configure };

export type Options = {
  apiKey: string;
  /**
   * Optional function to check if the user is allowed to upload files, or perform any other middleware logic. This function runs _before_ the presigned URLs are fetched from the Uploadjoy API.
   *
   * @param ctx - Context object containing the file access, files, and folder
   * @param req - Next.js request object
   * @param res - Next.js response object
   * @returns - Promise that resolves to an object with a `canUpload` boolean. If `canUpload` is `false`, the request will be rejected with a 403 status code. If `canUpload` is `true`, the request will continue to fetch presigned URLs from the Uploadjoy API.
   */
  canUpload?: (
    ctx: {
      fileAccess: GetPresignedUrlOpts["fileAccess"];
      files: GetPresignedUrlOpts["files"];
      folder: GetPresignedUrlOpts["folder"];
    },
    req: NextApiRequest,
    res: NextApiResponse,
  ) =>
    | Promise<
        | {
            canUpload: true;
          }
        | {
            canUpload: false;
            // optional error message to return to the client for debugging
            message?: string;
          }
      >
    | (
        | {
            canUpload: true;
          }
        | {
            canUpload: false;
            // optional error message to return to the client for debugging
            message?: string;
          }
      );

  /**
   * Webhooks for Uploadjoy file events. Not yet implemented.
   */
  webhooks?: {
    onUploadSuccess?: (params: OnUploadWebhookParam) => Promise<void> | void;
  };
  customApiUrl?: string;
};
