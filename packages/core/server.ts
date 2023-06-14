import { createBuilder } from "./src/upload-builder";
export * from "./src/internal/types";

export const createUploadjoy = () => createBuilder<"web">();
