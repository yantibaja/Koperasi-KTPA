-- PATCH V17: Hari Minggu dan tanggal merah libur: tidak ada jatuh tempo dan tidak ada transaksi. Jalankan sekali di SQL Editor (aman diulang).
-- Zona waktu aturan harian: WITA (Asia/Makassar).

-- 1. Hari kerja berikutnya (lewati Minggu dan tanggal merah koperasi)
create or replace function hari_berikut_valid(p_kop uuid, d date) returns date language plpgsql stable set search_path=public as $$
declare x date := d; n int := 0;
begin
 while (extract(dow from x)=0 or exists(select 1 from tanggal_merah where koperasi_id=p_kop and tanggal=x)) and n<400 loop x := x+1; n := n+1; end loop;
 return x;
end $$;

-- 2. Geser jatuh tempo angsuran yang belum dibayar (mulai hari ini) ke hari kerja.
--    Harian: berurutan satu per hari kerja. Mingguan/bulanan: tiap angsuran digeser ke hari kerja berikutnya.
create or replace function geser_jatuh_tempo(p_kop uuid) returns void language plpgsql security definer set search_path=public as $$
declare hari date := (now() at time zone 'Asia/Makassar')::date; pj record; a record; prev date; nd date;
begin
 for pj in select id, satuan_tenor from pinjaman where koperasi_id=p_kop and status<>'batal' loop
  prev := null;
  for a in select id, jatuh_tempo from angsuran where pinjaman_id=pj.id and status='belum' and jatuh_tempo>=hari order by ke loop
   nd := hari_berikut_valid(p_kop, case when pj.satuan_tenor='hari' and prev is not null then prev+1 else a.jatuh_tempo end);
   if nd<>a.jatuh_tempo then update angsuran set jatuh_tempo=nd where id=a.id; end if;
   prev := nd;
  end loop;
 end loop;
end $$;
revoke execute on function geser_jatuh_tempo(uuid) from public, anon, authenticated;

-- 3. Saat tanggal merah ditambah atau dihapus, jadwal otomatis disesuaikan
create or replace function trg_geser() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='DELETE' then perform geser_jatuh_tempo(old.koperasi_id); else perform geser_jatuh_tempo(new.koperasi_id); end if;
 return null;
end $$;
drop trigger if exists t_geser on tanggal_merah;
create trigger t_geser after insert or delete on tanggal_merah for each row execute function trg_geser();

-- 4. Tidak ada transaksi (pembayaran baru dan pinjaman baru) pada hari libur. Super Admin dan proses server dikecualikan.
create or replace function blok_libur() returns trigger language plpgsql set search_path=public as $$
declare hari date := (now() at time zone 'Asia/Makassar')::date; ket text; ada boolean;
begin
 if auth.uid() is null or my_role()='super_admin' then return new; end if;
 if extract(dow from hari)=0 then raise exception 'Hari Minggu libur: tidak ada transaksi. Silakan coba besok.'; end if;
 select keterangan, true into ket, ada from tanggal_merah where koperasi_id=new.koperasi_id and tanggal=hari limit 1;
 if ada then raise exception 'Hari ini libur (%): tidak ada transaksi. Silakan coba besok.', coalesce(ket,'tanggal merah'); end if;
 return new;
end $$;
drop trigger if exists t_blok_libur_bayar on pembayaran;
create trigger t_blok_libur_bayar before insert on pembayaran for each row execute function blok_libur();
drop trigger if exists t_blok_libur_pinjaman on pinjaman;
create trigger t_blok_libur_pinjaman before insert on pinjaman for each row execute function blok_libur();

-- 5. Denda tidak dihitung pada hari Minggu dan tanggal merah
create or replace function hitung_denda() returns int language plpgsql security definer set search_path=public as $$
declare n int; hari date := (now() at time zone 'Asia/Makassar')::date;
begin
 update angsuran a set denda=round(a.jumlah*coalesce(s.persen_per_hari,0)/100*
   (select count(*) from generate_series(a.jatuh_tempo+1,hari,'1 day') d where extract(dow from d)<>0 and not exists
    (select 1 from tanggal_merah t where t.koperasi_id=a.koperasi_id and t.tanggal=d::date)))
 from settings_denda s where s.koperasi_id=a.koperasi_id and a.status='belum' and a.jatuh_tempo<hari;
 get diagnostics n=row_count; return n;
end $$;

-- 6. Rapikan jadwal yang sudah ada (jatuh tempo hari Minggu/tanggal merah digeser maju)
select geser_jatuh_tempo(id) from koperasi;
