import {
  externalApiPutObjectApiOutputSchema,
  ExternalApiPutObjectApiOutput,
  ApiCallArgs,
} from "../validators";

export class FetchPresignedUrlsError extends Error {
  status: number;
  body: any;

  constructor(message: string, response: Response) {
    super(message);
    this.stack = new Error().stack;

    this.name = this.constructor.name;
    this.status = response.status;
    this.body = response.json();
  }

  statusCode() {
    return this.status;
  }

  async responseBody() {
    return await this.body;
  }
}

const ENDPOINTS = {
  uploadObjects: `/presigned-url/put-objects`,
} as const;

const getEndpointUrl = (baseUrl: string, endpoint: keyof typeof ENDPOINTS) => {
  return `${baseUrl}${ENDPOINTS[endpoint]}`;
};

const createAuthorizationHeader = (token: string) => {
  return `Bearer ${token}`;
};

export const fetchPresignedUrlsFromExternalApi = async ({
  token,
  input,
  customApiUrl,
}: ApiCallArgs) => {
  const authHeader = createAuthorizationHeader(token);
  const response = await fetch(getEndpointUrl(customApiUrl, "uploadObjects"), {
    method: "POST",
    headers: {
      "Content-type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new FetchPresignedUrlsError(
      "Failed to fetch presigned URLs",
      response,
    );
  }

  const data = await response.json();

  const responseParseResult =
    externalApiPutObjectApiOutputSchema.safeParse(data);
  if (!responseParseResult.success) {
    // This should never happen, but if it does, we want to know about it
    console.error("Failed to parse response from API. This is a bug.");
    console.error(responseParseResult.error.issues);
    throw new FetchPresignedUrlsError(
      "Failed to fetch presigned URLs",
      response,
    );
  }

  return data as ExternalApiPutObjectApiOutput;
};
