import {
  RouterWithConfig,
  buildPermissionsInfoHandler,
  buildRequestHandler,
} from "../../internal/handler";
import type { FileRouter } from "../../types";

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
const UPLOADJOY_VERSION = require("../../../package.json").version as string;

export const createNextRouteHandler = <TRouter extends FileRouter>(
  opts: RouterWithConfig<TRouter>,
) => {
  const requestHandler = buildRequestHandler<TRouter, "app">(opts);

  const POST = async (req: Request) => {
    const params = new URL(req.url).searchParams;
    const uploadjoyHook = req.headers.get("uploadjoy-hook") ?? undefined;
    const webhookSignature =
      req.headers.get("x-uploadjoy-wh-signature") ?? undefined;
    const slug = params.get("slug") ?? undefined;
    const actionType = params.get("actionType") ?? undefined;

    const response = await requestHandler({
      webhookSignature,
      uploadjoyHook,
      slug,
      actionType,
      req,
      crypto: new Crypto(),
    });
    if (response.status === 200) {
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: {
          "x-uploadjoy-version": UPLOADJOY_VERSION,
        },
      });
    }

    return new Response(response.message ?? "Unable to upload file.", {
      status: response.status,
      headers: {
        "x-uploadjoy-version": UPLOADJOY_VERSION,
      },
    });
  };

  const getBuildPerms = buildPermissionsInfoHandler<TRouter>(opts);

  const GET = () => {
    return new Response(JSON.stringify(getBuildPerms()), {
      status: 200,
      headers: {
        "x-uploadjoy-version": UPLOADJOY_VERSION,
      },
    });
  };

  return { GET, POST };
};
