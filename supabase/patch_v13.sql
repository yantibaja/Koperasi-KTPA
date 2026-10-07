-- PATCH V13: notifikasi dalam aplikasi (pembayaran berhasil, bukti ditolak, transfer baru, tugas tagih). Jalankan sekali di SQL Editor (aman diulang).
create table if not exists notifikasi(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  judul text not null, isi text, tipe text not null default 'info' check (tipe in ('sukses','gagal','peringatan','info')),
  tautan text, dibaca boolean not null default false, created_at timestamptz not null default now());
create index if not exists notifikasi_user_idx on notifikasi(user_id, dibaca, created_at desc);
alter table notifikasi enable row level security;
drop policy if exists nf_sel on notifikasi; drop policy if exists nf_upd on notifikasi; drop policy if exists nf_del on notifikasi;
create policy nf_sel on notifikasi for select using (user_id=auth.uid());
create policy nf_upd on notifikasi for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy nf_del on notifikasi for delete using (user_id=auth.uid());

-- Realtime: notifikasi muncul seketika di aplikasi
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
    and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifikasi') then
  alter publication supabase_realtime add table notifikasi;
 end if; end $$;

-- Pembayaran -> notifikasi (QRIS lunas lewat webhook, transfer diverifikasi, tunai dicatat, dll)
create or replace function notif_pembayaran() returns trigger language plpgsql security definer set search_path=public as $$
declare nm text; ke int; rpf text;
begin
 begin
  select nama into nm from profiles where id=new.nasabah_id;
  select a.ke into ke from angsuran a where a.id=new.angsuran_id;
  rpf := 'Rp ' || replace(to_char(new.jumlah,'FM999,999,999,999'),',','.');
  if tg_op='INSERT' and new.status='menunggu_verifikasi' then
   if new.nasabah_id is not null then insert into notifikasi(user_id,judul,isi,tipe,tautan) values (new.nasabah_id,'Bukti terkirim 🎉','Bukti transfer '||rpf||' sedang diperiksa admin.','info','/pembayaran'); end if;
   insert into notifikasi(user_id,judul,isi,tipe,tautan) select id,'Transfer menunggu verifikasi',coalesce(nm,'Nasabah')||' mengirim bukti transfer '||rpf,'peringatan','/pembayaran' from profiles where koperasi_id=new.koperasi_id and role='admin' and status='approved';
  elsif tg_op='INSERT' and new.status='sukses' then
   if new.nasabah_id is not null then insert into notifikasi(user_id,judul,isi,tipe,tautan) values (new.nasabah_id,'Pembayaran diterima ✅',rpf||' ('||new.metode||') untuk angsuran #'||coalesce(ke::text,'-')||' tercatat lunas.','sukses','/pembayaran'); end if;
   if exists(select 1 from profiles where id=new.dibuat_oleh and role='penagih') then
    insert into notifikasi(user_id,judul,isi,tipe,tautan) select id,'Penagih mencatat pembayaran',coalesce(nm,'Nasabah')||' membayar '||rpf||' ('||new.metode||')','sukses','/pembayaran' from profiles where koperasi_id=new.koperasi_id and role='admin' and status='approved';
   end if;
  elsif tg_op='UPDATE' and new.status is distinct from old.status then
   if new.status='sukses' then
    if new.nasabah_id is not null then insert into notifikasi(user_id,judul,isi,tipe,tautan) values (new.nasabah_id,'Pembayaran berhasil 🎉',rpf||' ('||new.metode||') diterima. Angsuran #'||coalesce(ke::text,'-')||' lunas.','sukses','/pembayaran'); end if;
    if new.metode='QRIS' then
     insert into notifikasi(user_id,judul,isi,tipe,tautan) select id,'Pembayaran QRIS masuk',coalesce(nm,'Nasabah')||' membayar '||rpf,'sukses','/pembayaran' from profiles where koperasi_id=new.koperasi_id and role='admin' and status='approved';
    end if;
   elsif new.status='ditolak' and new.nasabah_id is not null then
    insert into notifikasi(user_id,judul,isi,tipe,tautan) values (new.nasabah_id,'Bukti transfer ditolak','Bukti transfer '||rpf||' tidak diterima. Silakan kirim ulang atau hubungi koperasi.','gagal','/pembayaran');
   elsif new.status='gagal' and new.nasabah_id is not null then
    insert into notifikasi(user_id,judul,isi,tipe,tautan) values (new.nasabah_id,'Pembayaran tidak selesai','Pembayaran '||rpf||' kedaluwarsa atau dibatalkan. Silakan coba lagi.','peringatan','/pembayaran');
   end if;
  end if;
 exception when others then raise warning 'notif_pembayaran: %', sqlerrm;
 end;
 return new;
end $$;
drop trigger if exists t_notif_pembayaran on pembayaran;
create trigger t_notif_pembayaran after insert or update on pembayaran for each row execute function notif_pembayaran();

-- Tugas tagih baru -> notifikasi untuk penagih
create or replace function notif_tugas() returns trigger language plpgsql security definer set search_path=public as $$
declare nm text; rpf text;
begin
 begin
  if new.penagih_id is not null and (tg_op='INSERT' or old.penagih_id is distinct from new.penagih_id) then
   select p.nama, 'Rp ' || replace(to_char(a.jumlah+a.denda,'FM999,999,999,999'),',','.') into nm, rpf from angsuran a join profiles p on p.id=a.nasabah_id where a.id=new.angsuran_id;
   insert into notifikasi(user_id,judul,isi,tipe,tautan) values (new.penagih_id,'Tugas tagih baru ⏰','Tagih '||coalesce(nm,'nasabah')||' sebesar '||coalesce(rpf,'-'),'peringatan','/pembayaran');
  end if;
 exception when others then raise warning 'notif_tugas: %', sqlerrm;
 end;
 return new;
end $$;
drop trigger if exists t_notif_tugas on tugas_tagih;
create trigger t_notif_tugas after insert or update of penagih_id on tugas_tagih for each row execute function notif_tugas();
