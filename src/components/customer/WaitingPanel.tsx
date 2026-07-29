"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import type { Waiting } from "@/lib/supabase";
import { getMyWaitingId, setMyWaitingId, clearMyWaitingId } from "@/lib/waitingStorage";
import { ensureNotificationPermission, notifyWaitingSoon } from "@/lib/notify";

const NOTIFY_THRESHOLD = 5;

const STATUS_LABEL: Record<Waiting["status"], string> = {
  WAITING: "대기 중",
  CALLED: "호출됨 - 매장으로 와주세요",
  ENTERED: "입장 완료",
  CANCELLED: "취소됨",
};

export default function WaitingPanel({
  storeId,
  businessDate,
}: {
  storeId: string;
  businessDate: string;
}) {
  const [waitings, setWaitings] = useState<Waiting[]>([]);
  const [myWaitingId, setLocalMyWaitingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage, must run after hydration
    setLocalMyWaitingId(getMyWaitingId(storeId));
    ensureNotificationPermission();
  }, [storeId]);

  const fetchWaitings = async () => {
    const { data } = await supabase
      .from("waitings")
      .select("*")
      .eq("store_id", storeId)
      .eq("business_date", businessDate)
      .order("waiting_number", { ascending: true });

    if (data) setWaitings(data as Waiting[]);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load, not a render-time side effect
    fetchWaitings();

    const channel = supabase
      .channel(`waitings-${storeId}`)
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
  }, [storeId, businessDate]);

  const myWaiting = waitings.find((w) => w.id === myWaitingId) ?? null;

  const aheadCount = myWaiting
    ? waitings.filter((w) => w.status === "WAITING" && w.waiting_number < myWaiting.waiting_number)
      .length
    : null;

  const totalWaiting = waitings.filter((w) => w.status === "WAITING").length;

  useEffect(() => {
    if (!myWaiting || myWaiting.status !== "WAITING" || aheadCount === null) return;
    if (aheadCount <= NOTIFY_THRESHOLD && !notifiedRef.current) {
      notifiedRef.current = true;
      notifyWaitingSoon(aheadCount);
    }
    if (aheadCount > NOTIFY_THRESHOLD) {
      notifiedRef.current = false;
    }
  }, [aheadCount, myWaiting]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("이름을 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("waitings")
      .insert({ store_id: storeId, waiter_name: name.trim(), party_size: partySize })
      .select()
      .single();

    setSubmitting(false);

    if (insertError || !data) {
      setError("웨이팅 신청에 실패했습니다: " + insertError?.message);
      return;
    }

    setMyWaitingId(storeId, data.id);
    setLocalMyWaitingId(data.id);
    setName("");
    setPartySize(1);
    fetchWaitings();
  };

  const handleLeave = () => {
    clearMyWaitingId(storeId);
    setLocalMyWaitingId(null);
    notifiedRef.current = false;
  };

  if (myWaiting) {
    const showAheadNotice =
      myWaiting.status === "WAITING" && aheadCount !== null && aheadCount <= NOTIFY_THRESHOLD;

    return (
      <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">내 웨이팅</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">
          {myWaiting.waiting_number}번 · {myWaiting.waiter_name}님 ({myWaiting.party_size}명)
        </p>
        <p className="mt-2 text-sm font-medium text-slate-600">
          {STATUS_LABEL[myWaiting.status]}
          {myWaiting.status === "WAITING" && aheadCount !== null && ` · 내 앞 ${aheadCount}팀`}
        </p>

        {showAheadNotice && (
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
            곧 입장하실 차례예요! 매장 근처에서 준비해 주세요.
          </p>
        )}

        {(myWaiting.status === "ENTERED" || myWaiting.status === "CANCELLED") && (
          <button
            type="button"
            onClick={handleLeave}
            className="mt-5 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            새 웨이팅 신청하기
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">
        현재 대기 중: <span className="font-semibold text-slate-700">{totalWaiting}팀</span>
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="waiter-name" className="mb-1.5 block text-sm font-medium text-slate-700">
            이름
          </label>
          <input
            id="waiter-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div>
          <label htmlFor="party-size" className="mb-1.5 block text-sm font-medium text-slate-700">
            인원수
          </label>
          <input
            id="party-size"
            type="number"
            min={1}
            max={20}
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "신청 중..." : "웨이팅 신청"}
        </button>
      </form>
    </div>
  );
}
