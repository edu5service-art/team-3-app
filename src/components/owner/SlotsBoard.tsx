"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ReservationSlot } from "@/lib/supabase";

type SlotWithReservation = ReservationSlot & {
  reservations: { id: string; reserver_name: string; status: string } | null;
};

function formatTime(time: string) {
  return time.slice(0, 5);
}

export default function SlotsBoard({
  storeId,
  businessDate,
}: {
  storeId: string;
  businessDate: string;
}) {
  const [slots, setSlots] = useState<SlotWithReservation[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchSlots = async () => {
    const { data } = await supabase
      .from("reservation_slots")
      .select("*, reservations(id, reserver_name, status)")
      .eq("store_id", storeId)
      .eq("slot_date", businessDate)
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
  }, [storeId, businessDate]);

  const handleCancel = async (reservationId: string) => {
    setCancellingId(reservationId);
    await supabase.rpc("cancel_reservation", { p_reservation_id: reservationId });
    setCancellingId(null);
  };

  return (
    <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-900">오늘의 예약 슬롯 현황</h2>

      {slots.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-400">등록된 슬롯이 없습니다.</p>
      ) : (
        <div className="mt-5 divide-y divide-slate-100">
          {slots.map((slot) => {
            const reservation = slot.reservations;
            const reserved = slot.status === "CLOSED" && reservation;
            return (
              <div key={slot.id} className="flex items-center justify-between py-3">
                <span className="w-16 shrink-0 text-sm font-medium text-slate-900">
                  {formatTime(slot.slot_time)}
                </span>
                {reserved ? (
                  <span className="flex-1 px-4 text-sm text-slate-600">
                    {reservation.reserver_name}님 예약
                  </span>
                ) : (
                  <span className="flex-1 px-4 text-sm text-slate-400">-</span>
                )}
                <span
                  className={
                    slot.status === "AVAILABLE"
                      ? "shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600"
                      : "shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500"
                  }
                >
                  {slot.status === "AVAILABLE" ? "예약 가능" : "마감"}
                </span>
                {reserved && (
                  <button
                    type="button"
                    disabled={cancellingId === reservation.id}
                    onClick={() => handleCancel(reservation.id)}
                    className="ml-3 shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {cancellingId === reservation.id ? "취소 중..." : "예약취소"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
