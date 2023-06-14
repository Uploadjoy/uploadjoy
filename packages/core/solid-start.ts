import { createNextRouteHandler } from "./src/next/core/approuter";
export type { FileRouter } from "./src/internal/types";

import { createBuilder } from "./src/upload-builder";
export const createUploadjoy = () => createBuilder<"app">();

export function createServerHandler(
  ...args: Parameters<typeof createNextRouteHandler>
) {
  const handler = createNextRouteHandler(...args);
  const thisHandler =
    (method: keyof typeof handler) => (event: { request: Request } | Request) =>
      handler[method](event instanceof Request ? event : event.request);
  return {
    GET: thisHandler("GET"),
    POST: thisHandler("POST"),
  };
}
