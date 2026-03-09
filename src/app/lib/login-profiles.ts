"use client";

import { Role } from "@/app/lib/mock-data";

export const STORAGE_LOGIN_PROFILES = "orange-hotel-login-profiles";

export interface LoginProfileEntry {
  username: string;
  shift?: "day" | "night";
  updatedAt: number;
}

export type LoginProfiles = Partial<Record<Role, LoginProfileEntry>>;
