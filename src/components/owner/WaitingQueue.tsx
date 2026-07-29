"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Waiting, WaitingStatus } from "@/lib/supabase";

const STATUS_LABEL: Record<WaitingStatus, string> = {
  WAITING: "대기 중",
  CALLED: "호출됨",
  ENTERED: "입장 완료",
  CANCELLED: "취소됨",
};

const STATUS_STYLE: Record<WaitingStatus, string> = {
  WAITING: "bg-amber-50 text-amber-600",
  CALLED: "bg-blue-50 text-blue-600",
  ENTERED: "bg-emerald-50 text-emerald-600",
  CANCELLED: "bg-slate-100 text-slate-400",
};

export default function WaitingQueue({ storeId }: { storeId: string }) {
  const [waitings, setWaitings] = useState<Waiting[]>([]);

  const fetchWaitings = async () => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("waitings")
      .select("*")
      .eq("store_id", storeId)
      .gte("created_at", startOfToday.toISOString())
      .order("waiting_number", { ascending: true });

    if (data) setWaitings(data as Waiting[]);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load, not a render-time side effect
    fetchWaitings();

    const channel = supabase
      .channel(`owner-waitings-${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waitings", filter: `store_id=eq.${storeId}` },
        () => fetchWaitings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const updateStatus = async (id: string, status: WaitingStatus) => {
    await supabase.from("waitings").update({ status }).eq("id", id);
  };

  return (
    <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-900">실시간 웨이팅 대기열</h2>

      {waitings.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-400">대기 중인 팀이 없습니다.</p>
      ) : (
        <div className="mt-5 divide-y divide-slate-100">
          {waitings.map((w) => (
            <div key={w.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {w.waiting_number}번 · {w.waiter_name}님 ({w.party_size}명)
                </p>
                <span
                  className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[w.status]}`}
                >
                  {STATUS_LABEL[w.status]}
                </span>
              </div>

              {w.status === "WAITING" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(w.id, "CALLED")}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700"
                  >
                    호출
                  </button>
                  <button
                    onClick={() => updateStatus(w.id, "CANCELLED")}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100"
                  >
                    취소
                  </button>
                </div>
              )}

              {w.status === "CALLED" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(w.id, "ENTERED")}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500"
                  >
                    입장완료
                  </button>
                  <button
                    onClick={() => updateStatus(w.id, "CANCELLED")}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
