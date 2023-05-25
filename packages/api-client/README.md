# @uploadjoy/client

This is a package for [Uploadjoy](https://uploadjoy.com)'s TypeScript API client.

You can use this client to make API calls to Uploadjoy's API.

## Installation

```bash
npm install --save @uploadjoy/client
```

## Usage

### Initializing the client

```ts
import { Uploadjoy } from "@uploadjoy/client";

export const ujClient = new Uploadjoy({
  apiToken: "abcdefg",
});
```

### Making API calls with the client

**Example 1:** Get an S3 presigned url to download an already uploaded object.

```ts
const keys = ["my-private-file.jpg"];
const response = await ujClient.presignedUrl.downloadPrivateObjects(
  {
    keys,
    presignedUrlOptions: { expiresIn: 3600 },
  }
);

console.log(response.data);
/** Prints:
  {
    presignedUrls: {
        key: string;
        url?: string | undefined;
        error?: string | undefined;
    }[];
  };
 * /
```

**Example 2:** Abort a multipart upload.

```ts
const uploadId: 'abc123';
const key: 'a/b/c/file-to-abort.txt';
const response = await uj.multipartUpload.abort({
    uploadId,
    key,
  });

console.log(response.data);
/** Prints:
  {
    uploadId: string;
    key: string;
  }
 * /
```
