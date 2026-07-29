export function ensureNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function notifyWaitingSoon(aheadCount: number) {
  if (typeof window === "undefined") return;

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("곧 입장하실 차례예요", {
      body: `앞으로 ${aheadCount}팀 남았습니다. 매장 근처에서 준비해 주세요.`,
    });
  }
}
