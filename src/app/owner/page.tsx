"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Store } from "@/lib/supabase";
import SlotsBoard from "@/components/owner/SlotsBoard";
import WaitingQueue from "@/components/owner/WaitingQueue";

export default function OwnerDashboard() {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchStore = async () => {
    const { data } = await supabase
      .from("stores")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    setStore(data as Store | null);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load, not a render-time side effect
    fetchStore();
  }, []);

  const handleAdvanceDay = async () => {
    if (!store) return;

    setConfirmOpen(false);
    setAdvancing(true);
    await supabase.rpc("advance_to_next_day", { p_store_id: store.id });
    await fetchStore();
    setAdvancing(false);
  };

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-6 py-24">
        <p className="text-sm text-slate-400">불러오는 중...</p>
      </main>
    );
  }

  if (!store) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-6 py-24 text-center">
        <p className="text-sm text-slate-400">
          등록된 매장이 없습니다. supabase/schema.sql을 Supabase SQL Editor에서 실행해 주세요.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 sm:py-24">
      <header className="mb-10 text-center">
        <p className="text-sm text-slate-400">점주 대시보드 (로그인 없이 접근)</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{store.name}</h1>
        <p className="mt-2 text-sm text-slate-500">영업일: {store.current_business_date}</p>
        <button
          type="button"
          disabled={advancing}
          onClick={() => setConfirmOpen(true)}
          className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {advancing ? "넘어가는 중..." : "다음 날짜로 넘어가기"}
        </button>
      </header>

      <div className="space-y-6">
        <SlotsBoard storeId={store.id} businessDate={store.current_business_date} />
        <WaitingQueue storeId={store.id} businessDate={store.current_business_date} />
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">다음 날짜로 넘어갈까요?</h3>
            <p className="mt-2 text-sm text-slate-500">
              오늘의 예약/웨이팅 현황이 모두 초기화되고, 새 영업일의 예약 슬롯이 생성됩니다.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAdvanceDay}
                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                넘어가기
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
