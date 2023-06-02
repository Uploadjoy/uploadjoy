import type { FileRouter } from "@uploadjoy/core/server";
import { useInput } from "./useInput";

export const generateReactHelpers = <TRouter extends FileRouter>() => {
  type TRouterKey = keyof TRouter extends string ? keyof TRouter : string;

  return {} as const;
};
