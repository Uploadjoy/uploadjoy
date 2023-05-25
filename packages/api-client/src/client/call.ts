import { HTTPError, OperationOptions } from "./types.js";
import { OperationError } from "../error.js";

const createAuthorizationHeader = (token: string) => {
  return `Bearer ${token}`;
};

export const callApi = async <TInput, TOutput>({
  method,
  token,
  url,
  options,
  input,
}: {
  method: "GET" | "POST" | "PUT";
  token: string;
  url: string;
  options: OperationOptions;
  input: TInput;
}): Promise<{ data?: TOutput; httpError?: HTTPError }> => {
  const authHeader = createAuthorizationHeader(token);
  const response = await fetch(url, {
    method,
    headers: {
      "Content-type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(input),
  });

  if (response.status !== 200) {
    const error = new OperationError(response.status, await response.json());
    if (options.throwOnError) throw error;
    return { httpError: error.toJSON() };
  }
  const body = await response.json();
  return { data: body as unknown as TOutput };
};
