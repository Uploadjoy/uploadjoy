export { createNextPageApiHandler } from "./src/next/core/page";
export type { FileRouter } from "./src/internal/types";

import { createBuilder } from "./src/upload-builder";
export const createUploadjoy = () => createBuilder<"pages">();
