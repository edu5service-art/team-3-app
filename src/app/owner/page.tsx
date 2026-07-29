"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Store } from "@/lib/supabase";
import SlotsBoard from "@/components/owner/SlotsBoard";
import WaitingQueue from "@/components/owner/WaitingQueue";

export default function OwnerDashboard() {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchStore();
  }, []);

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
      </header>

      <div className="space-y-6">
        <SlotsBoard storeId={store.id} />
        <WaitingQueue storeId={store.id} />
      </div>
    </main>
  );
}
