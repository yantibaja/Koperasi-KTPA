-- PATCH V4: tabel angsuran (sesuai gambar tarif). Jalankan sekali di SQL Editor.
create table if not exists tabel_angsuran(id uuid primary key default gen_random_uuid(), koperasi_id uuid references koperasi on delete cascade,
 jenis text check (jenis in ('hari','bulan')), pokok numeric not null, tenor int not null, cicilan numeric not null, unique(koperasi_id,jenis,pokok,tenor));
alter table tabel_angsuran enable row level security;
drop policy if exists ta_adm on tabel_angsuran; drop policy if exists ta_read on tabel_angsuran;
create policy ta_adm on tabel_angsuran for all using(is_super() or (my_role()='admin' and koperasi_id=my_kop())) with check(is_super() or (my_role()='admin' and koperasi_id=my_kop()));
create policy ta_read on tabel_angsuran for select using(koperasi_id=my_kop());

create or replace function isi_tabel_angsuran(p_kop uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is not null and not (is_super() or (my_role()='admin' and my_kop()=p_kop)) then raise exception 'Tidak berwenang'; end if;
 insert into tabel_angsuran(koperasi_id,jenis,pokok,tenor,cicilan)
 select p_kop, v.j, v.p, v.t, v.c from (values
 ('hari',200000,24,13000),('hari',500000,24,25000),('hari',700000,24,35000),('hari',1000000,24,50000),('hari',200000,30,10000),('hari',500000,30,20000),('hari',700000,30,30000),('hari',1000000,30,40000),('hari',500000,45,15000),('hari',700000,45,20000),('hari',1000000,45,30000),('hari',700000,60,15000),('hari',1000000,60,20000),('hari',700000,70,13000),('hari',1000000,70,10000),('bulan',500000,3,200000),('bulan',1000000,3,400000),('bulan',1500000,3,600000),('bulan',2000000,3,750000),('bulan',2500000,3,950000),('bulan',3000000,3,1220000),('bulan',4000000,3,1370000),('bulan',4500000,3,1550000),('bulan',5000000,3,1720000),('bulan',500000,6,110000),('bulan',1000000,6,200000),('bulan',1500000,6,300000),('bulan',2000000,6,370000),('bulan',2500000,6,435000),('bulan',3000000,6,620000),('bulan',4000000,6,470000),('bulan',4500000,6,525000),('bulan',5000000,6,580000),('bulan',500000,9,80000),('bulan',1000000,9,140000),('bulan',1500000,9,195000),('bulan',2000000,9,250000),('bulan',2500000,9,365000),('bulan',3000000,9,420000),('bulan',4000000,9,475000),('bulan',4500000,9,530000),('bulan',5000000,9,585000),('bulan',500000,12,65000),('bulan',1000000,12,110000),('bulan',1500000,12,150000),('bulan',2000000,12,195000),('bulan',2500000,12,275000),('bulan',3000000,12,320000),('bulan',4000000,12,360000),('bulan',4500000,12,400000),('bulan',5000000,12,445000),('bulan',500000,15,55000),('bulan',1000000,15,90000),('bulan',1500000,15,125000),('bulan',2000000,15,160000),('bulan',2500000,15,225000),('bulan',3000000,15,260000),('bulan',4000000,15,290000),('bulan',4500000,15,325000),('bulan',5000000,15,360000)
 ) as v(j,p,t,c) on conflict do nothing;
end $$;

create or replace function seed_koperasi() returns trigger language plpgsql security definer set search_path=public as $$
begin perform isi_tabel_angsuran(new.id); return new; end $$;
drop trigger if exists t_kop_seed on koperasi;
create trigger t_kop_seed after insert on koperasi for each row execute function seed_koperasi();

-- isi untuk koperasi yang sudah ada
select isi_tabel_angsuran(id) from koperasi;
