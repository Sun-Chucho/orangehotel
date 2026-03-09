import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const FIREBASE_PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "the-orange-hotel-database";
const FIREBASE_DATABASE_INSTANCE =
  process.env.FIREBASE_DATABASE_INSTANCE ?? "the-orange-hotel-database-default-rtdb";
const FIREBASE_STORAGE_ROOT = "orangeHotel/storage";

function toStoragePath(key: string) {
  return `${FIREBASE_STORAGE_ROOT}/${key.replace(/[.#$[\]/]/g, "-")}`;
}

async function runFirebaseDatabaseCommand(args: string[]) {
  const { stdout } = await execFileAsync("firebase", args, {
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });

  return stdout.trim();
}

export async function readServerSyncedStorageValue<T>(key: string) {
  const output = await runFirebaseDatabaseCommand([
    "database:get",
    `/${toStoragePath(key)}`,
    "--project",
    FIREBASE_PROJECT,
    "--instance",
    FIREBASE_DATABASE_INSTANCE,
  ]);

  if (!output || output === "null") {
    return null;
  }

  return JSON.parse(output) as T;
}

export async function writeServerSyncedStorageValue<T>(key: string, value: T) {
  await runFirebaseDatabaseCommand([
    "database:set",
    `/${toStoragePath(key)}`,
    "--data",
    JSON.stringify(value),
    "--force",
    "--project",
    FIREBASE_PROJECT,
    "--instance",
    FIREBASE_DATABASE_INSTANCE,
  ]);
}

export async function appendServerSyncedStorageItem<T>(key: string, item: T) {
  const current = await readServerSyncedStorageValue<T[]>(key);
  const next = Array.isArray(current) ? [item, ...current] : [item];
  await writeServerSyncedStorageValue(key, next);
}
