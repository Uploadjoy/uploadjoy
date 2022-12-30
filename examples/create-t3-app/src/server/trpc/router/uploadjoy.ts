import { z } from "zod";

import { router, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const uploadjoyRouter = router({
  downloadPrivateObject: publicProcedure
    .input(z.object({ keys: z.array(z.string()) }))
    .mutation(async ({ input, ctx }) => {
      const uj = ctx.uploadJoy;
      const { keys } = input;

      // get presigned URLs for accessing objects located at the specified keys
      const response = await uj.presignedUrl.downloadPrivateObjects({
        keys,
      });

      if (response.httpError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      return response.data;
    }),
  uploadObjects: publicProcedure
    .input(
      z.object({
        objects: z.array(
          z.object({
            key: z.string(),
            visibility: z.enum(["private", "public"]),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { objects } = input;
      const uj = ctx.uploadJoy;

      // get presigned URLs for uploading objects at the specified keys and given visibility
      const response = await uj.presignedUrl.uploadObjects({
        objects,
      });

      if (response.httpError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      return response.data;
    }),
  multipartUploadObject: publicProcedure
    .input(
      z.object({
        key: z.string(),
        filePartNames: z.array(z.string()),
        visibility: z.enum(["private", "public"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const uj = ctx.uploadJoy;

      // initiates a multipart upload and returns presigned URLs for uploading each of the provided file part names
      const response = await uj.presignedUrl.multipartUploadObject({
        ...input,
      });

      if (response.httpError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      return response.data;
    }),
  completeMultiPartUpload: publicProcedure
    .input(
      z.object({
        uploadId: z.string(),
        key: z.string(),
        completedParts: z.array(
          z.object({
            partNumber: z.number(),
            eTag: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const uj = ctx.uploadJoy;
      const response = await uj.multipartUpload.complete({
        ...input,
      });

      if (response.httpError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      return response.data;
    }),
  abortMultiPartUpload: publicProcedure
    .input(
      z.object({
        uploadId: z.string(),
        key: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const uj = ctx.uploadJoy;
      const response = await uj.multipartUpload.abort({
        ...input,
      });

      if (response.httpError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      return response.data;
    }),
});
