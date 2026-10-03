-- Jalankan di Supabase SQL Editor
create extension if not exists pgcrypto;
create type user_role as enum ('super_admin','admin','penagih','nasabah');
create type reg_status as enum ('pending','approved','rejected');

create table koperasi(id uuid primary key default gen_random_uuid(), kode_unik text unique not null,
 nama text not null, alamat text, telp text, logo_url text, sosmed text, nama_pemilik text, nik_pemilik text,
 status reg_status default 'approved', metode_bayar text[] default '{CASH,TRANSFER,QRIS}', created_at timestamptz default now());
create table profiles(id uuid primary key references auth.users on delete cascade, koperasi_id uuid references koperasi,
 role user_role not null, nama text, nik text, no_hp text, alamat text, status reg_status default 'pending',
 status_blokir boolean default false, created_at timestamptz default now());
create table nasabah_detail(id uuid primary key references profiles on delete cascade, alamat_detail jsonb, punya_usaha boolean,
 foto_ktp text, foto_usaha text, foto_muka text);
create table penagih_detail(id uuid primary key references profiles on delete cascade, punya_pengalaman boolean, pengalaman jsonb,
 area text, foto_ktp text, foto_4x6 text, cv text, ijazah text);
create table pinjaman(id uuid primary key default gen_random_uuid(), koperasi_id uuid references koperasi not null,
 nasabah_id uuid references profiles not null, pokok numeric not null, bunga_persen numeric not null, tenor int not null,
 status text default 'aktif', tgl_mulai date default current_date, created_at timestamptz default now());
create table angsuran(id uuid primary key default gen_random_uuid(), pinjaman_id uuid references pinjaman on delete cascade,
 koperasi_id uuid references koperasi, nasabah_id uuid references profiles, ke int, jatuh_tempo date, jumlah numeric,
 denda numeric default 0, status text default 'belum', penagih_id uuid references profiles, dibayar_at timestamptz);
create table pembayaran(id uuid primary key default gen_random_uuid(), angsuran_id uuid references angsuran, koperasi_id uuid references koperasi,
 nasabah_id uuid references profiles, metode text check (metode in ('CASH','TRANSFER','QRIS')), jumlah numeric, bank_id uuid,
 midtrans_order_id text, status text default 'pending', dibuat_oleh uuid references profiles, created_at timestamptz default now());
create table bank_accounts(id uuid primary key default gen_random_uuid(), koperasi_id uuid references koperasi,
 nama_bank text, no_rekening text, nama_pemilik text);
create table settings_denda(koperasi_id uuid primary key references koperasi, persen_per_hari numeric default 0.5);
create table tanggal_merah(id uuid primary key default gen_random_uuid(), koperasi_id uuid references koperasi, tanggal date, keterangan text, unique(koperasi_id,tanggal));
create table blocked_list(id uuid primary key default gen_random_uuid(), koperasi_id uuid references koperasi, tipe text check (tipe in ('NIK','HP')), nilai text, unique(tipe,nilai));
create table tugas_tagih(id uuid primary key default gen_random_uuid(), koperasi_id uuid, angsuran_id uuid unique references angsuran,
 penagih_id uuid references profiles, status text default 'baru', created_at timestamptz default now());

-- Helper RLS
create function my_role() returns user_role language sql stable security definer as $$ select role from profiles where id=auth.uid() $$;
create function my_kop() returns uuid language sql stable security definer as $$ select koperasi_id from profiles where id=auth.uid() $$;
create function is_super() returns boolean language sql stable security definer as $$ select coalesce(my_role()='super_admin',false) $$;

-- Cek kode koperasi & blokir (dipakai form registrasi, boleh anon)
create function cek_kode(p_kode text) returns uuid language sql security definer as
$$ select id from koperasi where kode_unik=upper(p_kode) and status='approved' $$;
create function cek_blokir(p_nik text,p_hp text) returns boolean language sql security definer as
$$ select exists(select 1 from blocked_list where (tipe='NIK' and nilai=p_nik) or (tipe='HP' and nilai=p_hp)) $$;
grant execute on function cek_kode, cek_blokir to anon, authenticated;

