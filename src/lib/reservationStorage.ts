const keyFor = (storeId: string) => `mct_my_reservation_slots_${storeId}`;

export function getMyReservedSlotIds(storeId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(storeId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addMyReservedSlotId(storeId: string, slotId: string) {
  if (typeof window === "undefined") return;
  const existing = getMyReservedSlotIds(storeId);
  if (existing.includes(slotId)) return;
  window.localStorage.setItem(keyFor(storeId), JSON.stringify([...existing, slotId]));
}
