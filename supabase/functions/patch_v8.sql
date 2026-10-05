-- PATCH V8: sesuai gambar (hanya harian & mingguan) + biaya admin 5% yang hanya terlihat pemilik. Jalankan sekali di SQL Editor.
-- 1. Hapus tarif bulanan (tidak ada di gambar)
delete from tabel_angsuran where jenis='bulan';
create or replace function isi_tabel_angsuran(p_kop uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is not null and not (is_super() or (my_role()='admin' and my_kop()=p_kop)) then raise exception 'Tidak berwenang'; end if;
 insert into tabel_angsuran(koperasi_id,jenis,pokok,tenor,cicilan)
 select p_kop, v.j, v.p, v.t, v.c from (values
 ('hari',500000,10,62000),('hari',700000,10,87000),('hari',1000000,10,125000),('hari',1500000,10,188000),('hari',2000000,10,250000),('hari',500000,24,26000),('hari',700000,24,36500),('hari',1000000,24,52000),('hari',1500000,24,78000),('hari',2000000,24,104000),('hari',500000,30,21000),('hari',700000,30,29500),('hari',1000000,30,42000),('hari',1500000,30,63000),('hari',2000000,30,84000),('minggu',500000,1,580000),('minggu',1000000,1,1160000),('minggu',2000000,1,2320000),('minggu',500000,2,300000),('minggu',1000000,2,600000),('minggu',2000000,2,1200000),('minggu',500000,3,210000),('minggu',1000000,3,420000),('minggu',2000000,3,840000),('minggu',500000,4,155000),('minggu',1000000,4,310000),('minggu',2000000,4,620000)
 ) as v(j,p,t,c) on conflict do nothing;
end $$;

-- 2. Biaya admin dipindah ke tabel khusus (hanya admin koperasi & super admin yang bisa membaca)
create table if not exists biaya_admin(koperasi_id uuid primary key references koperasi on delete cascade, persen numeric not null default 5);
create table if not exists pinjaman_admin(pinjaman_id uuid primary key references pinjaman on delete cascade, koperasi_id uuid references koperasi, admin_rp numeric not null default 0);
alter table biaya_admin enable row level security; alter table pinjaman_admin enable row level security;
drop policy if exists ba_all on biaya_admin; drop policy if exists pa_all on pinjaman_admin;
create policy ba_all on biaya_admin for all using(is_super() or (my_role()='admin' and koperasi_id=my_kop())) with check(is_super() or (my_role()='admin' and koperasi_id=my_kop()));
create policy pa_all on pinjaman_admin for all using(is_super() or (my_role()='admin' and koperasi_id=my_kop())) with check(is_super() or (my_role()='admin' and koperasi_id=my_kop()));
insert into biaya_admin(koperasi_id, persen) select id, 5 from koperasi on conflict do nothing;
do $$ begin
 if exists(select 1 from information_schema.columns where table_name='pinjaman' and column_name='admin_rp') then
  insert into pinjaman_admin(pinjaman_id, koperasi_id, admin_rp) select id, koperasi_id, admin_rp from pinjaman where admin_rp > 0 on conflict do nothing;
 end if; end $$;
create or replace function seed_biaya_admin() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into biaya_admin(koperasi_id) values(new.id) on conflict do nothing; return new; end $$;
drop trigger if exists t_kop_admin on koperasi;
create trigger t_kop_admin after insert on koperasi for each row execute function seed_biaya_admin();

-- 3. Halaman publik tidak lagi memuat biaya admin; kolom lama dihapus
drop function if exists tarif_publik();
alter table koperasi drop column if exists admin_persen;
alter table pinjaman drop column if exists admin_rp;
create function tarif_publik() returns table(koperasi text, alamat text, telp text, jenis text, pokok numeric, tenor int, cicilan numeric)
language sql stable security definer set search_path=public as $$
 select k.nama, k.alamat, k.telp, t.jenis, t.pokok, t.tenor, t.cicilan
 from tabel_angsuran t join koperasi k on k.id=t.koperasi_id
 where k.status='approved' and t.cicilan*t.tenor >= t.pokok
 order by k.nama, t.jenis, t.pokok, t.tenor $$;
grant execute on function tarif_publik() to anon, authenticated;

select isi_tabel_angsuran(id) from koperasi;
