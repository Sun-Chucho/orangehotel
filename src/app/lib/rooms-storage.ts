import { ROOMS, Room } from "@/app/lib/mock-data";
import { readJson, writeJson } from "@/app/lib/storage";

export const STORAGE_ROOMS = "orange-hotel-rooms-state";

export function getDefaultRooms(): Room[] {
  return ROOMS.map((room) => ({ ...room }));
}

export function readRoomsState(): Room[] {
  const saved = readJson<Room[]>(STORAGE_ROOMS);
  if (!Array.isArray(saved) || saved.length === 0) {
    return getDefaultRooms();
  }
  return saved;
}

export function writeRoomsState(rooms: Room[]) {
  writeJson(STORAGE_ROOMS, rooms);
}

export function updateRoomStatusByNumber(roomNumber: string, status: Room["status"]): Room[] {
  const nextRooms = readRoomsState().map((room) =>
    room.number === roomNumber ? { ...room, status } : room,
  );
  writeRoomsState(nextRooms);
  return nextRooms;
}

export function updateRoomStatusById(roomId: string, status: Room["status"]): Room[] {
  const nextRooms = readRoomsState().map((room) =>
    room.id === roomId ? { ...room, status } : room,
  );
  writeRoomsState(nextRooms);
  return nextRooms;
}
