-- PATCH V11: bukti transfer wajib diunggah. Jalankan sekali di SQL Editor (aman diulang).
insert into storage.buckets(id,name,public) values('bukti_transfer','bukti_transfer',false) on conflict do nothing;
drop policy if exists bt_ins on storage.objects;
create policy bt_ins on storage.objects for insert to authenticated with check (bucket_id='bukti_transfer');
drop policy if exists bt_sel on storage.objects;
create policy bt_sel on storage.objects for select to authenticated using (bucket_id='bukti_transfer' and ((storage.foldername(name))[1]=auth.uid()::text or is_super() or my_role()='admin'));
drop policy if exists bt_del on storage.objects;
create policy bt_del on storage.objects for delete to authenticated using (bucket_id='bukti_transfer' and (is_super() or my_role()='admin'));

alter table pembayaran add column if not exists bukti_url text;
-- transfer baru wajib punya bukti (data lama tidak terpengaruh)
alter table pembayaran drop constraint if exists pembayaran_bukti_transfer_check;
alter table pembayaran add constraint pembayaran_bukti_transfer_check check (metode <> 'TRANSFER' or bukti_url is not null) not valid;

-- penagih: transfer wajib melampirkan bukti
drop function if exists catat_bayar_penagih(uuid, text, uuid);
create or replace function catat_bayar_penagih(p_angsuran uuid, p_metode text, p_bank uuid, p_bukti text default null) returns void
language plpgsql security definer set search_path=public as $$
declare a angsuran; begin
 if my_role()<>'penagih' or p_metode not in ('CASH','TRANSFER') then raise exception 'Tidak berwenang'; end if;
 if p_metode='TRANSFER' and p_bukti is null then raise exception 'Bukti transfer wajib diunggah'; end if;
 select * into a from angsuran where id=p_angsuran and status='belum';
 if a.id is null or not exists(select 1 from tugas_tagih where angsuran_id=a.id and penagih_id=auth.uid()) then raise exception 'Tagihan bukan tugas Anda'; end if;
 insert into pembayaran(angsuran_id,koperasi_id,nasabah_id,metode,jumlah,bank_id,status,dibuat_oleh,bukti_url)
  values(a.id,a.koperasi_id,a.nasabah_id,p_metode,a.jumlah+a.denda,p_bank,'sukses',auth.uid(),p_bukti);
 update angsuran set status='lunas',dibayar_at=now() where id=a.id;
 update tugas_tagih set status='selesai' where angsuran_id=a.id;
end $$;
