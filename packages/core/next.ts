export { createNextRouteHandler } from "./src/next/core/approuter";
export type { FileRouter } from "./src/internal/types";

import { createBuilder } from "./src/upload-builder";
export const createUploadjoy = () => createBuilder<"app">();
