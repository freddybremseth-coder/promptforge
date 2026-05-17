-- Migration: storage bucket for generated package ZIPs
-- Reason: signed URLs require an authenticated, non-public bucket

insert into storage.buckets (id, name, public)
values ('packages', 'packages', false)
on conflict (id) do nothing;

create policy "packages_read_own"
  on storage.objects for select
  using (
    bucket_id = 'packages'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "packages_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'packages'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
