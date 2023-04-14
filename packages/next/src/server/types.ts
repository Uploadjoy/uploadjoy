import type { GetPresignedUrlOpts } from "@uploadjoy/uploader-common";
import type { NextApiRequest, NextApiResponse } from "next";

export type NextRouteHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
) => Promise<void>;

export type Configure = (options: Options) => Handler;
export type Handler = NextRouteHandler & { configure: Configure };

export type Options = {
  apiKey: string;
  canUpload?: (
    ctx: {
      fileAccess: GetPresignedUrlOpts["fileAccess"];
      files: GetPresignedUrlOpts["files"];
      folder: GetPresignedUrlOpts["folder"];
    },
    req: NextApiRequest,
    res: NextApiResponse,
  ) => Promise<
    | {
        canUpload: true;
      }
    | {
        canUpload: false;
        // optional error message to return to the client for debugging
        message?: string;
      }
  >;
  onUploadSuccess?: () => void;
  onUploadError?: () => void;
  customApiUrl?: string;
};
