import AxiosMockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it } from "vitest";

import { apiClient } from "@/lib/http/api-client";

import { requestsApi } from "./requests.api";

const mock = new AxiosMockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

describe("request API", () => {
  it("sends list filters as query parameters and validates the response", async () => {
    mock.onGet("/service-requests").reply((config) => [
      200,
      {
        data: [],
        meta: {
          page: config.params.page,
          pageSize: config.params.pageSize,
          totalItems: 0,
          totalPages: 0,
        },
      },
    ]);

    const response = await requestsApi.getList({
      page: 2,
      pageSize: 50,
      status: "IN_PROGRESS",
    });

    expect(response.meta).toEqual({
      page: 2,
      pageSize: 50,
      totalItems: 0,
      totalPages: 0,
    });
    expect(mock.history.get[0]?.params).toEqual({
      page: 2,
      pageSize: 50,
      status: "IN_PROGRESS",
    });
  });

  it("rejects a malformed response at the feature boundary", async () => {
    mock.onGet("/agents").reply(200, [
      {
        id: "customer-id",
        email: "customer@example.com",
        displayName: "Customer",
        role: "CUSTOMER",
      },
    ]);

    await expect(requestsApi.getAgents()).rejects.toMatchObject({
      name: "ZodError",
    });
  });
});
