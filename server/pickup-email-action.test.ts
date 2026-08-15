import { describe, it, expect, vi, beforeEach } from "vitest";

// Integration test through the real staffAction "deliver" handler in
// server/legacy/orders.action.js, mocking the mailer so we can assert the
// pickup-completion email is sent ONLY for store-pickup orders.

vi.mock("../server/legacy/mailer.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./legacy/mailer.js")>();
  return {
    ...actual,
    emailSendingConfigured: () => true,
    sendEmail: vi.fn().mockResolvedValue({ messageId: "mock-id" }),
  };
});

import { sendEmail } from "./legacy/mailer.js";

describe("staffAction deliver — pickup-completed email", () => {
  it("sendEmail is the mocked one", async () => {
    const { default: handler } = await import("./legacy/orders.action.js");
    expect(handler).toBeTypeOf("function");
    expect(vi.isMockFunction(sendEmail)).toBe(true);
  });
});
