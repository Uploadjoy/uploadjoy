import { z } from "zod";
import type {
  AnyRuntime,
  FileRouter,
  PresignedUrlRequestResponse,
  NestedFileRouterConfig,
  AllowedFileType,
  RouteConfig,
} from "../types";
import type { NextApiRequest, NextApiResponse } from "next";
import { fillInputRouteConfig as parseAndExpandInputConfig } from "../utils";
import { lookup } from "mime-types";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const UPLOADJOY_VERSION = require("../../package.json").version as string;

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

const fileVerificationFailed = (
  files: z.infer<typeof uploadActionBodySchema>["files"],
  routeConfig: NestedFileRouterConfig,
  debug: boolean,
) => {
  const fileTypes = new Set(Object.keys(routeConfig) as AllowedFileType[]);

  const hasBlobCatchAll = fileTypes.has("blob");

  // sort the files into their respective types
  const buckets: Partial<
    Record<AllowedFileType, z.infer<typeof uploadActionBodySchema>["files"]>
  > = {};

  for (const file of files) {
    let type: string | undefined | false = file.type.split("/")[0];
    if (!type) {
      type = lookup(file.name);
    }

    if (!type) {
      if (debug) {
        console.warn(
          `[UPLOADJOY][DEBUG] Could not determine file type for ${file.name}.`,
        );
      }
      return true;
    }

    if (!buckets[type as AllowedFileType])
      buckets[type as AllowedFileType] = [];
    else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - buckets[type] is defined
      buckets[type].push(file);
    }
  }

  for (const [type, files] of Object.entries(buckets)) {
    if (!fileTypes.has(type as AllowedFileType) && !hasBlobCatchAll) {
      return true;
    }

    const count = files.length;
    const config = routeConfig[
      type as AllowedFileType
    ] as RouteConfig<AllowedFileType>;

    if (config.maxFileCount && count > config.maxFileCount) {
      return true;
    }

    for (const file of files) {
      const configMaxSizeInBytes = fileSizeToBytes(config.maxFileSize ?? "");
      if (typeof configMaxSizeInBytes !== "number") {
        return true;
      }
      if (config.maxFileSize && file.size > configMaxSizeInBytes) {
        return true;
      }

      // If there is a catchall blob type, we accept all files
      if (hasBlobCatchAll) {
        continue;
      }

      // If there is no acceptedFiles config, we accept all files under type
      // TODO: fix these any casts
      if ((config as any).acceptedFiles) {
        const allowedFileTypes = new Set((config as any).acceptedFiles);
        // if the catchall filetype is in the set, we accept all files
        if (allowedFileTypes.has(`${type}/*` as any)) {
          continue;
        }

        let fileType: string | false = file.type;

        if (!fileType || fileType === "") {
          fileType = lookup(file.name);
          if (!fileType) {
            return true;
          }
        }

        if (!allowedFileTypes.has(fileType as any)) {
          return true;
        }
      }
    }
  }

  return false;
};

