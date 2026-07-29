"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ReservationSlot } from "@/lib/supabase";
import { getMyReservations, removeMyReservation } from "@/lib/reservationStorage";

function formatTime(time: string) {
  return time.slice(0, 5);
}

type MyReservedSlot = { slotId: string; reservationId: string; time: string };

export default function MyReservations({
  storeId,
  slots,
  onCancelled,
}: {
  storeId: string;
  slots: ReservationSlot[];
  onCancelled: () => void;
}) {
  const [myReserved, setMyReserved] = useState<MyReservedSlot[]>([]);
  const [cancellingSlotId, setCancellingSlotId] = useState<string | null>(null);

  useEffect(() => {
    const mine = getMyReservations(storeId);
    const reserved = mine
      .map((r) => {
        const slot = slots.find((s) => s.id === r.slotId);
        return slot ? { slotId: r.slotId, reservationId: r.reservationId, time: formatTime(slot.slot_time) } : null;
      })
      .filter((r): r is MyReservedSlot => r !== null)
      .sort((a, b) => a.time.localeCompare(b.time));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage, must run after hydration
    setMyReserved(reserved);
  }, [storeId, slots]);

  const handleCancel = async (slotId: string, reservationId: string) => {
    setCancellingSlotId(slotId);
    await supabase.rpc("cancel_reservation", { p_reservation_id: reservationId });
    removeMyReservation(storeId, slotId);
    setCancellingSlotId(null);
    onCancelled();
  };

  if (myReserved.length === 0) return null;

  return (
    <div className="mb-8 rounded-xl bg-slate-900 px-5 py-4">
      <p className="mb-2 text-center text-sm font-medium text-white">내가 예약한 시간</p>
      <div className="flex flex-wrap justify-center gap-2">
        {myReserved.map((r) => (
          <span
            key={r.slotId}
            className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-3 pr-1 text-sm text-white"
          >
            {r.time}
            <button
              type="button"
              disabled={cancellingSlotId === r.slotId}
              onClick={() => handleCancel(r.slotId, r.reservationId)}
              className="rounded-full px-2 py-0.5 text-xs font-medium text-white/70 transition hover:bg-white/20 hover:text-white disabled:opacity-50"
            >
              {cancellingSlotId === r.slotId ? "취소 중..." : "취소"}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
