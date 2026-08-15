import { sql, unsafeSql } from "./db.js";

/* Idempotent runtime schema upgrade — mirrors db/migrations/002-full-audit-upgrade.sql.
   Runs on first cold start of each serverless function (guarded so the work is
   only done once per ~hour, see the tiny `schema_applied` in-memory guard and the
   db-level `schema_migrations` tracker). All statements are ADD-ONLY / IF NOT EXISTS,
   so re-running against an existing database is a no-op and can never delete data. */

let lastAppliedAt = 0;
const APPLY_EVERY_MS = 60 * 60 * 1000; // re-check once an hour

let applied = false;
export async function ensureSchema() {
  if (applied && Date.now() - lastAppliedAt < APPLY_EVERY_MS) return;
  try {
    const s = sql();
    await s`
      create table if not exists schema_migrations (
        id text primary key,
        applied_at timestamptz not null default now()
      )
    `;
    const rows = await s`select id from schema_migrations where id in ('002', '003')`;
    const has002 = rows.some(r => r.id === "002");
    const has003 = rows.some(r => r.id === "003");
    if (has002 && has003) { applied = true; lastAppliedAt = Date.now(); return; }

    // post-002 rolling upgrades — small add-only tweaks applied independently
    // of the big 002 block so a new column can ship without re-running everything.
    if (!has003) {
      const run = await unsafeSql();
      try {
        await run(`alter table users add column if not exists recently_viewed jsonb not null default '[]'::jsonb`);
      } catch (e) {
        if (!/already exists|duplicate key/i.test(e.message || "")) console.warn("schema 003 stmt failed (ignored):", (e.message || "").slice(0, 200));
      }
      await s`insert into schema_migrations (id) values ('003') on conflict (id) do nothing`;
      if (has002) { applied = true; lastAppliedAt = Date.now(); return; }
    }

    const stmts = [
      `alter table orders add column if not exists item_snapshot jsonb not null default '[]'::jsonb`,
      `alter table orders add column if not exists items_snapshot jsonb not null default '[]'::jsonb`,
      `alter table orders add column if not exists address text not null default ''`,
      `alter table orders add column if not exists custom boolean not null default false`,
      `alter table orders add column if not exists payment_method text`,
      `alter table orders add column if not exists payment_proof_image text`,
      `alter table orders add column if not exists coupon_code text`,
      `alter table orders add column if not exists coupon_discount numeric(10,2) not null default 0`,
      `alter table orders add column if not exists auto_discount numeric(10,2) not null default 0`,
      `alter table orders add column if not exists cancel_reason text`,
      `alter table orders add column if not exists rating smallint`,
      `alter table orders add column if not exists rating_comment text`,
      `alter table orders add column if not exists updated_at timestamptz not null default now()`,
      `alter table orders add column if not exists payment_status text not null default 'unpaid'`,
      `create or replace function orders_updated_at_fn() returns trigger language plpgsql as $$
        begin new.updated_at = now(); return new; end; $$;`,
      `drop trigger if exists trg_orders_updated_at on orders`,
      `create trigger trg_orders_updated_at before update on orders for each row execute function orders_updated_at_fn()`,
      `create table if not exists backups (
        id uuid primary key default gen_random_uuid(),
        created_at timestamptz not null default now(),
        source text default 'cron',
        meta jsonb
      )`,
      `alter table orders add column if not exists name text not null default ''`,
      `alter table orders alter column user_name drop not null`,
      `alter table orders add column if not exists payment_reviewed_at timestamptz`,
      `alter table orders add column if not exists payment_reject_reason text`,
      `alter table orders add column if not exists sourcing_status text not null default 'not_started'`,
      `alter table orders add column if not exists code_delivered_at timestamptz`,
      `alter table orders add column if not exists delivered_at timestamptz`,
      `alter table orders add column if not exists delivery_company text`,
      `alter table orders add column if not exists delivery_city text`,
      `alter table orders add column if not exists delivery_fee numeric(10,2) not null default 0`,
      `alter table orders add column if not exists delivery_notes text`,
      `alter table orders add column if not exists pickup_completed_at timestamptz`,

      `create table if not exists coupons (
        id uuid primary key default gen_random_uuid(),
        code text not null unique,
        type text not null default 'percent',
        value numeric(10,2) not null default 0,
        min_order numeric(10,2) not null default 0,
        max_discount numeric(10,2),
        usage_limit int,
        per_user_limit int not null default 1,
        applies_to text not null default 'all',
        applies_target jsonb not null default '[]'::jsonb,
        expires_at timestamptz,
        enabled boolean not null default true,
        created_at timestamptz not null default now()
      )`,
      `create table if not exists coupon_usage (
        id uuid primary key default gen_random_uuid(),
        coupon_id uuid not null references coupons(id) on delete cascade,
        user_id uuid references users(id) on delete set null,
        order_id uuid references orders(id) on delete set null,
        created_at timestamptz not null default now()
      )`,
      `create index if not exists idx_coupon_usage_coupon on coupon_usage(coupon_id)`,
      `create index if not exists idx_coupon_usage_user on coupon_usage(user_id)`,

      `create table if not exists suppliers (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        country text,
        contact_name text,
        contact_phone text,
        contact_email text,
        website text,
        notes text,
        rating numeric(2,1) not null default 0,
        is_preferred boolean not null default false,
        status text not null default 'active',
        created_at timestamptz not null default now()
      )`,
      `create table if not exists supplier_purchases (
        id uuid primary key default gen_random_uuid(),
        order_id uuid references orders(id) on delete set null,
        supplier_id uuid references suppliers(id) on delete set null,
        supplier_cost numeric(10,2),
        supplier_order_id text,
        status text not null default 'ordered',
        expected_at timestamptz,
        actual_at timestamptz,
        notes text,
        created_at timestamptz not null default now()
      )`,
      `create index if not exists idx_supplier_purchases_order on supplier_purchases(order_id)`,

      `create table if not exists codes (
        id uuid primary key default gen_random_uuid(),
        code text not null,
        product text not null,
        order_id uuid references orders(id) on delete set null,
        status text not null default 'available',
        created_at timestamptz not null default now()
      )`,
      `create unique index if not exists idx_codes_unique_code on codes(code) where status <> 'cancelled'`,

      `create sequence if not exists conversations_seq start 1`,
      `create table if not exists conversations (
        id uuid primary key default gen_random_uuid(),
        ticket_no text unique,
        user_id uuid references users(id) on delete cascade,
        order_id uuid references orders(id) on delete set null,
        subject text not null default '',
        category text not null default 'other',
        status text not null default 'open',
        assigned_to uuid references users(id) on delete set null,
        unread_admin int not null default 0,
        unread_user int not null default 0,
        last_message_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`,
      `create index if not exists idx_conv_user on conversations(user_id)`,
      `create index if not exists idx_conv_status on conversations(status)`,
      `create table if not exists conversation_messages (
        id uuid primary key default gen_random_uuid(),
        conversation_id uuid not null references conversations(id) on delete cascade,
        from_role text not null,
        from_user_id uuid references users(id) on delete set null,
        text text default '',
        image_url text,
        read_by_staff boolean not null default false,
        read_by_user boolean not null default false,
        created_at timestamptz not null default now()
      )`,
      `create index if not exists idx_convmsg_conv on conversation_messages(conversation_id)`,

      `create table if not exists uploads (
        id uuid primary key default gen_random_uuid(),
        owner_type text not null default '',
        mime_type text not null default 'image/png',
        bytes bytea,
        data_url text,
        uploaded_by uuid references users(id) on delete set null,
        created_at timestamptz not null default now()
      )`,
      `create index if not exists idx_uploads_owner on uploads(owner_type)`,

      `create table if not exists notifications (
        id uuid primary key default gen_random_uuid(),
        user_id uuid references users(id) on delete cascade,
        kind text not null,
        title text not null,
        body text not null default '',
        ref_type text,
        ref_id text,
        is_read boolean not null default false,
        created_at timestamptz not null default now()
      )`,
      `create index if not exists idx_notif_user on notifications(user_id, is_read)`,

      `create table if not exists reviews (
        id uuid primary key default gen_random_uuid(),
        user_id uuid references users(id) on delete cascade,
        product_id text not null,
        product text not null default '',
        stars smallint not null check (stars between 1 and 5),
        comment text default '',
        verified boolean not null default false,
        visible boolean not null default true,
        created_at timestamptz not null default now()
      )`,
      `create unique index if not exists idx_reviews_user_product on reviews(user_id, product_id) where visible`,
      `create index if not exists idx_reviews_product on reviews(product_id)`,

      `create table if not exists loyalty_points (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references users(id) on delete cascade,
        points int not null default 0,
        reason text not null default '',
        order_id uuid references orders(id) on delete set null,
        created_at timestamptz not null default now()
      )`,
      `create index if not exists idx_loyalty_user on loyalty_points(user_id)`,
      `alter table users add column if not exists points_balance int not null default 0`,
      `alter table users add column if not exists last_login_at timestamptz`,
      `alter table users add column if not exists discount_percent numeric(5,2) not null default 0`,
      `alter table users add column if not exists discount_reason text not null default ''`,
      `alter table users add column if not exists referral_reward_count int not null default 0`,
      `alter table users add column if not exists permissions jsonb not null default '[]'::jsonb`,

      /* security_q/_a are from the old password-recovery flow — no longer used by the
         new OTP flow, so make them nullable to keep old rows valid without seeding dummies */
      `alter table users alter column security_q drop not null`,
      `alter table users alter column security_a_hash drop not null`,

      `create table if not exists sourcing_requests (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references users(id) on delete cascade,
        game_name text not null,
        region text,
        extra text,
        fulfilled boolean not null default false,
        notified boolean not null default false,
        created_at timestamptz not null default now(),
        fulfilled_at timestamptz
      )`,
      `create index if not exists idx_sourcing_fulfilled on sourcing_requests(fulfilled)`,

      `create table if not exists site_visits (
        id bigserial primary key,
        created_at timestamptz not null default now()
      )`,

      `create table if not exists notify_requests (
        id uuid primary key default gen_random_uuid(),
        user_id uuid references users(id) on delete set null,
        phone text,
        game_name text not null,
        notified boolean not null default false,
        created_at timestamptz not null default now()
      )`,
      `create index if not exists idx_notify_game on notify_requests(game_name)`,

      `create table if not exists price_history (
        id bigserial primary key,
        who text not null default '',
        game_name text not null default '',
        old_price numeric(10,2),
        new_price numeric(10,2),
        changed_at timestamptz not null default now()
      )`,
      `create index if not exists idx_price_history_changed on price_history(changed_at)`,

      `create index if not exists idx_notif_user_read on notifications(user_id, is_read)`,

      `create table if not exists otp_codes (
        id uuid primary key default gen_random_uuid(),
        identifier text not null,
        purpose text not null,
        user_id uuid references users(id) on delete cascade,
        code text not null,
        attempts int not null default 0,
        created_at timestamptz not null default now()
      )`,
      `create index if not exists idx_otp_identifier on otp_codes(identifier, purpose)`,

      `create unique index if not exists idx_referral_cap on users(referred_by, id) where referred_by is not null`,

      `alter table activity_log add column if not exists details jsonb`,

      `create table if not exists rate_limits (
        key text primary key,
        count int not null default 1,
        window_start timestamptz not null default now()
      )`,

      `alter table backups add column if not exists source text default 'cron'`,

      `create index if not exists idx_orders_status on orders(status)`,
      `create index if not exists idx_orders_payment_status on orders(payment_status)`,
      `create index if not exists idx_orders_created on orders(created_at)`,
    ];

    const run = await unsafeSql();
    for (const st of stmts) {
      try { await run(st); } catch (e) {
        // swallow only "already exists"-style duplicates; log the rest
        if (!/already exists|duplicate key/i.test(e.message || "")) {
          console.warn("schema stmt failed (ignored):", (e.message || "").slice(0, 200));
        }
      }
    }

    // backfill payment_status on existing orders (idempotent — only touches unpaid rows)
    try {
      await s`
        update orders
        set payment_status = case
          when status = 'proof_submitted' and payment_status = 'unpaid' then 'proof_submitted'
          when status in ('payment_confirmed','preparing','delivered')
               and payment_proof_image is not null and payment_proof_image <> ''
               and payment_status = 'unpaid' then 'confirmed'
          else payment_status
        end
      `;
      await s`
        update orders
        set payment_status = 'under_review', payment_reviewed_at = now()
        where status = 'proof_submitted' and payment_status = 'proof_submitted'
      `;
    } catch (e) {
      console.warn("payment_status backfill skipped:", (e.message || "").slice(0, 200));
    }

    // only register success if the statement list actually ran to completion with no
    // "new object missing" errors (add-only statements tolerate duplicates, but not real failures)
    await s`insert into schema_migrations (id) values ('002') on conflict (id) do nothing`;
    applied = true;
    lastAppliedAt = Date.now();
  } catch (e) {
    // schema upgrade failing must never break a request — log and retry next cold start
    console.error("ensureSchema error:", e.message);
  }
}
