/* eslint-disable @typescript-eslint/no-empty-function */

import type { NextApiRequest, NextApiResponse } from "next";
import { createBuilder } from "./upload-builder";
import { expect, it, expectTypeOf } from "vitest";
import { NextRequest } from "next/server";
import { NestedFileRouterConfig } from "./internal/types";

const badReqMock = {
  headers: {
    get(key: string) {
      if (key === "header1") return "woohoo";
      return null;
    },
  },
} as unknown as Request;

const defaultConfig: NestedFileRouterConfig = {
  image: {
    maxFileSize: "4MB",
    maxFileCount: 1,
    acceptedFiles: ["image/png", "image/jpeg"],
  },
};

it("type errors for invalid input", () => {
  const f = createBuilder();

  // @ts-expect-error - invalid file type
  f(["png"]);

  // @ts-expect-error - invalid size format
  f({ image: { maxFileSize: "1gb" } });

  // @ts-expect-error - needs at least one of the keys
  f({});

  // @ts-expect-error - invalid file type
  f({ notValid: { acceptedFiles: ["image/png", "image/jpeg", "image/gif"] } });

  // @ts-expect-error - invalid accepted file type
  f({ image: { acceptedFiles: ["video/xyz"] } });

  // @ts-expect-error - should return an object
  f(defaultConfig).middleware(() => {
    return null;
  });

  // @ts-expect-error - res does not exist (`pages` flag not set)
  f(defaultConfig).middleware((req, ctx, res) => {
    return {};
  });

  f(defaultConfig)
    .middleware(() => ({ metadata: { foo: "bar" } }))
    .onUploadComplete(({ metadata }) => {
      // @ts-expect-error - bar does not exist
      metadata.bar;
      // @ts-expect-error - bar does not exist on foo
      metadata.foo.bar;
    });
});

it("passes `Request` by default", async () => {
  const f = createBuilder();

  f(defaultConfig).middleware(async (req) => {
    expectTypeOf(req).toMatchTypeOf<Request>();

    return {};
  });
});

it("passes `NextRequest` for /app", async () => {
  const f = createBuilder<"app">();

  f(defaultConfig).middleware(async (req) => {
    expectTypeOf(req).toMatchTypeOf<NextRequest>();
    return { metadata: { nextUrl: req.nextUrl } };
  });
});

it("passes `res` for /pages", async () => {
  const f = createBuilder<"pages">();

  f(defaultConfig).middleware(async (req, ctx, res) => {
    expectTypeOf(req).toMatchTypeOf<NextApiRequest>();
    expectTypeOf(res).toMatchTypeOf<NextApiResponse>();

    return {};
  });
});

it("smoke", async () => {
  const f = createBuilder();

  const uploadable = f(defaultConfig)
    .middleware(async (req) => {
      const header1 = req.headers.get("header1");

      return { metadata: { header1, userId: "123" as const } };
    })
    .onUploadComplete(({ file, metadata }) => {
      // expect(file).toEqual({ name: "file", url: "http://localhost" })
      expectTypeOf(file).toMatchTypeOf<{ name: string; url: string }>();

      expect(metadata).toEqual({ header1: "woohoo", userId: "123" });
      expectTypeOf(metadata).toMatchTypeOf<{
        header1: string | null;
        userId: "123";
      }>();
    });

  expect(uploadable._def.routerConfig).toEqual(defaultConfig);

  const mdwResult = await uploadable._def.middleware(badReqMock, { files: [] });
  expect(mdwResult).toEqual({ metadata: { header1: "woohoo", userId: "123" } });
});