-- Kode unik acak 7 karakter
create function gen_kode() returns text language plpgsql as $$ declare k text; begin loop
 k:='KOP'||upper(substr(translate(encode(gen_random_bytes(6),'base64'),'+/=OI01',''),1,4));
 exit when length(k)=7 and not exists(select 1 from koperasi where kode_unik=k); end loop; return k; end $$;

-- Trigger: buat profil otomatis dari metadata signUp
create function on_signup() returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare m jsonb:=new.raw_user_meta_data; kid uuid; r user_role:=(m->>'role')::user_role; st reg_status:='pending'; begin
 if exists(select 1 from blocked_list where (tipe='NIK' and nilai=m->>'nik') or (tipe='HP' and nilai=m->>'no_hp')) then
   raise exception 'NIK atau No HP diblokir'; end if;
 if r='admin' then
   st:='approved'; -- koperasi baru & pemilik langsung aktif, tanpa persetujuan
   insert into koperasi(kode_unik,nama,alamat,telp,nama_pemilik,nik_pemilik,status) values(gen_kode(),m->>'nama_koperasi',m->>'alamat_koperasi',m->>'telp_koperasi',m->>'nama',m->>'nik','approved') returning id into kid;
   insert into settings_denda(koperasi_id) values(kid);
 elsif r in('nasabah','penagih') then kid:=cek_kode(m->>'kode'); if kid is null then raise exception 'Kode koperasi tidak valid'; end if;
 else raise exception 'Role tidak valid'; end if;
 insert into profiles(id,koperasi_id,role,nama,nik,no_hp,alamat,status) values(new.id,kid,r,m->>'nama',m->>'nik',m->>'no_hp',m->>'alamat',st);
 return new; end $$;
create trigger t_signup after insert on auth.users for each row execute function on_signup();

-- Denda otomatis (dipanggil Edge Function cron)
create function hitung_denda() returns int language plpgsql security definer as $$ declare n int; begin
 update angsuran a set denda=round(a.jumlah*coalesce(s.persen_per_hari,0)/100*
   (select count(*) from generate_series(a.jatuh_tempo+1,current_date,'1 day') d where not exists
    (select 1 from tanggal_merah t where t.koperasi_id=a.koperasi_id and t.tanggal=d::date)))
 from settings_denda s where s.koperasi_id=a.koperasi_id and a.status='belum' and a.jatuh_tempo<current_date;
 get diagnostics n=row_count; return n; end $$;

-- RLS
do $$ declare t text; begin foreach t in array array['koperasi','profiles','nasabah_detail','penagih_detail','pinjaman','angsuran','pembayaran','bank_accounts','settings_denda','tanggal_merah','blocked_list','tugas_tagih'] loop
 execute format('alter table %I enable row level security',t); end loop; end $$;
