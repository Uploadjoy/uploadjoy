/**
 * Schemas and utils that define API outputs and inputs to ensure type safety.
 */

import { z } from "zod";

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type Literal = z.infer<typeof literalSchema>;
type Json = Literal | { [key: string]: Json } | Json[];
const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]),
);

/**
 * Key of object of S3 without the project name
 * i.e if {project}/a/b/c/file.jpg -> a/b/c/file.jpg
 */
export const objectKeyRegex =
  /^(([a-zA-Z0-9_-])+(\/([a-zA-Z0-9_-]+))*\/)?[a-zA-Z0-9_.-]*$/;

/*
  Discriminate between standard and multipart uploads in order process each type downstream.
  The User is expected to provide the size of the file(s) to be uploaded.
  For multipart uploads, the User is expected to provide the number of parts + the uploadId from createMultipartUpload.
*/
export const fileSchema = z.discriminatedUnion("uploadType", [
  z.object({
    uploadType: z.literal("standard"),
    key: z
      .string()
      .regex(
        objectKeyRegex,
        "Invalid object key. Key must contain alphanumeric characters, underscores, dashes, or periods.",
      ),
    size: z.number().positive(),
    type: z.string(),
  }),
  z.object({
    uploadType: z.literal("multipart"),
    key: z
      .string()
      .regex(
        objectKeyRegex,
        "Invalid object key. Key must contain alphanumeric characters, underscores, dashes, or periods.",
      ),
    s3MultipartUploadId: z.string(),
    partCount: z.number().positive(),
    size: z.number().positive(),
    type: z.string(),
  }),
]);

export const configFileTypes = z.enum([
  "application",
  "audio",
  "font",
  "image",
  "message",
  "model",
  "multipart",
  "text",
  "video",
  "blob",
]);

export const prepareUploadBodySchema = z.object({
  fileAccess: z.enum(["public", "private"]),
  files: z.array(fileSchema).max(20, "Max 20 files per request"),
  uploadOptions: z.optional(
    z.object({
      expiresIn: z.number().positive("Must be a positive number"),
    }),
  ),
  // metadata is shared across all files in this request
  metadata: z.optional(jsonSchema),
  callbackUrl: z.optional(z.string().url("Must be a valid URL")),
  callbackSlug: z.optional(z.string()),
  config: z.record(
    configFileTypes,
    z.object({
      maxFileSize: z.string().optional(),
      maxFileCount: z.number().positive().optional(),
      acceptedFiles: z.array(z.string()).optional(),
    }),
  ),
});

export const prepareUploadResponseSchema = z.object({
  urls: z.array(
    z.discriminatedUnion("uploadType", [
      z.object({
        uploadType: z.literal("standard"),
        url: z.string(),
        fields: z.optional(z.record(z.string())),
        key: z.string().regex(objectKeyRegex),
        uploadjoyUploadRequestId: z.string(),
        access: z.enum(["public", "private"]),
      }),
      z.object({
        uploadType: z.literal("multipart"),
        key: z.string().regex(objectKeyRegex),
        s3MultipartUploadId: z.string(),
        uploadjoyUploadRequestId: z.string(),
        access: z.enum(["public", "private"]),
        urls: z.array(
          z.object({
            url: z.optional(z.string()),
            fields: z.optional(z.record(z.string())),
            partNumber: z.number(),
          }),
        ),
      }),
    ]),
  ),
});

export type PrepareUploadBody = z.infer<typeof prepareUploadBodySchema>;
export type PrepareUploadResponse = z.infer<typeof prepareUploadResponseSchema>;
export type ConfigFileTypes = z.infer<typeof configFileTypes>;
