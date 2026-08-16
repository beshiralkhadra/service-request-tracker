import { describe, expect, it } from "vitest";

import { calculateSlaStatus, formatSlaDuration, getSlaLabel } from "./sla";

describe("SLA status", () => {
  const deadline = "2026-08-16T12:00:00.000Z";

  it("counts down an unanswered request", () => {
    const status = calculateSlaStatus(
      { respondedAt: null, slaDueAt: deadline },
      new Date("2026-08-16T10:30:00.000Z"),
    );

    expect(status).toMatchObject({
      differenceMilliseconds: 90 * 60 * 1_000,
      isRunning: true,
      state: "ACTIVE",
    });
    expect(getSlaLabel(status)).toBe("1h 30m remaining");
  });

  it("flags an unanswered request after its target", () => {
    const status = calculateSlaStatus(
      { respondedAt: null, slaDueAt: deadline },
      new Date("2026-08-16T12:45:00.000Z"),
    );

    expect(status).toMatchObject({
      differenceMilliseconds: -45 * 60 * 1_000,
      isRunning: true,
      state: "BREACHED",
    });
    expect(getSlaLabel(status)).toBe("Breached by 45m");
  });

  it("freezes the result at first response rather than current time", () => {
    const status = calculateSlaStatus(
      {
        respondedAt: "2026-08-16T11:15:00.000Z",
        slaDueAt: deadline,
      },
      new Date("2026-08-17T12:00:00.000Z"),
    );

    expect(status).toMatchObject({
      differenceMilliseconds: 45 * 60 * 1_000,
      isRunning: false,
      state: "MET",
    });
    expect(getSlaLabel(status)).toBe("Responded with 45m remaining");
  });

  it("formats long durations without noisy minute precision", () => {
    expect(formatSlaDuration(49 * 60 * 60 * 1_000)).toBe("2d 1h");
  });
});
