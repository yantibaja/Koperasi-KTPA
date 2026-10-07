-- PATCH V5: data publik untuk halaman Produk & Harga (bisa dibuka tanpa login)
create or replace function tarif_publik() returns table(koperasi text, alamat text, telp text, jenis text, pokok numeric, tenor int, cicilan numeric)
language sql stable security definer set search_path=public as $$
 select k.nama, k.alamat, k.telp, t.jenis, t.pokok, t.tenor, t.cicilan
 from tabel_angsuran t join koperasi k on k.id=t.koperasi_id
 where k.status='approved' and t.cicilan*t.tenor >= t.pokok
 order by k.nama, t.jenis, t.pokok, t.tenor $$;
grant execute on function tarif_publik() to anon, authenticated;
