-- Payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  asker_user_id uuid not null references public.users(id),
  helper_user_id uuid not null references public.users(id),
  amount_cents integer not null,
  currency text not null default 'USD', -- ISO 4217
  tera_fee_cents integer not null, -- 15%
  helper_payout_cents integer not null, -- 85%
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  captured_at timestamptz,
  refunded_at timestamptz
);

create index idx_payments_conversation on public.payments(conversation_id);
create index idx_payments_asker on public.payments(asker_user_id);
create index idx_payments_helper on public.payments(helper_user_id);
create index idx_payments_status on public.payments(status);
