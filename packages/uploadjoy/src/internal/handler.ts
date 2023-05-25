import { z } from "zod";
import type {
  AnyRuntime,
  FileRouter,
  PresignedUrlRequestResponse,
} from "../types";
import type { NextApiRequest, NextApiResponse } from "next";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const UPLOADJOY_VERSION = require("../../package.json").version;

const UNITS = ["B", "KB", "MB", "GB"] as const;
type SizeUnit = (typeof UNITS)[number];

export const fileSizeToBytes = (input: string) => {
  const regex = new RegExp(`^(\\d+)(\\.\\d+)?\\s*(${UNITS.join("|")})$`, "i");
  const match = input.match(regex);

  if (!match) {
    return new Error("Invalid file size format");
  }

  const sizeValue = parseFloat(match[1]);
  const sizeUnit = match[3].toUpperCase() as SizeUnit;

  if (!UNITS.includes(sizeUnit)) {
    throw new Error("Invalid file size unit");
  }
  const bytes = sizeValue * Math.pow(1024, UNITS.indexOf(sizeUnit));
  return Math.floor(bytes);
};

const generateUploadJoyURL = (path: `/${string}`) => {
  const host = process.env.CUSTOM_INFRA_URL ?? "https://uploadjoy.com";
  return `${host}${path}`;
};

if (process.env.NODE_ENV !== "development") {
  console.log("[UJ] UploadThing dev server is now running!");
}

const isValidResponse = (response: Response) => {
  if (!response.ok) return false;
  if (response.status >= 400) return false;
  //if (!response.headers.has("x-uploadjoy-version")) return false;

  return true;
};

const withExponentialBackoff = async <T>(
  doTheThing: () => Promise<T | null>,
  MAXIMUM_BACKOFF_MS = 64 * 1000,
  MAX_RETRIES = 20,
): Promise<T | null> => {
  let tries = 0;
  let backoffMs = 500;
  let backoffFuzzMs = 0;

  let result = null;
  while (tries <= MAX_RETRIES) {
    result = await doTheThing();
    if (result !== null) return result;

    tries += 1;
    backoffMs = Math.min(MAXIMUM_BACKOFF_MS, backoffMs * 2);
    backoffFuzzMs = Math.floor(Math.random() * 500);

    if (tries > 3) {
      console.error(
        `[UJ] Call unsuccessful after ${tries} tries. Retrying in ${Math.floor(
          backoffMs / 1000,
        )} seconds...`,
      );
    }

    await new Promise((r) => setTimeout(r, backoffMs + backoffFuzzMs));
  }

  return null;
};

const conditionalDevServer = async (requestId: string, upSecret: string) => {
  if (process.env.NODE_ENV !== "development") return;

  const queryUrl = generateUploadJoyURL(
    `/api/pollUpload?uploadRequestId=${requestId}`,
  );

  const fileData = await withExponentialBackoff(async () => {
    const res = await fetch(queryUrl, {
      headers: {
        Authorization: "Bearer " + upSecret,
      },
    });
    const json = await res.json();

    const file = json.fileData;

    if (json.status !== "done") return null;

    let callbackUrl = file.callbackUrl + `?slug=${file.callbackSlug}`;
    if (!callbackUrl.startsWith("http")) callbackUrl = "http://" + callbackUrl;

    console.log("[UJ] SIMULATING FILE UPLOAD WEBHOOK CALLBACK", callbackUrl);

    // TODO: Check that we "actually hit our endpoint" and throw a loud error if we didn't
    const response = await fetch(callbackUrl, {
      method: "POST",
      body: JSON.stringify({
        uploadjoyUploadRequestId: requestId,
        metadata: JSON.parse(file.metadata ?? "{}"),
        file: {
          // TODO: change this URL
          url: file.url,
          key: file.key,
          name: file.name,
          access: file.access,
          size: file.size,
        },
      }),
      headers: {
        "uploadjoy-hook": "callback",
      },
    });
    if (isValidResponse(response)) {
      console.log("[UJ] Successfully simulated callback for file", file);
    } else {
      console.error(
        "[UJ] Failed to simulate callback for file. Is your webhook configured correctly?",
        requestId,
      );
    }
    return file;
  });

  if (fileData !== null) return fileData;

  console.error(`[UJ] Failed to simulate callback for upload ${requestId}`);
  throw new Error("File took too long to upload");
};

const GET_DEFAULT_URL = () => {
  // TODO: make platform agnostic
  const vcurl = process.env.VERCEL_URL;
  if (vcurl) return `https://${vcurl}/api/uploadjoy`; // SSR should use vercel url

  return `http://localhost:${process.env.PORT ?? 3000}/api/uploadjoy`; // dev SSR should use localhost
};

export type RouterWithConfig<TRouter extends FileRouter> = {
  router: TRouter;
  config?: {
    callbackUrl?: string;
    uploadjoySecret?: string;
  };
};

