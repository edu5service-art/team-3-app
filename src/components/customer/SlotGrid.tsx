import type { ReservationSlot } from "@/lib/supabase";

function formatTime(time: string) {
  return time.slice(0, 5);
}

export default function SlotGrid({
  slots,
  onSelect,
}: {
  slots: ReservationSlot[];
  onSelect: (slot: ReservationSlot) => void;
}) {
  if (slots.length === 0) {
    return (
      <p className="text-center text-sm text-slate-400">
        오늘 등록된 예약 슬롯이 없습니다.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {slots.map((slot) => {
        const available = slot.status === "AVAILABLE";
        return (
          <button
            key={slot.id}
            type="button"
            disabled={!available}
            onClick={() => onSelect(slot)}
            className={
              available
                ? "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-4 text-center transition hover:border-emerald-400 hover:bg-emerald-100"
                : "cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center opacity-60"
            }
          >
            <div className="text-base font-semibold text-slate-900">
              {formatTime(slot.slot_time)}
            </div>
            <div
              className={
                available
                  ? "mt-1 text-xs font-medium text-emerald-600"
                  : "mt-1 text-xs font-medium text-slate-400"
              }
            >
              {available ? "예약 가능" : "마감"}
            </div>
          </button>
        );
      })}
    </div>
  );
}
