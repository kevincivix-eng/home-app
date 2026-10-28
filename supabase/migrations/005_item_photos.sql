-- Product photos: a private storage bucket, one folder per household
-- ("<household_id>/<item_id>-<timestamp>.jpg"). Only household members can read/write.

alter table shopping_items add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- First path segment must be a household the user belongs to
create or replace function photo_household_ok(object_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when (storage.foldername(object_name))[1] ~ '^[0-9a-f-]{36}$'
      then is_member(((storage.foldername(object_name))[1])::uuid)
    else false
  end
$$;
revoke execute on function photo_household_ok(text) from public, anon;
grant execute on function photo_household_ok(text) to authenticated;

drop policy if exists item_photos_select on storage.objects;
drop policy if exists item_photos_insert on storage.objects;
drop policy if exists item_photos_update on storage.objects;
drop policy if exists item_photos_delete on storage.objects;
create policy item_photos_select on storage.objects for select to authenticated using (bucket_id = 'item-photos' and photo_household_ok(name));
create policy item_photos_insert on storage.objects for insert to authenticated with check (bucket_id = 'item-photos' and photo_household_ok(name));
create policy item_photos_update on storage.objects for update to authenticated using (bucket_id = 'item-photos' and photo_household_ok(name)) with check (bucket_id = 'item-photos' and photo_household_ok(name));
create policy item_photos_delete on storage.objects for delete to authenticated using (bucket_id = 'item-photos' and photo_household_ok(name));