create policy k_all on koperasi for all using(is_super() or id=my_kop()) with check(is_super() or id=my_kop());
create policy p_self on profiles for select using(id=auth.uid() or is_super() or (my_role()='admin' and koperasi_id=my_kop()));
create policy p_adm on profiles for update using(is_super() or (my_role()='admin' and koperasi_id=my_kop()));
create policy nd_r on nasabah_detail for all using(id=auth.uid() or is_super() or (my_role()='admin' and exists(select 1 from profiles p where p.id=nasabah_detail.id and p.koperasi_id=my_kop())));
create policy pd_r on penagih_detail for all using(id=auth.uid() or is_super() or (my_role()='admin' and exists(select 1 from profiles p where p.id=penagih_detail.id and p.koperasi_id=my_kop())));
create policy pj_adm on pinjaman for all using(is_super() or (my_role()='admin' and koperasi_id=my_kop()));
create policy pj_nas on pinjaman for select using(nasabah_id=auth.uid());
create policy an_adm on angsuran for all using(is_super() or (my_role()='admin' and koperasi_id=my_kop()));
create policy an_nas on angsuran for select using(nasabah_id=auth.uid());
create policy an_pen on angsuran for select using(my_role()='penagih' and penagih_id=auth.uid());
create policy pb_adm on pembayaran for all using(is_super() or (my_role()='admin' and koperasi_id=my_kop()));
create policy pb_nas on pembayaran for select using(nasabah_id=auth.uid());
create policy pb_ins_nas on pembayaran for insert with check(nasabah_id=auth.uid() and metode in('TRANSFER','QRIS'));
create policy pb_ins_pen on pembayaran for insert with check(my_role()='penagih' and dibuat_oleh=auth.uid() and metode in('CASH','TRANSFER'));
create policy pb_pen on pembayaran for select using(dibuat_oleh=auth.uid());
create policy bk_adm on bank_accounts for all using(is_super() or (my_role()='admin' and koperasi_id=my_kop()));
create policy bk_read on bank_accounts for select using(koperasi_id=my_kop());
create policy sd_adm on settings_denda for all using(is_super() or (my_role()='admin' and koperasi_id=my_kop()));
create policy tm_adm on tanggal_merah for all using(is_super() or (my_role()='admin' and koperasi_id=my_kop()));
create policy tm_read on tanggal_merah for select using(koperasi_id=my_kop());
create policy bl_adm on blocked_list for all using(is_super() or (my_role()='admin' and koperasi_id=my_kop()));
create policy tt_adm on tugas_tagih for all using(is_super() or (my_role()='admin' and koperasi_id=my_kop()));
create policy tt_pen on tugas_tagih for select using(penagih_id=auth.uid());
create policy tt_pen_u on tugas_tagih for update using(penagih_id=auth.uid());

-- Storage buckets
insert into storage.buckets(id,name,public) values('ktp','ktp',false),('foto_usaha','foto_usaha',false),('dokumen_penagih','dokumen_penagih',false),('logo_koperasi','logo_koperasi',true) on conflict do nothing;
create policy st_up on storage.objects for insert to anon,authenticated with check(bucket_id in('ktp','foto_usaha','dokumen_penagih','logo_koperasi'));
create policy st_read on storage.objects for select to authenticated using(bucket_id in('ktp','foto_usaha','dokumen_penagih') and (is_super() or my_role()='admin') or bucket_id='logo_koperasi');

-- ============ TAMBAHAN ============
-- Index performa
create index on profiles(koperasi_id, role, status);
create index on angsuran(koperasi_id, status, jatuh_tempo);
create index on angsuran(nasabah_id);
create index on pembayaran(midtrans_order_id);
create index on tugas_tagih(penagih_id, status);

-- Admin memverifikasi pembayaran TRANSFER nasabah -> angsuran lunas
create function verifikasi_pembayaran(p_id uuid, p_terima boolean) returns void language plpgsql security definer as $$
declare b pembayaran; begin
 select * into b from pembayaran where id=p_id;
 if not (is_super() or (my_role()='admin' and b.koperasi_id=my_kop())) then raise exception 'Tidak berwenang'; end if;
 update pembayaran set status=case when p_terima then 'sukses' else 'ditolak' end where id=p_id;
 if p_terima then update angsuran set status='lunas', dibayar_at=now() where id=b.angsuran_id; end if;
end $$;

-- Dipanggil webhook Midtrans (service role) saat QRIS settlement
create function tandai_qris_lunas(p_order text) returns void language plpgsql security definer as $$
declare b pembayaran; begin
 select * into b from pembayaran where midtrans_order_id=p_order;
 if b.id is null then return; end if;
 update pembayaran set status='sukses' where id=b.id;
 update angsuran set status='lunas', dibayar_at=now() where id=b.angsuran_id;
end $$;
revoke execute on function tandai_qris_lunas from anon, authenticated;

