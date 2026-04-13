import { readServerSyncedStorageValue, writeServerSyncedStorageValue } from "@/app/lib/firebase-server";
import { STORAGE_WEBSITE_BOOKINGS, type WebsiteBookingRecord } from "@/app/lib/website-bookings";

export async function appendWebsiteBookingServer(booking: WebsiteBookingRecord) {
  const current = (await readServerSyncedStorageValue<WebsiteBookingRecord[]>(STORAGE_WEBSITE_BOOKINGS)) ?? [];
  if (current.some((entry) => entry.bookingReference === booking.bookingReference)) {
    return;
  }

  await writeServerSyncedStorageValue(STORAGE_WEBSITE_BOOKINGS, [booking, ...current]);
}
