import {
  RouterWithConfig,
  buildPermissionsInfoHandler,
  buildRequestHandler,
} from "../../internal/handler";
import type { FileRouter } from "../../internal/types";
import type { NextApiRequest, NextApiResponse } from "next";
import { webcrypto } from "crypto";

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
const UPLOADJOY_VERSION = require("../../../package.json").version as string;

export const createNextPageApiHandler = <TRouter extends FileRouter>(
  opts: RouterWithConfig<TRouter>,
) => {
  const requestHandler = buildRequestHandler<TRouter, "pages">(opts);

  const getBuildPerms = buildPermissionsInfoHandler<TRouter>(opts);

  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Return valid endpoints
    if (req.method === "GET") {
      const perms = getBuildPerms();
      res.status(200).json(perms);
      return;
    }

    // Get inputs from query and params
    const params = req.query;
    const uploadjoyHook = req.headers["uploadjoy-hook"];
    const webhookSignature = req.headers["x-uploadjoy-wh-signature"];
    const slug = params["slug"];
    const actionType = params["actionType"];

    // Validate inputs
    if (slug && typeof slug !== "string")
      return res.status(400).send("`slug` must not be an array");
    if (actionType && typeof actionType !== "string")
      return res.status(400).send("`actionType` must not be an array");
    if (uploadjoyHook && typeof uploadjoyHook !== "string")
      return res.status(400).send("`uploadjoyHook` must not be an array");
    if (webhookSignature && typeof webhookSignature !== "string")
      return res
        .status(400)
        .send("`x-uploadjoy-wh-signature` must not be an array");

    const response = await requestHandler({
      webhookSignature,
      uploadjoyHook,
      slug,
      actionType,
      req,
      res,
      crypto: webcrypto,
    });

    res.status(response.status);
    res.setHeader("x-uploadjoy-version", UPLOADJOY_VERSION);
    if (response.status === 200) {
      return res.json(response.body);
    }
    return res.send(response.message ?? "Unable to upload file.");
  };
};