const uploadActionBodySchema = z.object({
  files: z.array(
    z.object({
      name: z.string(),
      size: z.number(),
      type: z.string(),
    }),
  ),
});

export const buildRequestHandler = <
  TRouter extends FileRouter,
  TRuntime extends AnyRuntime,
>(
  opts: RouterWithConfig<TRouter>,
) => {
  return async (input: {
    uploadjoyHook?: string;
    slug?: string;
    actionType?: string;
    req: TRuntime extends "pages" ? NextApiRequest : Partial<Request>;
    res?: TRuntime extends "pages" ? NextApiResponse : undefined;
  }) => {
    const { router, config } = opts;
    const upSecret = config?.uploadjoySecret ?? process.env.UPLOADJOY_SECRET;

    const { uploadjoyHook, slug, req, res, actionType } = input;
    if (!slug) throw new Error("we need a slug");
    const uploadable = router[slug];

    if (!uploadable) {
      return { status: 404 };
    }

    const access = uploadable._def.access;

    const reqBody =
      "body" in req && typeof req.body === "string"
        ? JSON.parse(req.body)
        : await (req as Request).json();

    if (uploadjoyHook && uploadjoyHook === "callback") {
      // This is when we receive the webhook from uploadjoy
      await uploadable.resolver({
        file: reqBody.file,
        metadata: reqBody.metadata,
        uploadjoyUploadRequestId: reqBody.uploadjoyUploadRequestId,
      });

      return { status: 200 };
    }

    if (!actionType || actionType !== "upload") {
      // This would either be someone spamming
      // or the AWS webhook

      return { status: 404 };
    }

    try {
      const parseResult = uploadActionBodySchema.safeParse(reqBody);
      if (!parseResult.success) {
        console.error("[UJ] invalid request body for upload action");
        throw new Error("Invalid request body for upload action");
      }

      const { files } = parseResult.data;

      const maxFiles = uploadable._def.maxFiles;
      if (maxFiles && files.length > maxFiles) {
        throw new Error("Too many files");
      }

      const metadata = await uploadable._def.middleware(
        // @ts-expect-error TODO: Fix this
        req as Request,
        { files },
        res,
      );

      // if folder is set, we validate it and throw if it's not valid
      // @ts-expect-error TODO: Fix this
      const { folder } = metadata;
      if (folder) {
        if (typeof folder !== "string")
          throw new Error("Folder must be a string");
        // TODO: Validate folder with regex
      }

      // Once that passes, persist in DB

      // Validate without Zod (for now)
      if (!Array.isArray(files) || !files.every((f) => typeof f === "string"))
        throw new Error("Need file array");

      // TODO: Make this a function
      const uploadjoyApiResponse = await fetch(
        generateUploadJoyURL("/api/prepareUpload"),
        {
          method: "POST",
          body: JSON.stringify({
            files: files.map((f) => ({
              ...f,
              uploadType: "standard",
            })),
            fileTypes: uploadable._def.fileTypes,
            fileAccess: access,
            metadata,
            callbackUrl: config?.callbackUrl ?? GET_DEFAULT_URL(),
            callbackSlug: slug,
            maxFileSize: fileSizeToBytes(uploadable._def.maxSize ?? "16MB"),
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + upSecret,
            "x-uploadjoy-version": UPLOADJOY_VERSION,
          },
        },
      );

      if (!uploadjoyApiResponse.ok) {
        console.error("[UJ] unable to get presigned urls");
        try {
          const error = await uploadjoyApiResponse.json();
          console.error(error);
        } catch (e) {
          console.error("[UJ] unable to parse response");
        }
        throw new Error("ending upload");
      }

      // This is when we send the response back to our form so it can submit the files

      const parsedResponse =
        (await uploadjoyApiResponse.json()) as PresignedUrlRequestResponse;

      if (process.env.NODE_ENV === "development") {
        parsedResponse.urls.forEach((url) => {
          void conditionalDevServer(
            url.uploadjoyUploadRequestId,
            upSecret ?? "",
          );
        });
      }

      return { body: parsedResponse, status: 200 };
    } catch (e) {
      console.error("[UJ] middleware failed to run");
      console.error(e);

      return { status: 400, message: (e as Error).toString() };
    }
  };
};

export const buildPermissionsInfoHandler = <TRouter extends FileRouter>(
  opts: RouterWithConfig<TRouter>,
) => {
  return () => {
    const r = opts.router;

    const permissions = Object.keys(r).map((k) => {
      const route = r[k];
      return {
        slug: k as keyof TRouter,
        maxSize: route._def.maxSize,
        fileTypes: route._def.fileTypes,
        maxFiles: route._def.maxFiles,
        access: route._def.access,
      };
    });

    return permissions;
  };
};
