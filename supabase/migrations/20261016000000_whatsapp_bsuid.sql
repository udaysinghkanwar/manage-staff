-- WhatsApp usernames: when a user enables a username and has not interacted
-- with the business in the last 30 days, Meta omits their phone number from
-- inbound webhooks and identifies them only by a business-scoped user ID
-- (BSUID, `from_user_id`). Store it so those senders can be logged, replied
-- to, and matched to a worker record.
--
-- Additive: no existing rows change.

-- Workers keep phone NOT NULL (broadcasts and the UI depend on it); the
-- registration parser extracts a number from the message for BSUID-only
-- senders. bsuid is unique so one WhatsApp account maps to one worker.
ALTER TABLE workers ADD COLUMN bsuid text UNIQUE;

-- A message from a BSUID-only sender has no phone number to record.
ALTER TABLE messages ADD COLUMN bsuid text;
ALTER TABLE messages ALTER COLUMN phone DROP NOT NULL;

-- Every message must still be attributable to someone.
ALTER TABLE messages ADD CONSTRAINT messages_sender_present
  CHECK (phone IS NOT NULL OR bsuid IS NOT NULL);

CREATE INDEX messages_bsuid_idx ON messages (bsuid) WHERE bsuid IS NOT NULL;
