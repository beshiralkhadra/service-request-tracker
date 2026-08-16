import type { RequestStatus } from "@service-request-tracker/contracts";

import { ApplicationError } from "../../../shared/errors/application-error.js";

interface RequestState {
  readonly status: RequestStatus;
  transitionTo(target: RequestStatus): void;
}

abstract class ForwardOnlyRequestState implements RequestState {
  abstract readonly status: RequestStatus;
  protected abstract readonly nextStatus: RequestStatus | null;

  transitionTo(target: RequestStatus): void {
    if (target !== this.nextStatus) {
      const expected = this.nextStatus ?? "no further status";
      throw new ApplicationError(
        "INVALID_STATUS_TRANSITION",
        `A ${this.status} request may only move to ${expected}.`,
      );
    }
  }
}

class NewRequestState extends ForwardOnlyRequestState {
  readonly status = "NEW";
  protected readonly nextStatus = "ASSIGNED";
}

class AssignedRequestState extends ForwardOnlyRequestState {
  readonly status = "ASSIGNED";
  protected readonly nextStatus = "IN_PROGRESS";
}

class InProgressRequestState extends ForwardOnlyRequestState {
  readonly status = "IN_PROGRESS";
  protected readonly nextStatus = "RESOLVED";
}

class ResolvedRequestState extends ForwardOnlyRequestState {
  readonly status = "RESOLVED";
  protected readonly nextStatus = "CLOSED";
}

class ClosedRequestState extends ForwardOnlyRequestState {
  readonly status = "CLOSED";
  protected readonly nextStatus = null;
}

const states: Record<RequestStatus, RequestState> = {
  NEW: new NewRequestState(),
  ASSIGNED: new AssignedRequestState(),
  IN_PROGRESS: new InProgressRequestState(),
  RESOLVED: new ResolvedRequestState(),
  CLOSED: new ClosedRequestState(),
};

export class RequestLifecycle {
  assertTransition(from: RequestStatus, to: RequestStatus): void {
    states[from].transitionTo(to);
  }
}
