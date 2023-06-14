import type { FileRouter } from "@uploadjoy/core/server";
// Don't destructure the import of `use` as it might not exist
import { useState } from "react";
import { useEvent } from "./useEvent";
import {
  fetchPresignedUrls as _fetchPresignedUrls,
  uploadFiles as _uploadFiles,
  EndpointMetadata,
} from "@uploadjoy/core/client";
import { getMimeTypesFromConfig } from "./utils";
import useFetch from "./useFetch";

const useEndpointMetadata = (endpoint: string) => {
  const { data } = useFetch<EndpointMetadata>("/api/uploadjoy");

  // TODO: Log on errors in dev

  return data?.find((x) => x.slug === endpoint);
};

export const useUploadjoy = <T extends string>({
  endpoint,
}: {
  endpoint: T;
}) => {
  const [isUploading, setUploading] = useState(false);
  const [isFetchingPresignedUrls, setFetchingPresignedUrls] = useState(false);

  const permittedFileInfo = useEndpointMetadata(endpoint);

  const fetchPresignedUrls = useEvent(
    async (input: { files: Parameters<typeof _fetchPresignedUrls<T>>[0] }) => {
      setFetchingPresignedUrls(true);
      const result = await _fetchPresignedUrls(input.files, endpoint);
      setFetchingPresignedUrls(false);
      return result;
    },
  );

  const startUpload = useEvent(
    async (input: Parameters<typeof _uploadFiles>[0]) => {
      setUploading(true);
      const result = await _uploadFiles(input);
      setUploading(false);
      return result;
    },
  );

  return {
    isUploading,
    isFetchingPresignedUrls,
    fetchPresignedUrls,
    startUpload,
    permittedFileInfo,
    getMimeTypesFromConfig,
  } as const;
};

export const generateReactHelpers = <TRouter extends FileRouter>() => {
  type TRouterKey = keyof TRouter extends string ? keyof TRouter : string;

  return {
    useUploadjoy: useUploadjoy<TRouterKey>,
  } as const;
};
