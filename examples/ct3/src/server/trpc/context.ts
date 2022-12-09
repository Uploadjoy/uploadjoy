import { type inferAsyncReturnType } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import type { Uploadjoy } from "@uploadjoy/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { ujClient } from "../uploadjoy/client";

/**
 * Replace this with an object if you want to pass things to createContextInner
 */
type CreateContextOptions = {
  uploadJoy: Uploadjoy;
  req: NextApiRequest;
  res: NextApiResponse;
};

/** Use this helper for:
 * - testing, so we dont have to mock Next.js' req/res
 * - trpc's `createSSGHelpers` where we don't have req/res
 * @see https://create.t3.gg/en/usage/trpc#-servertrpccontextts
 **/
export const createContextInner = async (opts: CreateContextOptions) => {
  return {
    ...opts,
  };
};

/**
 * This is the actual context you'll use in your router
 * @link https://trpc.io/docs/context
 **/
export const createContext = async (opts: CreateNextContextOptions) => {
  const uploadJoy = ujClient;
  return await createContextInner({
    ...opts,
    uploadJoy,
  });
};

export type Context = inferAsyncReturnType<typeof createContext>;
