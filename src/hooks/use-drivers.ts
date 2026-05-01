import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AdminDriver, VerifyDriverPayload } from "@/types/drivers";

const driversKey = ["drivers"] as const;

export function useDrivers() {
  return useQuery({
    queryKey: driversKey,
    queryFn: async () => {
      const { data } = await api.get<AdminDriver[]>("/drivers");
      return data;
    },
  });
}

export function useVerifyDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      driverId,
      payload,
    }: {
      driverId: string;
      payload: VerifyDriverPayload;
    }) => {
      const { data } = await api.patch<AdminDriver>(
        `/drivers/${driverId}/verify`,
        payload,
      );
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: driversKey });
    },
  });
}
