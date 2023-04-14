import type { FetchPresignedUrlsError } from "@uploadjoy/uploader-common";
import {
  fetchPresignedUrlsFromExternalApi,
  getPresignedUrlOpts,
} from "@uploadjoy/uploader-common";
import { Handler, NextRouteHandler, Options } from "src/server/types";

// actions map to the API endpoints in Next.js
const actions = ["presignedUrls/upload"];

const actionIsValid = (action: string | string[] | undefined): boolean => {
  return (
    !action || typeof action === "string" || !actions.includes(action.join("/"))
  );
};

const makeRouteHandler = (options: Options): Handler => {
  const route: NextRouteHandler = async function (req, res) {
    const { action } = req.query;
    if (!actionIsValid(action)) {
      return res.status(404).json({
        message:
          "Unhandled API route called. Please make sure you are using the correct API route.",
      });
    }

    const {
      apiKey,
      canUpload,
      customApiUrl = "https://www.uploadjoy.com/api/v2",
    } = options;

    const inputValidation = getPresignedUrlOpts.safeParse(req.body);

    if (!inputValidation.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: inputValidation.error.issues,
      });
    }

    const { fileAccess, files, folder } = inputValidation.data;

    if (canUpload) {
      const canUploadResult = await canUpload(
        { fileAccess, files, folder },
        req,
        res,
      );
      if (!canUploadResult.canUpload) {
        return res.status(403).json({
          message:
            canUploadResult.message ?? "You are not allowed to upload files",
        });
      }
    }

    const filesWithKey = files.map((file) => ({
      size: file.size,
      type: file.type,
      // folder and file name are validated above
      key: `${folder ?? ""}${file.name}`,
    }));

    try {
      const presignedUrls = await fetchPresignedUrlsFromExternalApi({
        token: apiKey,
        input: {
          files: filesWithKey,
          fileAccess,
        },
        customApiUrl: customApiUrl,
      });

      res.status(200).json(presignedUrls);
    } catch (error) {
      const asFetchError = error as FetchPresignedUrlsError;
      res.status(500).json({
        message: "Error fetching presigned URLs",
        errorFromUploadjoy: asFetchError.responseBody(),
      });
    }
  };

  const configure = (options: Options) => makeRouteHandler(options);

  return Object.assign(route, { configure });
};

const Uploadjoy = makeRouteHandler;

export { Uploadjoy };
