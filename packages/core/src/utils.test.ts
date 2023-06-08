// @vitest-environment jsdom

import { expect, it } from "vitest";
import { signatureIsValid, createSignature } from "./utils";
import { createHmac } from "crypto";

import { Crypto } from "@peculiar/webcrypto";
const crypto = new Crypto();

it("match", async () => {
  const signature = await createSignature("message", "secret", crypto);
  const isValid = await signatureIsValid(
    "message",
    signature,
    "secret",
    crypto,
  );

  expect(isValid).toBe(true);
});

it("no match", async () => {
  const signature = await createSignature("message", "secret???", crypto);
  const isValid = await signatureIsValid(
    "message",
    signature,
    "secret",
    crypto,
  );

  expect(isValid).toBe(false);
});

// important to test if sig is valid coming from webapp/infra as it uses Node "crypto" module
it("matches Node", async () => {
  const signature = createHmac("sha256", "secret")
    .update("message")
    .digest("base64");

  const isValid = await signatureIsValid(
    "message",
    signature,
    "secret",
    crypto,
  );

  expect(isValid).toBe(true);
});
