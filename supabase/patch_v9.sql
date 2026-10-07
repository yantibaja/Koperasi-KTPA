-- PATCH V9: tarif baru. Harian tenor 20-45 hari, mingguan tenor 2-5 minggu. Yang lain dihapus. Jalankan sekali di SQL Editor.
-- Cicilan dihitung otomatis: pokok x (1 + bunga total) / tenor, dibulatkan ke Rp500
-- Bunga total awal: harian 25%, mingguan 24% (ubah di Pengaturan -> Tabel angsuran -> Hitung ulang)
delete from tabel_angsuran;
alter table tabel_angsuran drop constraint if exists tabel_angsuran_rentang_check;
alter table tabel_angsuran add constraint tabel_angsuran_rentang_check check ((jenis='hari' and tenor between 20 and 45) or (jenis='minggu' and tenor between 2 and 5));
create or replace function isi_tabel_angsuran(p_kop uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is not null and not (is_super() or (my_role()='admin' and my_kop()=p_kop)) then raise exception 'Tidak berwenang'; end if;
 insert into tabel_angsuran(koperasi_id,jenis,pokok,tenor,cicilan)
 select p_kop,'hari',p,t,round(p*1.25/t/500)*500 from unnest(array[500000,700000,1000000,1500000,2000000]::numeric[]) p, generate_series(20,45) t
 union all
 select p_kop,'minggu',p,t,round(p*1.24/t/500)*500 from unnest(array[500000,1000000,2000000]::numeric[]) p, generate_series(2,5) t
 on conflict do nothing;
end $$;
select isi_tabel_angsuran(id) from koperasi;
