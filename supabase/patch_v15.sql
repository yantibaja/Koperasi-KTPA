-- PATCH V15: jenis absensi lengkap: masuk, nasabah baru, peminjam baru, istirahat, selesai istirahat, pulang. Jalankan sekali di SQL Editor (aman diulang). Syarat: patch_v14.sql sudah dijalankan.
alter table absensi drop constraint if exists absensi_tipe_check;
alter table absensi add constraint absensi_tipe_check check (tipe in ('masuk','nasabah_baru','pinjaman_baru','istirahat','selesai_istirahat','pulang'));
alter table absensi add column if not exists catatan text;  -- nama nasabah/peminjam baru

-- Aturan urutan hari itu (zona waktu WITA / Asia/Makassar)
create or replace function absensi_urutan() returns trigger language plpgsql as $$
declare hari date := (now() at time zone 'Asia/Makassar')::date; ada_masuk boolean; ada_pulang boolean; terakhir text;
begin
 select exists(select 1 from absensi where user_id=new.user_id and tipe='masuk' and (waktu at time zone 'Asia/Makassar')::date=hari),
        exists(select 1 from absensi where user_id=new.user_id and tipe='pulang' and (waktu at time zone 'Asia/Makassar')::date=hari)
   into ada_masuk, ada_pulang;
 select tipe into terakhir from absensi where user_id=new.user_id and tipe in ('istirahat','selesai_istirahat') and (waktu at time zone 'Asia/Makassar')::date=hari order by waktu desc limit 1;
 if new.tipe='masuk' and ada_masuk then raise exception 'Anda sudah absen masuk hari ini'; end if;
 if new.tipe<>'masuk' and not ada_masuk then raise exception 'Absen masuk dulu'; end if;
 if new.tipe<>'masuk' and ada_pulang then raise exception 'Anda sudah absen pulang hari ini'; end if;
 if new.tipe='istirahat' and terakhir='istirahat' then raise exception 'Selesaikan istirahat dulu'; end if;
 if new.tipe='selesai_istirahat' and coalesce(terakhir,'')<>'istirahat' then raise exception 'Anda belum istirahat'; end if;
 if new.tipe='pulang' and terakhir='istirahat' then raise exception 'Selesai istirahat dulu sebelum pulang'; end if;
 return new;
end $$;
drop trigger if exists t_absensi_urutan on absensi;
create trigger t_absensi_urutan before insert on absensi for each row execute function absensi_urutan();

-- Notifikasi untuk pemilik (istirahat tidak dinotifikasikan agar tidak ramai)
create or replace function notif_absensi() returns trigger language plpgsql security definer set search_path=public as $$
declare nm text; aksi text;
begin
 if new.tipe in ('istirahat','selesai_istirahat') then return new; end if;
 begin
  select nama into nm from profiles where id=new.user_id;
  aksi := case new.tipe when 'masuk' then 'absen masuk' when 'pulang' then 'absen pulang'
    when 'nasabah_baru' then 'mendapat nasabah baru'||coalesce(' ('||new.catatan||')','')
    when 'pinjaman_baru' then 'mendapat peminjam baru'||coalesce(' ('||new.catatan||')','') else new.tipe end;
  insert into notifikasi(user_id,judul,isi,tipe,tautan)
   select id, 'Absensi 📸', coalesce(nm,'Petugas')||' '||aksi||' di '||coalesce(new.alamat,'lokasi tidak diketahui'), 'info', '/absensi'
   from profiles where koperasi_id=new.koperasi_id and role='admin' and status='approved' and id<>new.user_id;
 exception when others then raise warning 'notif_absensi: %', sqlerrm;
 end;
 return new;
end $$;
