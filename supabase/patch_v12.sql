-- PATCH V12: tabel angsuran sesuai foto + Fee per tenor (khusus pemilik). Jalankan seluruhnya sekali di SQL Editor.
-- 1. Tenor: harian 20/24/30/45 hari, mingguan 3/4/5 minggu
alter table tabel_angsuran drop constraint if exists tabel_angsuran_rentang_check;
alter table tabel_angsuran drop constraint if exists tabel_angsuran_tenor_check;
delete from tabel_angsuran;
alter table tabel_angsuran add constraint tabel_angsuran_tenor_check check ((jenis='hari' and tenor in (20,24,30,45)) or (jenis='minggu' and tenor in (3,4,5)));

create or replace function isi_tabel_angsuran(p_kop uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is not null and not (is_super() or (my_role()='admin' and my_kop()=p_kop)) then raise exception 'Tidak berwenang'; end if;
 insert into tabel_angsuran(koperasi_id,jenis,pokok,tenor,cicilan)
 select p_kop, v.j, v.p, v.t, v.c from (values
 ('hari',250000,20,15000),('hari',250000,24,12000),('hari',250000,30,10000),('hari',500000,20,28000),('hari',500000,24,25000),('hari',500000,30,20000),('hari',500000,45,15000),('hari',700000,20,45000),('hari',700000,24,20000),('hari',700000,30,30000),('hari',700000,45,20000),('hari',1000000,20,65000),('hari',1000000,24,15000),('hari',1000000,30,40000),('hari',1000000,45,25000),('minggu',500000,3,210000),('minggu',500000,4,160000),('minggu',500000,5,125000),('minggu',750000,3,300000),('minggu',750000,4,240000),('minggu',750000,5,200000),('minggu',1000000,3,385000),('minggu',1000000,4,300000),('minggu',1000000,5,250000),('minggu',1500000,3,550000),('minggu',1500000,4,425000),('minggu',1500000,5,350000),('minggu',2000000,3,720000),('minggu',2000000,4,550000),('minggu',2000000,5,450000)
 ) as v(j,p,t,c) on conflict do nothing;
end $$;

-- 2. Fee per tenor: hanya admin koperasi/pemilik & super admin yang bisa membaca
create table if not exists fee_tenor(koperasi_id uuid references koperasi on delete cascade, jenis text check (jenis in ('hari','minggu')), tenor int, fee_rp numeric not null default 0, primary key(koperasi_id,jenis,tenor));
alter table fee_tenor enable row level security;
drop policy if exists fee_all on fee_tenor;
create policy fee_all on fee_tenor for all using(is_super() or (my_role()='admin' and koperasi_id=my_kop())) with check(is_super() or (my_role()='admin' and koperasi_id=my_kop()));

create or replace function seed_fee_tenor(p_kop uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 insert into fee_tenor(koperasi_id,jenis,tenor,fee_rp) values
 (p_kop,'hari',20,150000),(p_kop,'hari',24,200000),(p_kop,'hari',30,250000),(p_kop,'hari',45,300000),
 (p_kop,'minggu',3,150000),(p_kop,'minggu',4,200000),(p_kop,'minggu',5,250000) on conflict do nothing;
end $$;
revoke execute on function seed_fee_tenor(uuid) from public, anon, authenticated;
create or replace function seed_fee_trigger() returns trigger language plpgsql security definer set search_path=public as $$
begin perform seed_fee_tenor(new.id); return new; end $$;
drop trigger if exists t_kop_fee on koperasi;
create trigger t_kop_fee after insert on koperasi for each row execute function seed_fee_trigger();

select isi_tabel_angsuran(id) from koperasi;
select seed_fee_tenor(id) from koperasi;
