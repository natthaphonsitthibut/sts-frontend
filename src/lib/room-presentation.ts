export interface RoomDisplayOption {
  value: string;
  label: string;
}

/**
 * Room identifiers stay raw in APIs and persistence (for matching/sorting),
 * while every user-facing surface uses one consistent Thai label.
 */
export function formatRoomLabel(room: string | number | null | undefined): string {
  const raw = room === null || room === undefined ? "" : String(room).trim();
  if (!raw || raw === "0") {
    return "-";
  }

  const roomCode = raw.replace(/^ห้อง\s*/u, "").trim();
  return roomCode ? `ห้อง ${roomCode}` : "ห้อง";
}

export function toRoomOption(room: string | number): RoomDisplayOption {
  const value = String(room).trim();
  return { value, label: formatRoomLabel(value) };
}
