import { afterEach, describe, expect, it } from "vitest";

import {
  resetRequestFilters,
  useRequestFiltersStore,
} from "./request-filters.store";

afterEach(() => {
  resetRequestFilters();
});

describe("request filter store", () => {
  it("resets pagination when status or page size changes", () => {
    useRequestFiltersStore.getState().setPage(4);
    useRequestFiltersStore.getState().setStatus("IN_PROGRESS");
    expect(useRequestFiltersStore.getState()).toMatchObject({
      page: 1,
      pageSize: 20,
      status: "IN_PROGRESS",
    });

    useRequestFiltersStore.getState().setPage(3);
    useRequestFiltersStore.getState().setPageSize(50);
    expect(useRequestFiltersStore.getState()).toMatchObject({
      page: 1,
      pageSize: 50,
      status: "IN_PROGRESS",
    });
  });

  it("restores the default all-status filter", () => {
    useRequestFiltersStore.getState().setStatus("CLOSED");
    useRequestFiltersStore.getState().reset();
    expect(useRequestFiltersStore.getState()).toMatchObject({
      page: 1,
      pageSize: 20,
      status: "ALL",
    });
  });
});
