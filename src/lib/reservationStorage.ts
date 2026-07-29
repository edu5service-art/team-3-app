export type MyReservation = { slotId: string; reservationId: string };

const keyFor = (storeId: string) => `mct_my_reservations_${storeId}`;

export function getMyReservations(storeId: string): MyReservation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(storeId));
    return raw ? (JSON.parse(raw) as MyReservation[]) : [];
  } catch {
    return [];
  }
}

export function addMyReservation(storeId: string, slotId: string, reservationId: string) {
  if (typeof window === "undefined") return;
  const existing = getMyReservations(storeId);
  if (existing.some((r) => r.slotId === slotId)) return;
  window.localStorage.setItem(
    keyFor(storeId),
    JSON.stringify([...existing, { slotId, reservationId }])
  );
}

export function removeMyReservation(storeId: string, slotId: string) {
  if (typeof window === "undefined") return;
  const existing = getMyReservations(storeId);
  window.localStorage.setItem(
    keyFor(storeId),
    JSON.stringify(existing.filter((r) => r.slotId !== slotId))
  );
}
