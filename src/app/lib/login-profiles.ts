"use client";

import { Role } from "@/app/lib/mock-data";

export const STORAGE_LOGIN_PROFILES = "orange-hotel-login-profiles";

export interface LoginProfileEntry {
  username: string;
  shift?: "day" | "night";
  updatedAt: number;
}

export type LoginProfiles = Partial<Record<Role, LoginProfileEntry>>;

function dispatchLoginProfilesUpdated() {
  window.dispatchEvent(new CustomEvent("orange-hotel-storage-updated", { detail: { key: STORAGE_LOGIN_PROFILES } }));
}

export function readLocalLoginProfiles() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_LOGIN_PROFILES);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LoginProfiles;
  } catch {
    return null;
  }
}

export function writeLocalLoginProfiles(profiles: LoginProfiles) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_LOGIN_PROFILES, JSON.stringify(profiles));
  dispatchLoginProfilesUpdated();
}

export async function hydrateLoginProfilesFromServer() {
  if (typeof window === "undefined") return null;

  try {
    const response = await fetch("/api/login-profiles", { cache: "no-store" });
    if (!response.ok) return null;
    const profiles = (await response.json()) as LoginProfiles;
    writeLocalLoginProfiles(profiles ?? {});
    return profiles ?? {};
  } catch {
    return null;
  }
}

export async function saveLoginProfileToServer(role: Role, entry: LoginProfileEntry) {
  if (typeof window === "undefined") return false;

  try {
    const response = await fetch("/api/login-profiles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role, entry }),
    });

    if (!response.ok) return false;
    const profiles = (await response.json()) as LoginProfiles;
    writeLocalLoginProfiles(profiles ?? {});
    return true;
  } catch {
    return false;
  }
}
