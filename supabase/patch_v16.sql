-- PATCH V16: QRIS dengan gambar yang diunggah pemilik (tanpa Midtrans) + teks notifikasi umum. Jalankan sekali di SQL Editor (aman diulang).
alter table koperasi add column if not exists qris_url text;
alter table koperasi add column if not exists qris_mode text not null default 'upload';
alter table koperasi drop constraint if exists koperasi_qris_mode_check;
alter table koperasi add constraint koperasi_qris_mode_check check (qris_mode in ('upload','midtrans'));

-- Teks notifikasi pembayaran (umum)
create or replace function notif_pembayaran() returns trigger language plpgsql security definer set search_path=public as $$
declare nm text; ke int; rpf text;
begin
 begin
  select nama into nm from profiles where id=new.nasabah_id;
  select a.ke into ke from angsuran a where a.id=new.angsuran_id;
  rpf := 'Rp ' || replace(to_char(new.jumlah,'FM999,999,999,999'),',','.');
  if tg_op='INSERT' and new.status='menunggu_verifikasi' then
   if new.nasabah_id is not null then insert into notifikasi(user_id,judul,isi,tipe,tautan) values (new.nasabah_id,'Bukti terkirim 🎉','Bukti pembayaran '||rpf||' sedang diperiksa admin.','info','/pembayaran'); end if;
   insert into notifikasi(user_id,judul,isi,tipe,tautan) select id,'Pembayaran menunggu verifikasi',coalesce(nm,'Nasabah')||' mengirim bukti pembayaran '||rpf,'peringatan','/pembayaran' from profiles where koperasi_id=new.koperasi_id and role='admin' and status='approved';
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
    insert into notifikasi(user_id,judul,isi,tipe,tautan) values (new.nasabah_id,'Bukti pembayaran ditolak','Bukti pembayaran '||rpf||' tidak diterima. Silakan kirim ulang atau hubungi koperasi.','gagal','/pembayaran');
   elsif new.status='gagal' and new.nasabah_id is not null then
    insert into notifikasi(user_id,judul,isi,tipe,tautan) values (new.nasabah_id,'Pembayaran tidak selesai','Pembayaran '||rpf||' kedaluwarsa atau dibatalkan. Silakan coba lagi.','peringatan','/pembayaran');
   end if;
  end if;
 exception when others then raise warning 'notif_pembayaran: %', sqlerrm;
 end;
 return new;
end $$;
