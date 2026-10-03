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
