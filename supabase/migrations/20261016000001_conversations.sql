-- Conversations: one row per contact, kept current by a trigger on messages.
--
-- The inbox used to download every message and group them in JavaScript to
-- build its conversation list, so its cost grew with the whole history. With
-- the summary (preview, timestamps, worker) stored and indexed here, the list
-- reads one page of conversations and a chat reads one page of its messages,
-- regardless of how many messages exist.

-- ---------------------------------------------------------------
-- TABLE
-- ---------------------------------------------------------------
create table public.conversations (
  id               uuid        primary key default gen_random_uuid(),
  phone            text,
  bsuid            text,       -- WhatsApp business-scoped user ID
  worker_id        uuid        references public.workers(id) on delete set null,
  last_message     text,       -- preview shown in the inbox list
  last_message_at  timestamptz not null,
  -- "Unread" is "an inbound message in the last 24h"; a timestamp compared
  -- against now() stays correct, where a stored boolean would go stale.
  last_inbound_at  timestamptz,
  created_at       timestamptz not null default now(),
  constraint conversations_contact_present check (phone is not null or bsuid is not null)
);

-- One conversation per phone number and per BSUID.
create unique index conversations_phone_key on public.conversations (phone) where phone is not null;
create unique index conversations_bsuid_key on public.conversations (bsuid) where bsuid is not null;

-- Inbox list: newest activity first, keyset-paginated on (last_message_at, id).
create index conversations_inbox_idx on public.conversations (last_message_at desc, id desc);

alter table public.conversations enable row level security;

create policy "authenticated full access" on public.conversations
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------
-- MESSAGES → CONVERSATION
-- ---------------------------------------------------------------
alter table public.messages
  add column conversation_id uuid references public.conversations(id) on delete cascade;

-- Open a chat: one conversation's messages, newest first, keyset-paginated.
create index messages_conversation_idx
  on public.messages (conversation_id, created_at desc, id desc);

-- Finds or creates the conversation for a message and folds the message into
-- its summary. Order-independent: the summary only ever moves forward in time,
-- so replaying messages out of order (the backfill) gives the same result.
create or replace function public.conversation_for_message(
  p_phone      text,
  p_bsuid      text,
  p_worker_id  uuid,
  p_body       text,
  p_direction  text,
  p_at         timestamptz
) returns uuid
language plpgsql
as $$
declare
  conv_id uuid;
begin
  -- A phone match wins over a BSUID match: the number is what workers are
  -- registered under.
  select id into conv_id
    from public.conversations
   where (p_phone is not null and phone = p_phone)
      or (p_bsuid is not null and bsuid = p_bsuid)
   order by (p_phone is not null and phone = p_phone) desc
   limit 1;

  if conv_id is null then
    insert into public.conversations (phone, bsuid, worker_id, last_message, last_message_at, last_inbound_at)
    values (p_phone, p_bsuid, p_worker_id, p_body, p_at,
            case when p_direction = 'inbound' then p_at end)
    on conflict do nothing
    returning id into conv_id;

    -- Lost a race with a concurrent first message from the same contact:
    -- use the conversation that insert created.
    if conv_id is null then
      select id into conv_id
        from public.conversations
       where (p_phone is not null and phone = p_phone)
          or (p_bsuid is not null and bsuid = p_bsuid)
       order by (p_phone is not null and phone = p_phone) desc
       limit 1;
    end if;
  end if;

  update public.conversations c set
    last_message    = case when p_at >= c.last_message_at then p_body else c.last_message end,
    last_message_at = greatest(c.last_message_at, p_at),
    last_inbound_at = case when p_direction = 'inbound'
                           then greatest(coalesce(c.last_inbound_at, p_at), p_at)
                           else c.last_inbound_at end,
    worker_id       = coalesce(p_worker_id, c.worker_id),
    -- Learn an identifier the conversation didn't have (e.g. a username user
    -- later gives their number), unless another conversation already owns it.
    phone = coalesce(c.phone, case when p_phone is not null and not exists
              (select 1 from public.conversations o where o.phone = p_phone) then p_phone end),
    bsuid = coalesce(c.bsuid, case when p_bsuid is not null and not exists
              (select 1 from public.conversations o where o.bsuid = p_bsuid) then p_bsuid end)
  where c.id = conv_id;

  return conv_id;
end;
$$;

-- ---------------------------------------------------------------
-- BACKFILL existing messages
-- ---------------------------------------------------------------
-- Adding the column above holds an exclusive lock on messages until this
-- migration commits, so no message can be inserted between the backfill and
-- the trigger below going live.
do $$
declare
  r record;
begin
  for r in select id, phone, bsuid, worker_id, body, direction, created_at
             from public.messages
            order by created_at, id
  loop
    update public.messages
       set conversation_id = public.conversation_for_message(
             r.phone, r.bsuid, r.worker_id, r.body, r.direction, r.created_at)
     where id = r.id;
  end loop;
end;
$$;

alter table public.messages alter column conversation_id set not null;

-- ---------------------------------------------------------------
-- TRIGGER: every new message is attached as it's inserted
-- ---------------------------------------------------------------
create or replace function public.messages_attach_conversation()
returns trigger
language plpgsql
as $$
begin
  new.conversation_id := public.conversation_for_message(
    new.phone, new.bsuid, new.worker_id, new.body, new.direction, new.created_at);
  return new;
end;
$$;

create trigger messages_attach_conversation
  before insert on public.messages
  for each row execute function public.messages_attach_conversation();
