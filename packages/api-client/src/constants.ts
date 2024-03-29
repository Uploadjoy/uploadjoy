export const API_BASE = "https://www.uploadjoy.com/api/v1";

export const ENDPOINTS = {
  presignedUrl: {
    downloadPrivateObjects: "/presigned-url/get-private-objects",
    uploadObjects: "/presigned-url/put-objects",
    multipartUploadObject: "/presigned-url/multipart-upload-object",
  },
  multipartUpload: {
    complete: "/multipart-upload/complete",
    abort: "/multipart-upload/abort",
  },
} as const;
