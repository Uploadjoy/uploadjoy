"use client";

import useFetch from "./useFetch";
import type {
  ExpandedNestedFileRouterConfig,
  EndpointMetadata,
} from "@uploadjoy/core/server";

const acceptsMultipleFiles = (config: ExpandedNestedFileRouterConfig) => {
  let totalAccepts = 0;

  for (const value of Object.values(config)) {
    totalAccepts += value.maxFileCount;
    if (totalAccepts > 1) return true;
  }

  return false;
};

export const useEndpointMetadata = (endpoint: string) => {
  const { data } = useFetch<EndpointMetadata>("/api/uploadjoy");
  // TODO: Log on errors in dev

  const endpointMetadata = data?.find((x) => x.slug === endpoint);
  if (!endpointMetadata) return undefined;

  const multiple = acceptsMultipleFiles(endpointMetadata.config);

  return {
    ...endpointMetadata,
    multiple,
  };
};
