"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { ReservationSlot, Store } from "@/lib/supabase";
import SlotGrid from "@/components/customer/SlotGrid";
import ReservationModal from "@/components/customer/ReservationModal";
import WaitingPanel from "@/components/customer/WaitingPanel";
import MyReservations from "@/components/customer/MyReservations";

type Tab = "reservation" | "waiting";

export default function Home() {
  const [store, setStore] = useState<Store | null>(null);
  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [tab, setTab] = useState<Tab>("reservation");
  const [selectedSlot, setSelectedSlot] = useState<ReservationSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStore = async () => {
    const { data, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (storeError) {
      setError("매장 정보를 불러오지 못했습니다: " + storeError.message);
      setLoading(false);
      return;
    }
    setStore(data as Store | null);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load, not a render-time side effect
    fetchStore();

    const channel = supabase
      .channel("store-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "stores" }, () => fetchStore())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSlots = async (storeId: string, businessDate: string) => {
    const { data } = await supabase
      .from("reservation_slots")
      .select("*")
      .eq("store_id", storeId)
      .eq("slot_date", businessDate)
      .order("slot_time", { ascending: true });

    if (data) setSlots(data as ReservationSlot[]);
  };

  useEffect(() => {
    if (!store) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load, not a render-time side effect
    fetchSlots(store.id, store.current_business_date);

    const channel = supabase
      .channel(`slots-${store.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservation_slots",
          filter: `store_id=eq.${store.id}`,
        },
        () => fetchSlots(store.id, store.current_business_date)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id, store?.current_business_date]);

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-6 py-24">
        <p className="text-sm text-slate-400">불러오는 중...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-6 py-24">
        <p className="text-sm text-red-500">{error}</p>
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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{store.name}</h1>
        {store.category && (
          <p className="mt-2 text-sm text-slate-500">
            {store.category}
            {store.address ? ` · ${store.address}` : ""} · 000-0000-0000
          </p>
        )}
        {store.description && (
          <p className="mt-3 text-sm text-slate-500">{store.description}</p>
        )}
      </header>

      <p className="mb-6 text-center text-xs text-slate-400">{store.current_business_date} 기준</p>

      <MyReservations storeId={store.id} slots={slots} />

      <div className="mb-8 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setTab("reservation")}
          className={
            tab === "reservation"
              ? "rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white"
              : "rounded-full px-5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
          }
        >
          오늘의 예약
        </button>
        <button
          type="button"
          onClick={() => setTab("waiting")}
          className={
            tab === "waiting"
              ? "rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white"
              : "rounded-full px-5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
          }
        >
          웨이팅
        </button>
      </div>

      {tab === "reservation" && (
        <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
          <SlotGrid slots={slots} onSelect={setSelectedSlot} />
        </div>
      )}

      {tab === "waiting" && (
        <WaitingPanel storeId={store.id} businessDate={store.current_business_date} />
      )}

      {selectedSlot && (
        <ReservationModal
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onReserved={() => {
            setSelectedSlot(null);
            fetchSlots(store.id, store.current_business_date);
          }}
        />
      )}

      <p className="mt-12 text-center text-sm text-slate-400">
        <Link href="/owner" className="underline hover:text-slate-600">
          점주이신가요?
        </Link>
      </p>
    </main>
  );
}
