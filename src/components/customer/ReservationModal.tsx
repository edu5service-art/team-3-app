"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import type { ReservationSlot } from "@/lib/supabase";
import { addMyReservation } from "@/lib/reservationStorage";

function formatTime(time: string) {
  return time.slice(0, 5);
}

export default function ReservationModal({
  slot,
  onClose,
  onReserved,
}: {
  slot: ReservationSlot;
  onClose: () => void;
  onReserved: () => void;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("이름을 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("reservations")
      .insert({ slot_id: slot.id, reserver_name: name.trim() })
      .select()
      .single();

    setSubmitting(false);

    if (insertError || !data) {
      if (insertError?.code === "23505") {
        setError("바로 직전에 다른 분이 먼저 예약했어요. 다른 시간대를 선택해 주세요.");
      } else {
        setError("예약에 실패했습니다: " + insertError?.message);
      }
      return;
    }

    addMyReservation(slot.store_id, slot.id, data.id);
    onReserved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">
          {formatTime(slot.slot_time)} 예약
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          예약하실 분의 이름을 입력해 주세요.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "예약 중..." : "예약하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
