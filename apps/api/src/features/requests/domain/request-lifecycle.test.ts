import { describe, expect, it } from "vitest";

import type { RequestStatus } from "@service-request-tracker/contracts";

import { ApplicationError } from "../../../shared/errors/application-error.js";
import { RequestLifecycle } from "./request-lifecycle.js";

const validTransitions: Array<[RequestStatus, RequestStatus]> = [
  ["NEW", "ASSIGNED"],
  ["ASSIGNED", "IN_PROGRESS"],
  ["IN_PROGRESS", "RESOLVED"],
  ["RESOLVED", "CLOSED"],
];

describe("RequestLifecycle State pattern", () => {
  const lifecycle = new RequestLifecycle();

  it.each(validTransitions)("allows %s to move to %s", (from, to) => {
    expect(() => lifecycle.assertTransition(from, to)).not.toThrow();
  });

  it.each([
    ["NEW", "IN_PROGRESS"],
    ["ASSIGNED", "RESOLVED"],
    ["IN_PROGRESS", "ASSIGNED"],
    ["RESOLVED", "IN_PROGRESS"],
    ["CLOSED", "IN_PROGRESS"],
  ] as Array<[RequestStatus, RequestStatus]>)(
    "rejects %s to %s",
    (from, to) => {
      expect(() => lifecycle.assertTransition(from, to)).toThrowError(
        ApplicationError,
      );

      try {
        lifecycle.assertTransition(from, to);
      } catch (error) {
        expect(error).toMatchObject({ code: "INVALID_STATUS_TRANSITION" });
      }
    },
  );
});
