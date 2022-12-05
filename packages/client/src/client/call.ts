import { OperationOptions } from "./types.js";
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
}): Promise<OperationError | TOutput> => {
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
    return error;
  }
  const body = await response.json();
  return body as unknown as TOutput;
};
