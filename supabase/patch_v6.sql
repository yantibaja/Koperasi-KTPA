-- PATCH V6: hapus pinjaman & hapus nasabah. Jalankan sekali di SQL Editor (aman diulang).
-- 1. Hapus pinjaman ikut menghapus angsuran, pembayaran, dan tugas tagih terkait
alter table pembayaran drop constraint if exists pembayaran_angsuran_id_fkey;
alter table pembayaran add constraint pembayaran_angsuran_id_fkey foreign key (angsuran_id) references angsuran(id) on delete cascade;
alter table tugas_tagih drop constraint if exists tugas_tagih_angsuran_id_fkey;
alter table tugas_tagih add constraint tugas_tagih_angsuran_id_fkey foreign key (angsuran_id) references angsuran(id) on delete cascade;

-- 2. Hapus nasabah beserta seluruh datanya (hanya admin koperasi yang sama / super admin)
create or replace function hapus_nasabah(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare k uuid; begin
 select koperasi_id into k from profiles where id=p_id and role='nasabah';
 if not found then raise exception 'Nasabah tidak ditemukan'; end if;
 if not (is_super() or (my_role()='admin' and my_kop()=k)) then raise exception 'Tidak berwenang'; end if;
 delete from pembayaran where nasabah_id=p_id;
 delete from tugas_tagih where angsuran_id in (select id from angsuran where nasabah_id=p_id);
 delete from angsuran where nasabah_id=p_id;
 delete from pinjaman where nasabah_id=p_id;
 delete from auth.users where id=p_id;
end $$;
revoke execute on function hapus_nasabah(uuid) from public, anon;
grant execute on function hapus_nasabah(uuid) to authenticated;

-- 3. Admin boleh menghapus foto dokumen (dipakai saat hapus nasabah)
drop policy if exists st_del on storage.objects;
create policy st_del on storage.objects for delete to authenticated
 using (bucket_id in ('ktp','foto_usaha','dokumen_penagih') and (is_super() or my_role()='admin'));
