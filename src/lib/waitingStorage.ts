const keyFor = (storeId: string) => `mct_waiting_id_${storeId}`;

export function getMyWaitingId(storeId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(keyFor(storeId));
}

export function setMyWaitingId(storeId: string, waitingId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyFor(storeId), waitingId);
}

export function clearMyWaitingId(storeId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(keyFor(storeId));
}
