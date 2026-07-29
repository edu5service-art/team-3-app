-- Supabase SQL Editor에서 실행하세요.
-- 버그 수정: 예약을 취소해도 취소된 기록이 reservations.slot_id UNIQUE 제약을
-- 계속 차지하고 있어서, 그 시간대를 다시는 예약할 수 없었습니다.
-- (예: 화면엔 "예약 가능"으로 보이는데 실제로 예약하면 "이미 예약됨" 에러)

-- 기존 slot_id 전체 UNIQUE 제약 제거
alter table reservations drop constraint if exists reservations_slot_id_key;

-- 취소되지 않은 예약에 한해서만 슬롯당 1건으로 제한 (취소된 예약은 재예약을 막지 않음)
create unique index if not exists reservations_slot_id_active_idx
  on reservations (slot_id)
  where status <> 'CANCELLED';
