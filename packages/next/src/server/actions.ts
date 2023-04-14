import type { NextApiRequest, NextApiResponse } from "next";
import type { Options } from "./types";
import {
  getPresignedUrlOpts,
  fetchPresignedUrlsFromExternalApi,
  FetchPresignedUrlsError,
  onUploadEventServerCallbackParamSchema,
} from "@uploadjoy/uploader-common";

export const getPresignedUrlsForUpload = async ({
  req,
  res,
  options,
}: {
  req: NextApiRequest;
  res: NextApiResponse;
  options: Options;
}) => {
  const {
    apiKey,
    canUpload,
    customApiUrl = "https://www.uploadjoy.com/api/v2",
  } = options;

  const inputValidation = getPresignedUrlOpts.safeParse(req.body);

  if (!inputValidation.success) {
    return res.status(400).json({
      message: "Invalid input",
      errors: inputValidation.error.issues,
    });
  }
  const { fileAccess, files, folder } = inputValidation.data;

  if (canUpload) {
    const canUploadResult = await canUpload(
      { fileAccess, files, folder },
      req,
      res,
    );
    if (!canUploadResult.canUpload) {
      return res.status(403).json({
        message:
          canUploadResult.message ?? "You are not allowed to upload files",
      });
    }
  }

  const filesWithKey = files.map((file) => ({
    size: file.size,
    type: file.type,
    // folder and file name are validated above
    key: `${folder ?? ""}${file.name}`,
  }));

  try {
    const presignedUrls = await fetchPresignedUrlsFromExternalApi({
      token: apiKey,
      input: {
        files: filesWithKey,
        fileAccess,
      },
      customApiUrl: customApiUrl,
    });

    return res.status(200).json(presignedUrls);
  } catch (error) {
    const asFetchError = error as FetchPresignedUrlsError;
    return res.status(500).json({
      message: "Error fetching presigned URLs",
      errorFromUploadjoy: asFetchError.responseBody(),
    });
  }
};

export const onUploadSuccess = async ({
  req,
  res,
  options,
}: {
  req: NextApiRequest;
  res: NextApiResponse;
  options: Options;
}) => {
  const { callbacks } = options;

  if (callbacks?.onUploadSuccess) {
    const inputValidation = onUploadEventServerCallbackParamSchema.safeParse(
      req.body,
    );

    if (!inputValidation.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: inputValidation.error.issues,
      });
    }

    try {
      await callbacks.onUploadSuccess(inputValidation.data);
      return res.status(200);
    } catch (error) {
      return res.status(500).json({
        message: "Error executing onUploadSuccess callback",
      });
    }
  }

  return res.status(200);
};

export const onUploadError = async ({
  req,
  res,
  options,
}: {
  req: NextApiRequest;
  res: NextApiResponse;
  options: Options;
}) => {
  const { callbacks } = options;

  if (callbacks?.onUploadError) {
    const inputValidation = onUploadEventServerCallbackParamSchema.safeParse(
      req.body,
    );

    if (!inputValidation.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: inputValidation.error.issues,
      });
    }

    try {
      await callbacks.onUploadError(inputValidation.data);
      return res.status(200);
    } catch (error) {
      return res.status(500).json({
        message: "Error executing onUploadError callback",
      });
    }
  }

  return res.status(200);
};
