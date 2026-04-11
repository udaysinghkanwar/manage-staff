-- Replace the flat address text column with structured address fields.
-- country and province store ISO codes (e.g. 'CA', 'ON') so the UI can
-- resolve full names via country-state-city without storing redundant text.
alter table public.companies
  drop column address,
  add column street_address text not null default '',
  add column city           text not null default '',
  add column province       text not null default '',   -- ISO state/province code, e.g. 'ON'
  add column country        text not null default 'CA', -- ISO country code, e.g. 'CA'
  add column postal_code    text not null default '';
