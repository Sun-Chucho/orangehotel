import { NextRequest, NextResponse } from "next/server";
import {
  readServerSyncedStorageValue,
  writeServerSyncedStorageValue,
} from "@/app/lib/firebase-server";

type RouteContext = {
  params: Promise<{
    key: string;
  }>;
};

function decodeStorageKey(rawKey: string) {
  return decodeURIComponent(rawKey);
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { key } = await context.params;
    const value = await readServerSyncedStorageValue(decodeStorageKey(key));
    return NextResponse.json({ value });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read synced storage value." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { key } = await context.params;
    const body = (await request.json()) as { value?: unknown };
    await writeServerSyncedStorageValue(decodeStorageKey(key), body.value ?? null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to write synced storage value." },
      { status: 500 },
    );
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { key } = await context.params;
    await writeServerSyncedStorageValue(decodeStorageKey(key), null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete synced storage value." },
      { status: 500 },
    );
  }
}
