import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Store = {
  id: string;
  name: string;
  address: string | null;
  category: string | null;
  description: string | null;
  created_at: string;
};

export type SlotStatus = "AVAILABLE" | "CLOSED";

export type ReservationSlot = {
  id: string;
  store_id: string;
  slot_date: string;
  slot_time: string;
  status: SlotStatus;
  created_at: string;
};

export type ReservationStatus = "CONFIRMED" | "CANCELLED";

export type Reservation = {
  id: string;
  slot_id: string;
  reserver_name: string;
  status: ReservationStatus;
  reserved_at: string;
};

export type WaitingStatus = "WAITING" | "CALLED" | "ENTERED" | "CANCELLED";

export type Waiting = {
  id: string;
  store_id: string;
  waiter_name: string;
  party_size: number;
  waiting_number: number;
  status: WaitingStatus;
  created_at: string;
};
