import {
  getPresignedUrlsForUpload,
  onUploadError,
  onUploadSuccess,
} from "src/server/actions";
import { Handler, NextRouteHandler, Options } from "src/server/types";

// actions map to the API endpoints in Next.js
const actions = [
  "presignedUrls/upload",
  "upload/success",
  "upload/error",
] as const;

const actionIsValid = (action: string | string[] | undefined): boolean => {
  return (
    !action ||
    typeof action === "string" ||
    !actions.includes(action.join("/") as any)
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

    if (action === "presignedUrls/upload") {
      await getPresignedUrlsForUpload({ req, res, options });
    } else if (action === "upload/success") {
      await onUploadSuccess({ req, res, options });
    } else if (action === "upload/error") {
      await onUploadError({ req, res, options });
    }
  };

  const configure = (options: Options) => makeRouteHandler(options);

  return Object.assign(route, { configure });
};

const Uploadjoy = makeRouteHandler;

export { Uploadjoy };
