import { getPresignedUrlsForUpload } from "./src/server/actions";
import type { Handler, NextRouteHandler, Options } from "./src/server/types";

// actions map to the API endpoints in Next.js
const actions = ["presignedUrls/upload"] as const;

const actionIsValid = (action: string | string[] | undefined): boolean => {
  return (
    action !== undefined &&
    typeof action !== "string" &&
    actions.includes(action.join("/") as any)
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

    const actionString = (action as string[]).join("/");

    if (actionString === "presignedUrls/upload") {
      await getPresignedUrlsForUpload({ req, res, options });
    }
  };

  const configure = (options: Options) => makeRouteHandler(options);

  return Object.assign(route, { configure });
};

const Uploadjoy = makeRouteHandler;

export { Uploadjoy };
