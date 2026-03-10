"use client";

import { Role } from "@/app/lib/mock-data";

export const STORAGE_LOGIN_PROFILES = "orange-hotel-login-profiles";

export interface LoginUserAccount {
  username: string;
  password?: string;
  updatedAt: number;
}

export interface LoginProfileEntry {
  username: string;
  password?: string;
  shift?: "day" | "night";
  users?: LoginUserAccount[];
  updatedAt: number;
}

export type LoginProfiles = Partial<Record<Role, LoginProfileEntry>>;

export const DEFAULT_LOGIN_PASSWORD = "1234";

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

export function getProfilePassword(entry: LoginProfileEntry | null | undefined, username: string, fallback = DEFAULT_LOGIN_PASSWORD) {
  if (!entry) return fallback;

  const matchedUser = entry.users?.find((user) => user.username.trim().toLowerCase() === username.trim().toLowerCase());
  if (matchedUser?.password?.trim()) return matchedUser.password.trim();
  if (entry.password?.trim()) return entry.password.trim();
  return fallback;
}

export function upsertProfileUser(
  entry: LoginProfileEntry | null | undefined,
  username: string,
  updates: Partial<LoginUserAccount>,
): LoginProfileEntry {
  const normalizedUsername = username.trim();
  const now = typeof updates.updatedAt === "number" && Number.isFinite(updates.updatedAt) ? updates.updatedAt : Date.now();
  const existingUsers = Array.isArray(entry?.users) ? entry.users : [];
  const nextUser: LoginUserAccount = {
    username: normalizedUsername,
    password: typeof updates.password === "string" ? updates.password.trim() : existingUsers.find((user) => user.username.toLowerCase() === normalizedUsername.toLowerCase())?.password,
    updatedAt: now,
  };

  const otherUsers = existingUsers.filter((user) => user.username.toLowerCase() !== normalizedUsername.toLowerCase());

  return {
    username: normalizedUsername,
    password: typeof updates.password === "string" ? updates.password.trim() : entry?.password,
    shift: entry?.shift,
    users: [...otherUsers, nextUser],
    updatedAt: now,
  };
}
