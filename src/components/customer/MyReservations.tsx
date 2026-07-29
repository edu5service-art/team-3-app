"use client";

import { useEffect, useState } from "react";
import type { ReservationSlot } from "@/lib/supabase";
import { getMyReservedSlotIds } from "@/lib/reservationStorage";

function formatTime(time: string) {
  return time.slice(0, 5);
}

export default function MyReservations({
  storeId,
  slots,
}: {
  storeId: string;
  slots: ReservationSlot[];
}) {
  const [myTimes, setMyTimes] = useState<string[]>([]);

  useEffect(() => {
    const myIds = new Set(getMyReservedSlotIds(storeId));
    const times = slots
      .filter((slot) => myIds.has(slot.id))
      .map((slot) => formatTime(slot.slot_time));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage, must run after hydration
    setMyTimes(times);
  }, [storeId, slots]);

  if (myTimes.length === 0) return null;

  return (
    <div className="mb-8 rounded-xl bg-slate-900 px-5 py-4 text-center text-sm font-medium text-white">
      내가 예약한 시간: {myTimes.join(", ")}
    </div>
  );
}
