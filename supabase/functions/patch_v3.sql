-- PATCH V3: jalankan sekali di Supabase SQL Editor (aman diulang)
alter table pinjaman add column if not exists bunga_rp numeric not null default 0;
alter table pinjaman add column if not exists satuan_tenor text not null default 'bulan' check (satuan_tenor in ('hari','bulan'));
alter table pinjaman alter column bunga_persen set default 0;
alter table pinjaman alter column bunga_persen drop not null;
-- satu NIK hanya boleh terdaftar sekali per koperasi (nasabah/penagih)
create unique index if not exists uq_nik_per_koperasi on profiles(koperasi_id, nik) where role in ('nasabah','penagih');
