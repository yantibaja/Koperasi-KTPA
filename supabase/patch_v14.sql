-- PATCH V14: Absensi (foto kamera + watermark) untuk Penagih dan Pemilik. Jalankan sekali di SQL Editor (aman diulang).
create table if not exists absensi(
  id uuid primary key default gen_random_uuid(),
  koperasi_id uuid references koperasi on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  tipe text not null check (tipe in ('masuk','pulang')),
  waktu timestamptz not null default now(),
  lat double precision, lng double precision, akurasi real, alamat text, foto_path text, kode_foto text);
create index if not exists absensi_user_idx on absensi(user_id, waktu desc);
create index if not exists absensi_kop_idx on absensi(koperasi_id, waktu desc);
alter table absensi enable row level security;
drop policy if exists abs_ins on absensi; drop policy if exists abs_sel on absensi;
create policy abs_ins on absensi for insert with check (user_id=auth.uid() and my_role() in ('admin','penagih') and koperasi_id=my_kop());
create policy abs_sel on absensi for select using (user_id=auth.uid() or is_super() or (my_role()='admin' and koperasi_id=my_kop()));

-- Penyimpanan foto absensi (privat)
insert into storage.buckets(id,name,public) values('absensi','absensi',false) on conflict do nothing;
drop policy if exists abs_st_ins on storage.objects; drop policy if exists abs_st_sel on storage.objects;
create policy abs_st_ins on storage.objects for insert to authenticated with check (bucket_id='absensi' and (storage.foldername(name))[1]=auth.uid()::text);
create policy abs_st_sel on storage.objects for select to authenticated using (bucket_id='absensi' and ((storage.foldername(name))[1]=auth.uid()::text or is_super() or my_role()='admin'));

-- Pemilik mendapat notifikasi saat ada yang absen (butuh patch_v13; jika belum, absensi tetap jalan)
create or replace function notif_absensi() returns trigger language plpgsql security definer set search_path=public as $$
declare nm text;
begin
 begin
  select nama into nm from profiles where id=new.user_id;
  insert into notifikasi(user_id,judul,isi,tipe,tautan)
   select id, 'Absen '||new.tipe||' 📸', coalesce(nm,'Petugas')||' absen '||new.tipe||' di '||coalesce(new.alamat,'lokasi tidak diketahui'), 'info', '/absensi'
   from profiles where koperasi_id=new.koperasi_id and role='admin' and status='approved' and id<>new.user_id;
 exception when others then raise warning 'notif_absensi: %', sqlerrm;
 end;
 return new;
end $$;
drop trigger if exists t_notif_absensi on absensi;
create trigger t_notif_absensi after insert on absensi for each row execute function notif_absensi();
