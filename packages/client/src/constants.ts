export const API_BASE = "https://uploadjoy.com/api/v1";

export const ENDPOINTS = {
  presignedUrl: {
    getPrivateObjects: "/presigned-url/get-private-objects",
    putObjects: "/presigned-url/put-objects",
  },
} as const;