-- Jadikan akun tertentu Super Admin (jalankan manual, ganti email)
-- update profiles set role='super_admin', status='approved', koperasi_id=null
--   where id=(select id from auth.users where email='GANTI@EMAIL.COM');

-- Cron harian 00:05 WIB (17:05 UTC) -> Edge Function cek-tunggakan
-- Aktifkan extension pg_cron & pg_net di Dashboard > Database > Extensions, lalu:
-- select cron.schedule('cek-tunggakan-harian','5 17 * * *', $$
--   select net.http_post(url:='https://PROJECT_REF.supabase.co/functions/v1/cek-tunggakan',
--     headers:=jsonb_build_object('Authorization','Bearer SERVICE_ROLE_KEY')) $$);
-- PATCH LENGKAP: jalankan sekali di Supabase SQL Editor (aman diulang)
-- 1. Penagih melihat tagihan & data nasabah lewat tugas_tagih
drop policy if exists an_pen on angsuran;
create policy an_pen on angsuran for select using (my_role()='penagih' and exists(select 1 from tugas_tagih t where t.angsuran_id=angsuran.id and t.penagih_id=auth.uid()));
drop policy if exists p_pen on profiles;
create policy p_pen on profiles for select using (my_role()='penagih' and exists(select 1 from tugas_tagih t join angsuran a on a.id=t.angsuran_id where t.penagih_id=auth.uid() and a.nasabah_id=profiles.id));

-- 2. Penagih mencatat pembayaran CASH/TRANSFER untuk tugasnya
create or replace function catat_bayar_penagih(p_angsuran uuid, p_metode text, p_bank uuid) returns void
language plpgsql security definer set search_path=public as $$
declare a angsuran; begin
 if my_role()<>'penagih' or p_metode not in ('CASH','TRANSFER') then raise exception 'Tidak berwenang'; end if;
 select * into a from angsuran where id=p_angsuran and status='belum';
 if a.id is null or not exists(select 1 from tugas_tagih where angsuran_id=a.id and penagih_id=auth.uid()) then raise exception 'Tagihan bukan tugas Anda'; end if;
 insert into pembayaran(angsuran_id,koperasi_id,nasabah_id,metode,jumlah,bank_id,status,dibuat_oleh)
  values(a.id,a.koperasi_id,a.nasabah_id,p_metode,a.jumlah+a.denda,p_bank,'sukses',auth.uid());
 update angsuran set status='lunas',dibayar_at=now() where id=a.id;
 update tugas_tagih set status='selesai' where angsuran_id=a.id;
end $$;

-- 3. Verifikasi transfer & QRIS ikut menyelesaikan tugas tagih
create or replace function verifikasi_pembayaran(p_id uuid, p_terima boolean) returns void
language plpgsql security definer set search_path=public as $$
declare b pembayaran; begin
 select * into b from pembayaran where id=p_id;
 if not (is_super() or (my_role()='admin' and b.koperasi_id=my_kop())) then raise exception 'Tidak berwenang'; end if;
 update pembayaran set status=case when p_terima then 'sukses' else 'ditolak' end where id=p_id;
 if p_terima then update angsuran set status='lunas', dibayar_at=now() where id=b.angsuran_id;
   update tugas_tagih set status='selesai' where angsuran_id=b.angsuran_id; end if;
end $$;
create or replace function tandai_qris_lunas(p_order text) returns void
language plpgsql security definer set search_path=public as $$
declare b pembayaran; begin
 select * into b from pembayaran where midtrans_order_id=p_order;
 if b.id is null then return; end if;
 update pembayaran set status='sukses' where id=b.id;
 update angsuran set status='lunas', dibayar_at=now() where id=b.angsuran_id;
 update tugas_tagih set status='selesai' where angsuran_id=b.angsuran_id;
end $$;

-- 4. Keamanan: fungsi internal hanya untuk service role (PUBLIC juga harus dicabut)
revoke execute on function tandai_qris_lunas(text) from public, anon, authenticated;
revoke execute on function hitung_denda() from public, anon, authenticated;
