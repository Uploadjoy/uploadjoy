# Uploadjoy

[Client and API documentation](https://docs.uploadjoy.com)

[Uploadjoy](https://uploadjoy.com) is a storage service that hides the complexities of using
S3 + Cloudfront while providing good defaults (server-side encryption at rest, cross-region replication, etc.) and
a simple, type-safe API client for actions such as generating [presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html).

This is a public repository for [Uploadjoy](https://uploadjoy.com)'s TypeScript API client.

Source for the server-side client is located in `packages/client`.

An example Next.js app bootstrapped with [create-t3-app](https://create.t3.gg/) in located in `examples` for reference.

## Client

### Installation

```bash
npm install --save @uploadjoy/client
```

### Usage

#### Initializing the client

```ts
import { Uploadjoy } from "@uploadjoy/client";

export const ujClient = new Uploadjoy({
  apiToken: "abcdefg",
});
```

#### Making API calls with the client

**Example 1:** Get an S3 presigned url to download a specific object.

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
