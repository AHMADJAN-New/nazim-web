-- Migration to add sms_credits table and decrement function
create table if not exists sms_credits (
  id uuid primary key default uuid_generate_v4(),
  credits integer not null default 0,
  updated_at timestamp with time zone default timezone('utc', now())
);

-- Insert initial credit row with 100 credits if table is empty
insert into sms_credits (credits)
select 100
where not exists (select 1 from sms_credits);

-- Function to decrement sms credits and return new value
create or replace function decrement_sms_credit(amount integer)
returns integer
language plpgsql
as $$
declare
  new_credits integer;
begin
  update sms_credits
  set credits = credits - amount,
      updated_at = timezone('utc', now())
  returning credits into new_credits;
  return new_credits;
end;
$$;
