"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export interface StoredUser {
  name: string;
  email: string;
  role: string;
}

const DEFAULT_USER: StoredUser = {
  name: "Alex Carter",
  email: "alex.carter@workconnect.internal",
  role: "intern",
};

function subscribeUser(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getUserSnapshot(): string {
  if (typeof window === "undefined") return JSON.stringify(DEFAULT_USER);
  return localStorage.getItem("work_connect_user") || JSON.stringify(DEFAULT_USER);
}

function getServerSnapshot(): string {
  return JSON.stringify(DEFAULT_USER);
}

export function useStoredUser(): StoredUser {
  const raw = useSyncExternalStore(subscribeUser, getUserSnapshot, getServerSnapshot);
  try {
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name || parsed.user_metadata?.full_name || DEFAULT_USER.name,
      email: parsed.email || DEFAULT_USER.email,
      role: parsed.role || DEFAULT_USER.role,
    };
  } catch {
    return DEFAULT_USER;
  }
}
