-- PATCH V7: tarif baru (harian 10/24/30 hari, mingguan 1-4 minggu) + biaya admin. Jalankan sekali di SQL Editor.
alter table tabel_angsuran drop constraint if exists tabel_angsuran_jenis_check;
alter table tabel_angsuran add constraint tabel_angsuran_jenis_check check (jenis in ('hari','minggu','bulan'));
alter table pinjaman drop constraint if exists pinjaman_satuan_tenor_check;
alter table pinjaman add constraint pinjaman_satuan_tenor_check check (satuan_tenor in ('hari','minggu','bulan'));
alter table koperasi add column if not exists admin_persen numeric not null default 0;  -- 0 = tanpa biaya admin
alter table pinjaman add column if not exists admin_rp numeric not null default 0;

-- ganti tarif harian lama dengan yang baru
delete from tabel_angsuran where jenis='hari';

create or replace function isi_tabel_angsuran(p_kop uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is not null and not (is_super() or (my_role()='admin' and my_kop()=p_kop)) then raise exception 'Tidak berwenang'; end if;
 insert into tabel_angsuran(koperasi_id,jenis,pokok,tenor,cicilan)
 select p_kop, v.j, v.p, v.t, v.c from (values
 ('hari',500000,10,62000),('hari',700000,10,87000),('hari',1000000,10,125000),('hari',1500000,10,188000),('hari',2000000,10,250000),('hari',500000,24,26000),('hari',700000,24,36500),('hari',1000000,24,52000),('hari',1500000,24,78000),('hari',2000000,24,104000),('hari',500000,30,21000),('hari',700000,30,29500),('hari',1000000,30,42000),('hari',1500000,30,63000),('hari',2000000,30,84000),('minggu',500000,1,580000),('minggu',1000000,1,1160000),('minggu',2000000,1,2320000),('minggu',500000,2,300000),('minggu',1000000,2,600000),('minggu',2000000,2,1200000),('minggu',500000,3,210000),('minggu',1000000,3,420000),('minggu',2000000,3,840000),('minggu',500000,4,155000),('minggu',1000000,4,310000),('minggu',2000000,4,620000),('bulan',500000,3,200000),('bulan',1000000,3,400000),('bulan',1500000,3,600000),('bulan',2000000,3,750000),('bulan',2500000,3,950000),('bulan',3000000,3,1220000),('bulan',4000000,3,1370000),('bulan',4500000,3,1550000),('bulan',5000000,3,1720000),('bulan',500000,6,110000),('bulan',1000000,6,200000),('bulan',1500000,6,300000),('bulan',2000000,6,370000),('bulan',2500000,6,435000),('bulan',3000000,6,620000),('bulan',4000000,6,470000),('bulan',4500000,6,525000),('bulan',5000000,6,580000),('bulan',500000,9,80000),('bulan',1000000,9,140000),('bulan',1500000,9,195000),('bulan',2000000,9,250000),('bulan',2500000,9,365000),('bulan',3000000,9,420000),('bulan',4000000,9,475000),('bulan',4500000,9,530000),('bulan',5000000,9,585000),('bulan',500000,12,65000),('bulan',1000000,12,110000),('bulan',1500000,12,150000),('bulan',2000000,12,195000),('bulan',2500000,12,275000),('bulan',3000000,12,320000),('bulan',4000000,12,360000),('bulan',4500000,12,400000),('bulan',5000000,12,445000),('bulan',500000,15,55000),('bulan',1000000,15,90000),('bulan',1500000,15,125000),('bulan',2000000,15,160000),('bulan',2500000,15,225000),('bulan',3000000,15,260000),('bulan',4000000,15,290000),('bulan',4500000,15,325000),('bulan',5000000,15,360000)
 ) as v(j,p,t,c) on conflict do nothing;
end $$;

drop function if exists tarif_publik();
create function tarif_publik() returns table(koperasi text, alamat text, telp text, jenis text, pokok numeric, tenor int, cicilan numeric, admin_persen numeric)
language sql stable security definer set search_path=public as $$
 select k.nama, k.alamat, k.telp, t.jenis, t.pokok, t.tenor, t.cicilan, k.admin_persen
 from tabel_angsuran t join koperasi k on k.id=t.koperasi_id
 where k.status='approved' and t.cicilan*t.tenor >= t.pokok
 order by k.nama, t.jenis, t.pokok, t.tenor $$;
grant execute on function tarif_publik() to anon, authenticated;

select isi_tabel_angsuran(id) from koperasi;
