"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ReservationSlot } from "@/lib/supabase";

type SlotWithReservation = ReservationSlot & {
  reservations: { reserver_name: string; status: string } | null;
};

function formatTime(time: string) {
  return time.slice(0, 5);
}

export default function SlotsBoard({ storeId }: { storeId: string }) {
  const [slots, setSlots] = useState<SlotWithReservation[]>([]);

  const fetchSlots = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("reservation_slots")
      .select("*, reservations(reserver_name, status)")
      .eq("store_id", storeId)
      .eq("slot_date", today)
      .order("slot_time", { ascending: true });

    if (data) setSlots(data as SlotWithReservation[]);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load, not a render-time side effect
    fetchSlots();

    const channel = supabase
      .channel(`owner-slots-${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservation_slots", filter: `store_id=eq.${storeId}` },
        () => fetchSlots()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        () => fetchSlots()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  return (
    <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-900">오늘의 예약 슬롯 현황</h2>

      {slots.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-400">등록된 슬롯이 없습니다.</p>
      ) : (
        <div className="mt-5 divide-y divide-slate-100">
          {slots.map((slot) => {
            const reservation = slot.reservations;
            return (
              <div key={slot.id} className="flex items-center justify-between py-3">
                <span className="w-16 text-sm font-medium text-slate-900">
                  {formatTime(slot.slot_time)}
                </span>
                {slot.status === "CLOSED" && reservation ? (
                  <span className="flex-1 px-4 text-sm text-slate-600">
                    {reservation.reserver_name}님 예약
                  </span>
                ) : (
                  <span className="flex-1 px-4 text-sm text-slate-400">-</span>
                )}
                <span
                  className={
                    slot.status === "AVAILABLE"
                      ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600"
                      : "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500"
                  }
                >
                  {slot.status === "AVAILABLE" ? "예약 가능" : "마감"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
