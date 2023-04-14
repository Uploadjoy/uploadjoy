import { z } from "zod";

const folderRegex = /^([a-zA-Z0-9_-])+(\/([a-zA-Z0-9_-]+))*\/$/;
const fileNameRegex = /^[a-zA-Z0-9_.-]*$/;

export const folderNameSchema = z.string().regex(folderRegex, {
  message:
    "File path must consist of alphanumeric characters, underscores, and dashes, and must end with a slash. e.g. 'my-folder/', 'my-folder/sub-folder/'",
});

export const fileNameSchema = z.string().regex(fileNameRegex, {
  message:
    "File name must consist of alphanumeric characters, underscores, dashes, and periods. e.g. 'my-file.txt', 'my_file'",
});

export const validateFolder = (
  folder: string | undefined,
): { success: true } | { success: false; errorMessage: string } => {
  if (folder) {
    const result = folderNameSchema.safeParse(folder);
    if (!result.success) {
      return {
        success: false,
        errorMessage:
          "File name must consist of alphanumeric characters, underscores, dashes, and periods. e.g. 'my-file.txt', 'my_file'",
      };
    }
  }

  return { success: true };
};

const validateFolderAsync = async (
  folder: string | undefined,
): Promise<{ success: true } | { success: false; errors: z.ZodIssue[] }> => {
  if (folder) {
    const result = await folderNameSchema.safeParseAsync(folder);
    if (!result.success) {
      return {
        success: false,
        errors: result.error.issues,
      };
    }
  }

  return { success: true };
};

export const validateFilename = (
  filename: string,
): { success: true } | { success: false; errorMessage: string } => {
  const result = fileNameSchema.safeParse(filename);
  if (!result.success) {
    return {
      success: false,
      errorMessage:
        "File name must consist of alphanumeric characters, underscores, dashes, and periods. e.g. 'my-file.txt', 'my_file'",
    };
  }

  return { success: true };
};

const validateFilenamesAsync = async (
  files: { name: string; size: number; type: string }[],
): Promise<{ success: true } | { success: false; errors: z.ZodIssue[] }> => {
  const filenames = files.map((file) => file.name);
  const result = await fileNameSchema.array().safeParseAsync(filenames);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues,
    };
  }

  return { success: true };
};

export const validateFileNamesAndFolderAsync = async (
  files: { name: string; size: number; type: string }[],
  folder: string | undefined,
): Promise<{ success: true } | { success: false; errors: z.ZodIssue[] }> => {
  const folderValidation = validateFolderAsync(folder);
  const filenamesValidation = validateFilenamesAsync(files);

  const [folderValidationResult, filenamesValidationResult] = await Promise.all(
    [folderValidation, filenamesValidation],
  );

  if (!folderValidationResult.success && !filenamesValidationResult.success) {
    return {
      success: false,
      errors: [
        ...folderValidationResult.errors,
        ...filenamesValidationResult.errors,
      ],
    };
  }

  if (!folderValidationResult.success) {
    return folderValidationResult;
  }

  if (!filenamesValidationResult.success) {
    return filenamesValidationResult;
  }

  return { success: true };
};

export const externalApiPutObjectApiOutputSchema = z.record(
  z.string(),
  z.object({
    url: z.string(),
    location: z.string(),
  }),
);

export type ExternalApiPutObjectApiOutput = z.infer<
  typeof externalApiPutObjectApiOutputSchema
>;

export const getPresignedUrlOpts = z.object({
  folder: folderNameSchema,
  files: z.array(
    z.object({
      name: fileNameSchema,
      size: z.number(),
      type: z.string(),
    }),
  ),
  fileAccess: z.union([z.literal("public"), z.literal("private")]),
  apiUrl: z.string(),
});

export type GetPresignedUrlOpts = z.infer<typeof getPresignedUrlOpts>;

export const apiCallArgsSchema = z.object({
  customApiUrl: z.string(),
  token: z.string(),
  input: z.object({
    files: z.array(
      z.object({
        key: z.string(),
        size: z.number(),
        type: z.string(),
      }),
    ),
    fileAccess: z.union([z.literal("public"), z.literal("private")]),
  }),
});

export type ApiCallArgs = z.infer<typeof apiCallArgsSchema>;

export const onUploadEventServerCallbackParamSchema = z.object({
  fileName: z.string(),
  fileSize: z.number(),
  fileType: z.string(),
  location: z.string(),
  fileAccess: z.union([z.literal("public"), z.literal("private")]),
});

export type OnUploadEventServerCallbackParam = z.infer<
  typeof onUploadEventServerCallbackParamSchema
>;
