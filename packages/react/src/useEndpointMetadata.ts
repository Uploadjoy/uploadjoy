import useFetch from "./useFetch";
import type { AllowedFiles } from "uploadjoy/client";

type EndpointMetadata = {
  slug: string;
  maxSize: string;
  fileTypes: AllowedFiles;
  access: "public" | "private";
  maxFiles?: number;
}[];

export const useEndpointMetadata = (endpoint: string) => {
  const { data } = useFetch<EndpointMetadata>("/api/uploadthing");

  // TODO: Log on errors in dev

  return data?.find((x) => x.slug === endpoint);
};