const generateUploadJoyURL = (path: `/${string}`) => {
  const host = process.env.CUSTOM_INFRA_URL ?? "https://www.uploadjoy.com";
  return `${host}${path}`;
};

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
        `[UPLOADJOY] Call unsuccessful after ${tries} tries. Retrying in ${Math.floor(
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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const fileData = await withExponentialBackoff(async () => {
    const res = await fetch(queryUrl, {
      headers: {
        Authorization: "Bearer " + upSecret,
      },
    });

    const json = await res.json();
    const file = json.fileData;

    let callbackUrl = file.callbackUrl + `?slug=${file.callbackSlug}`;
    if (!callbackUrl.startsWith("http")) callbackUrl = "http://" + callbackUrl;

    console.log("[UPLOADJOY][DEV] SIMULATING FILE UPLOAD WEBHOOK CALLBACK", {
      key: file.key,
      access: file.access,
    });

    // TODO: Check that we "actually hit our endpoint" and throw a loud error if we didn't
    const response = await fetch(callbackUrl, {
      method: "POST",
      body: JSON.stringify({
        uploadjoyUploadRequestId: requestId,
        metadata: file.metadata ?? {},
        file: {
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
      console.log("[UPLOADJOY][DEV] Successfully simulated callback for file", {
        key: file.key,
        access: file.access,
      });
    } else {
      console.error(
        "[UPLOADJOY][DEV] Failed to simulate callback for file. Is your webhook configured correctly?",
        {
          key: file.key,
          access: file.access,
        },
      );
    }
    return file;
  });

  if (fileData !== null) return fileData;

  console.error(
    `[UPLOADJOY][DEV] Failed to simulate callback for upload ${requestId}`,
  );
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
    /** Enables verbose logging for debugging */
    debug?: boolean;
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
    const isDev = process.env.NODE_ENV === "development";
    const { debug } = config ?? {};

    const { uploadjoyHook, slug, req, res, actionType } = input;
    let reqBody;

    if ("body" in req && typeof req.body === "string") {
      reqBody = JSON.parse(req.body);
    } else {
      reqBody = await (req as Request).json();
    }

    if (isDev && uploadjoyHook && uploadjoyHook === "devServer") {
      void conditionalDevServer(
        reqBody.uploadRequestId as string,
        upSecret ?? "",
      );

      return { status: 200 };
    }

    if (!slug) throw new Error("we need a slug");
    const uploadable = router[slug];

    if (!uploadable) {
      return { status: 404 };
    }

    const access = uploadable._def.access;

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
        console.error("[UPLOADJOY] invalid request body for upload action");
        console.log(reqBody);
        console.log(parseResult.error.issues);
        throw new Error("Invalid request body for upload action");
      }

      const { files } = parseResult.data;

      const middlewareOutput = await uploadable._def.middleware(
        // @ts-expect-error TODO: Fix this
        req as Request,
        { files },
        res,
      );

      const { folder, metadata } = middlewareOutput;
      if (folder) {
        if (typeof folder !== "string")
          throw new Error("Folder must be a string");
        // TODO: Validate folder with regex
      }

      // Validate without Zod (for now)
      if (!Array.isArray(files)) throw new Error("Need file array");

      // FILL THE ROUTE CONFIG so the server only has one happy path
      const parsedConfig = parseAndExpandInputConfig(
        uploadable._def.routerConfig,
      );

      const verificationFailed = fileVerificationFailed(
        files,
        parsedConfig,
        debug ?? false,
      );

      if (verificationFailed) throw new Error("File verification failed");

      // TODO: fix for new router config
      const uploadjoyApiResponse = await fetch(
        generateUploadJoyURL("/api/prepareUpload"),
        {
          method: "POST",
          body: JSON.stringify({
            files: files.map((f) => ({
              key: `${folder ? folder + "/" : ""}${f.name}`,
              uploadType: "standard",
              size: f.size,
              type: f.type ?? lookup(f.name) ?? "application/octet-stream",
            })),
            config: parsedConfig,
            fileAccess: access,
            metadata,
            callbackUrl: config?.callbackUrl ?? GET_DEFAULT_URL(),
            callbackSlug: slug,
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + upSecret,
            "x-uploadjoy-version": UPLOADJOY_VERSION,
          },
        },
      );

      if (!uploadjoyApiResponse.ok) {
        console.error("[UPLOADJOY] unable to get presigned urls");
        try {
          const error = await uploadjoyApiResponse.json();
          console.error(`${uploadjoyApiResponse.status} status code: `, error);
        } catch (e) {
          console.error("[UPLOADJOY] unable to parse response");
        }
        return {
          status: 500,
          message:
            "Unable to get presigned urls from uploadjoy, check server logs.",
        };
      }

      // This is when we send the response back to our form so it can submit the files

      const parsedResponse =
        (await uploadjoyApiResponse.json()) as PresignedUrlRequestResponse;

      if (debug) {
        console.log(
          "[UPLOADJOY][DEBUG] /api/prepareUpload response from uploadjoy: ",
          JSON.stringify(parsedResponse, null, 2),
        );
      }

      return { body: parsedResponse, status: 200 };
    } catch (e) {
      console.error("[UPLOADJOY] middleware failed to run");
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
      const config = parseAndExpandInputConfig(route._def.routerConfig);
      return {
        slug: k as keyof TRouter,
        config,
        access: route._def.access,
      };
    });

    return permissions;
  };
};
