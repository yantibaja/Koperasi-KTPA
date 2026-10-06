-- PATCH V10: tenor tetap. Harian: 20/24/30/45 hari. Mingguan: 2/3/4/5 minggu. Yang lain dihapus.
-- Jalankan sekali di SQL Editor. Tarif ubahan manual akan diganti dengan tarif standar.
delete from tabel_angsuran;
alter table tabel_angsuran drop constraint if exists tabel_angsuran_rentang_check;
alter table tabel_angsuran drop constraint if exists tabel_angsuran_tenor_check;
alter table tabel_angsuran add constraint tabel_angsuran_tenor_check check ((jenis='hari' and tenor in (20,24,30,45)) or (jenis='minggu' and tenor in (2,3,4,5)));

create or replace function isi_tabel_angsuran(p_kop uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is not null and not (is_super() or (my_role()='admin' and my_kop()=p_kop)) then raise exception 'Tidak berwenang'; end if;
 -- harga dari daftar angsuran koperasi (24 & 30 hari, 2-4 minggu)
 insert into tabel_angsuran(koperasi_id,jenis,pokok,tenor,cicilan)
 select p_kop, v.j, v.p, v.t, v.c from (values
 ('hari',500000,24,26000),('hari',700000,24,36500),('hari',1000000,24,52000),('hari',1500000,24,78000),('hari',2000000,24,104000),
 ('hari',500000,30,21000),('hari',700000,30,29500),('hari',1000000,30,42000),('hari',1500000,30,63000),('hari',2000000,30,84000),
 ('minggu',500000,2,300000),('minggu',1000000,2,600000),('minggu',2000000,2,1200000),
 ('minggu',500000,3,210000),('minggu',1000000,3,420000),('minggu',2000000,3,840000),
 ('minggu',500000,4,155000),('minggu',1000000,4,310000),('minggu',2000000,4,620000)
 ) as v(j,p,t,c) on conflict do nothing;
 -- tenor yang belum ada di daftar dihitung: pokok x (1 + bunga total) / tenor, dibulatkan ke Rp500
 insert into tabel_angsuran(koperasi_id,jenis,pokok,tenor,cicilan)
 select p_kop,'hari',p,t,round(p*1.25/t/500)*500 from unnest(array[500000,700000,1000000,1500000,2000000]::numeric[]) p, unnest(array[20,45]) t
 union all
 select p_kop,'minggu',p,5,round(p*1.24/5/500)*500 from unnest(array[500000,1000000,2000000]::numeric[]) p
 on conflict do nothing;
end $$;
select isi_tabel_angsuran(id) from koperasi;
