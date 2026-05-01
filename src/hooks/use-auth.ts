"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthMeResponse, LoginPayload, SignupPayload } from "@/types/auth";

const authKeys = {
  me: ["auth", "me"] as const,
};

export function useMe() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const query = useQuery({
    queryKey: authKeys.me,
    queryFn: async () => {
      const { data } = await api.get<AuthMeResponse>("/auth/me");
      return data;
    },
    retry: false,
  });

  useEffect(() => {
    if (query.data) {
      setAuth(query.data);
    }
  }, [query.data, setAuth]);

  useEffect(() => {
    if (query.isError) {
      clearAuth();
    }
  }, [clearAuth, query.isError]);

  return query;
}

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await api.post<AuthMeResponse>("/auth/login", payload);
      return data;
    },
    onSuccess: setAuth,
  });
}

export function useSignup() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (payload: SignupPayload) => {
      const { data } = await api.post<AuthMeResponse | null>(
        "/auth/signup",
        payload,
      );
      return data;
    },
    onSuccess: (data) => {
      if (data?.user) {
        setAuth(data);
      }
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation({
    mutationFn: async () => {
      await api.post("/auth/logout");
    },
    onSuccess: () => {
      clearAuth();
      queryClient.removeQueries({ queryKey: authKeys.me });
    },
  });
}
