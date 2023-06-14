# Uploadjoy

[Uploadjoy](https://uploadjoy.com) is a storage service that abstracts away the complexity of using and maintaining
S3 + Cloudfront while providing good defaults, easy to understand API and DX.

## What's in this repository?

### Packages

1. `@uploadjoy/core` (located in `packages/core`) - Core server and client logic.
2. `@uploadjoy/react` (located in `packages/react`) - React hooks and components for building upload UIs.
3. `@uploadjoy/api-client` (location in `packages/api-client`) - TypeScript API client for calling Uploadjoy APIs.
4. `@uploadjoy/mime-types` (located in `packages/mime-types`) - MIME types database ripped from [this package](https://github.com/jshttp/mime-types).
5. `@uploadjoy/shared` (located in `packages/shared`) - Shared types and utilities between packages in this repo and the [Uploadjoy webapp](https://uploadjoy.com).

### Docs Site

[Documentation](https://docs.uploadjoy.com)

Source code for the documentation site is located in `docs` directory.

### Examples

Examples are located in `examples` directory.

1. [Next.js App Router](https://github.com/Uploadjoy/uploadjoy/tree/main/examples/appdir)
2. [Next.js Pages Router](https://github.com/Uploadjoy/uploadjoy/tree/main/examples/pagedir)
3. [Solid Start](https://github.com/Uploadjoy/uploadjoy/tree/main/examples/solidstart)