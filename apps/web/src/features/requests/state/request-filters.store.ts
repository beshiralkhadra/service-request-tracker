import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { RequestStatus } from "@service-request-tracker/contracts";

export type RequestStatusFilter = RequestStatus | "ALL";

interface RequestFiltersState {
  page: number;
  pageSize: number;
  status: RequestStatusFilter;
  reset: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setStatus: (status: RequestStatusFilter) => void;
}

const initialFilters = {
  page: 1,
  pageSize: 20,
  status: "ALL" as const,
};

export const useRequestFiltersStore = create<RequestFiltersState>()((set) => ({
  ...initialFilters,
  reset: () => set(initialFilters),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ page: 1, pageSize }),
  setStatus: (status) => set({ page: 1, status }),
}));

export const useRequestFilters = () =>
  useRequestFiltersStore(
    useShallow((state) => ({
      page: state.page,
      pageSize: state.pageSize,
      reset: state.reset,
      setPage: state.setPage,
      setPageSize: state.setPageSize,
      setStatus: state.setStatus,
      status: state.status,
    })),
  );

export const resetRequestFilters = () => {
  useRequestFiltersStore.setState(initialFilters);
};
