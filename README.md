# 🏦 Koperasi Harian (Koperasi Tri Putra Abadi)

Aplikasi manajemen koperasi simpan pinjam: pinjaman harian & bulanan, tagihan, pembayaran QRIS (Midtrans), penagihan WhatsApp, dan aplikasi yang bisa dipasang di HP (PWA).

**Teknologi:** React + Vite + TailwindCSS · Supabase (Auth, Database, Storage, Edge Functions) · Midtrans QRIS · GitHub Pages.
**Alamat:** https://yantibaja.github.io/Koperasi-KTPA/ · Halaman publik harga: `/#/produk`

---
## 1. Role dan akses
| Role | Akses |
|---|---|
| Super Admin | Semua koperasi, aktif/nonaktifkan koperasi, daftar blokir NIK/No HP |
| Admin Koperasi | Penuh untuk koperasinya (daftar langsung aktif, tanpa persetujuan) |
| Penagih | Tugas tagih yang ditugaskan; bayar CASH & TRANSFER; tambah nasabah (menunggu persetujuan admin) |
| Nasabah | Pinjaman & tagihan sendiri; bayar TRANSFER & QRIS |

Nasabah dan penagih mendaftar dengan **kode koperasi**, lalu admin mengecek data dan foto di menu **Persetujuan**.

## 2. Fitur
- Pendaftaran dengan validasi (NIK 16 digit angka, huruf/angka dipisah), foto dikompres otomatis
- Pinjaman memakai **tabel angsuran** (harian 20-45 hari, mingguan 2-5 minggu), bisa diedit admin; edit/hapus pinjaman, status Aktif/Lunas/Batal
- Pembayaran: QRIS (otomatis lunas lewat webhook), transfer (diverifikasi admin), tunai (penagih)
- Denda otomatis harian, tanggal merah, tugas tagih otomatis (cron)
- Pesan WhatsApp: template promo/sapaan/pengingat/terima kasih + tabel angsuran, tagih via WA
- Hapus nasabah (beserta data & foto), blokir NIK/No HP
- Halaman publik Produk & Harga (untuk verifikasi Midtrans)
- Bisa dipasang sebagai aplikasi (PWA), tampilan layar penuh

## 3. Struktur folder
```
Koperasi-KTPA/
├── .github/workflows/deploy.yml
├── .gitignore · .env.example · README.md
├── index.html · package.json · vite.config.js
├── tailwind.config.js · postcss.config.js
├── public/
│   ├── logo.png · bukti-bg.png · icon-192.png · icon-512.png · icon-maskable-512.png
│   ├── manifest.webmanifest · sw.js
├── supabase/
│   ├── schema.sql  (skema lengkap + patch awal)
│   ├── patch_lengkap.sql · patch_v3.sql · patch_v4.sql · patch_v5.sql · patch_v6.sql
│   ├── config.toml
│   └── functions/ create-qris · cek-tunggakan · midtrans-webhook  (index.ts)
└── src/
    ├── main.jsx · App.jsx · index.css
    ├── components/ FormDaftar · TabelAngsuran · InstallButton
    ├── lib/ supabase.js · auth · utils · Foto · toast · confirm · tempClient
    └── pages/ Login · Register · Produk · Dashboard · Nasabah · TambahNasabah · Bukti
              Pinjaman · Pembayaran · Tim · Approval · PesanWA · Pengaturan · Koperasi
```
**Jangan ditimpa:** `src/lib/supabase.js` (berisi URL & anon key Anda), `vite.config.js` (cek `base`), `.github/workflows/deploy.yml` (versi tanpa `cache: npm`).

## 4. Pemasangan dari nol
### A. Database (Supabase → SQL Editor), urut:
1. `schema.sql`
2. `patch_v3.sql` (bunga Rupiah, tenor hari/bulan, NIK unik)
3. `patch_v4.sql` (tabel angsuran + isi tarif standar)
4. `patch_v5.sql` (data publik halaman harga)
5. `patch_v6.sql` (hapus pinjaman & nasabah)
6. `patch_v8.sql` (biaya admin khusus pemilik; berdiri sendiri, patch_v7 tidak perlu)
7. `patch_v9.sql` (tarif: harian tenor 20-45 hari, mingguan 2-5 minggu)

Jika database sudah berjalan, jalankan hanya patch yang belum pernah dijalankan. `patch_lengkap.sql` sudah ada di bagian bawah `schema.sql`.

### B. Pengaturan Auth
Authentication → Providers → Email: **Enable signups** nyala, **Confirm email** mati (login No HP memakai email sintetis `nohp@hp.koperasi.app`).

### C. Super Admin
Daftar dulu lewat "Koperasi Baru", lalu jalankan (ganti email):
```sql
update profiles set role='super_admin', status='approved', koperasi_id=null
where id=(select id from auth.users where email='GANTI@EMAIL.COM');
```

### D. Edge Functions (Supabase → Edge Functions → Deploy new function → Via Editor)
| Nama persis | Isi dari | Verify JWT |
|---|---|---|
| `create-qris` | `functions/create-qris/index.ts` | Nyala |
| `cek-tunggakan` | `functions/cek-tunggakan/index.ts` | Nyala |
| `midtrans-webhook` | `functions/midtrans-webhook/index.ts` | **Mati** |

Folder `supabase/functions` di GitHub hanya arsip; yang aktif adalah yang ditempel di dashboard Supabase.

### E. Secrets Midtrans (Edge Functions → Secrets)
| Nama | Isi | Dari |
|---|---|---|
| `MIDTRANS_SERVER_KEY` | Server Key (Sandbox `SB-Mid-server-…`) | Midtrans → Settings → Access Keys |
| `MIDTRANS_PROD` | `false` (Sandbox) / `true` (produksi) | Anda tentukan |

Key dan mode harus sepasang. Simpan hanya di Supabase Secrets, jangan di GitHub.

### F. Midtrans Dashboard
1. Aktifkan **QRIS** (Settings → Payment).
2. Payment Notification URL: `https://gdwtnwsmiykobbfkfqae.supabase.co/functions/v1/midtrans-webhook`
3. Business Website: `https://yantibaja.github.io/Koperasi-KTPA/#/produk`

### G. Cron cek tunggakan harian
Aktifkan `pg_cron` dan `pg_net` (Database → Extensions), lalu jalankan blok cron di bawah `schema.sql` (isi `PROJECT_REF` dan service role key). Tes manual: **Kelola Tim → Cek tunggakan sekarang**.

### H. GitHub Pages
1. `vite.config.js`: `base: '/Koperasi-KTPA/'`
2. Settings → Pages → Source: **GitHub Actions**
3. Commit file; tab Actions harus hijau, lalu Pages → **Visit site**

## 5. Pasang sebagai aplikasi (PWA)
Buka situs di Chrome → tombol **📲 Pasang aplikasi** (atau ⋮ → Instal aplikasi). Hapus pintasan lama dulu. iPhone: Safari → Bagikan → Tambah ke Layar Utama.

## 6. Domain sendiri (opsional)
DNS: CNAME `app` → `yantibaja.github.io` (atau 4 catatan A GitHub Pages untuk domain utama). GitHub → Settings → Pages → Custom domain. **Ubah `base` di `vite.config.js` menjadi `'/'`** atau layar akan putih.

## 7. Alur uji coba
1. Admin daftar → Pengaturan: catat kode koperasi, isi rekening, denda, tanggal merah, cek Tabel angsuran.
2. Nasabah/penagih daftar dengan kode → admin setujui di Persetujuan.
3. Admin: Pinjaman → pilih nasabah, jenis, jumlah, tenor.
4. Nasabah: Pembayaran → QRIS (lunas otomatis) atau Transfer (admin verifikasi).
5. Tunggakan: Kelola Tim → tugaskan ke penagih → penagih mencatat bayar.
6. Pesan WA: tagih terlambat dan broadcast marketing.

## 8. Masalah umum
| Gejala | Solusi |
|---|---|
| Layar putih | `base` tidak cocok dengan alamat, atau Pages Source bukan GitHub Actions |
| Registrasi gagal/lama | Cek Logs → Auth; pastikan `supabase.js` benar & Confirm email mati |
| "Failed to send a request to the Edge Function" | Function belum di-deploy / nama salah / kode lama |
| QRIS error "unauthorized" | Server Key salah atau tidak sepasang dengan `MIDTRANS_PROD` |
| QRIS dibayar tapi belum lunas | Webhook belum dipasang, Verify JWT belum mati, atau URL notifikasi salah |
| Pinjaman gagal disimpan/hapus | Jalankan patch SQL yang belum dijalankan |
| Tabel harga publik kosong | Jalankan `patch_v5.sql`; tarif yang total bayarnya < pokok disembunyikan |
| Tombol "Pasang aplikasi" tidak muncul | Gunakan Chrome (HTTPS), hapus pintasan lama, muat ulang 2x |

## 9. Biaya admin
Biaya admin (default 5%) diatur di Pengaturan dan hanya terlihat admin koperasi/pemilik. Penagih dan nasabah hanya melihat angsuran; datanya disimpan di tabel terpisah dengan akses khusus admin.

## 10. Riwayat pembaruan
| Versi | Isi |
|---|---|
| Awal | Skema, role, pendaftaran, pinjaman, pembayaran |
| Lengkap | Webhook Midtrans, verifikasi transfer, tugas tagih, kelola koperasi |
| v3 | Validasi form, UI & toast baru, bunga Rupiah, tenor hari/bulan, form tambah nasabah |
| v4 | Tabel angsuran (editable), perbaikan pesan error QRIS |
| v5 | Halaman publik Produk & Harga |
| v6 | Edit/hapus pinjaman, hapus nasabah, Pesan WA baru |
| v7 | PWA (bisa dipasang) |
| v8 | Tarif baru: harian 10/24/30 hari, mingguan 1-4 minggu, pengaturan biaya admin (`patch_v7.sql`) |
| v9 | Hanya harian & mingguan (bulanan dihapus); biaya admin 5% hanya terlihat pemilik (`patch_v8.sql`) |
| v11 | Versi 2.0: tampilan baru (Gen Z), bottom nav, animasi, pembaruan otomatis; tarif harian 20-45 hari & mingguan 2-5 minggu (`patch_v9.sql`) |
| v10 | Bukti Penerimaan Pinjaman (cetak, terisi otomatis atau kosong); SQL v8 diperbaiki |

## 11. Batasan
Nasabah/penagih dibuat lewat pendaftaran mandiri atau form tambah nasabah; penagih tidak dihapus permanen (hanya dinonaktifkan); penugasan tagih per area masih manual. Edit data nasabah masih memakai dialog bawaan browser.

## Versi 2.1 (tampilan baru)
Jalankan `supabase/patch_v9.sql` (tenor harian 20-45 hari, mingguan 2-5 minggu; selain itu dihapus). Tampilan baru bergaya Gen Z: gradien, kartu kaca, navigasi bawah di HP, animasi halaman, hitung naik di dashboard, mode gelap, dan banner "Versi baru tersedia" untuk pembaruan otomatis.

## Tenor tetap (patch_v10)
Harian 20/24/30/45 hari, mingguan 2/3/4/5 minggu. Jalankan `supabase/patch_v10.sql`; tenor lain ditolak database.

## Pembayaran lebih sederhana (patch_v11)
Pilih tagihan, pilih cara bayar (QRIS / Transfer / Tunai), lalu untuk transfer wajib unggah bukti. Jalankan `supabase/patch_v11.sql` (membuat bucket `bukti_transfer`). Admin melihat foto bukti saat memverifikasi.

## Tarif sesuai foto + Fee (patch_v12)
Harian 20/24/30/45 hari, mingguan 3/4/5 minggu. Fee per tenor (khusus pemilik) di Pengaturan. Tes koneksi Midtrans di Pengaturan (deploy function `midtrans-cek`). Jalankan `supabase/patch_v12.sql`.

## Notifikasi (patch_v13)
Ikon 🔔 di aplikasi menampilkan notifikasi (pembayaran berhasil/ditolak, transfer baru untuk admin, tugas tagih baru untuk penagih). Jalankan `supabase/patch_v13.sql`. Notifikasi muncul seketika (Realtime) dan tersimpan sebagai riwayat.

## Versi 2.2: tampilan baru + Absensi (patch_v14)
Beranda dengan kartu utama dan menu cepat, bar bawah tetap tampil di semua halaman (menu lain lewat "Lainnya"). Absensi foto berwatermark (jam, lokasi, nama, koperasi, peta) wajib untuk penagih dan pemilik. Jalankan `supabase/patch_v14.sql`.

## Absensi wajib & tampilan baru (patch_v14)
Penagih dan pemilik wajib absen masuk setiap hari lewat kamera dengan watermark (jam, lokasi, nama, nama koperasi, peta). Jalankan `supabase/patch_v14.sql`. Navigasi bawah baru dengan menu "Lainnya" yang memuat semua menu termasuk Pengaturan.

## Versi 2.2: tampilan fintech + Absensi (patch_v14)
- Beranda bergaya aplikasi koperasi/fintech: kartu hero, menu cepat, navigasi bawah tetap, menu "Semua menu" berupa lembar dari bawah.
- Absensi wajib masuk untuk pemilik & penagih: kamera langsung terbuka dengan watermark (jam, tanggal, alamat, nama, koperasi, kode foto, peta). Jalankan `supabase/patch_v14.sql`.

## Absensi lengkap (patch_v15)
Jenis: Absen Masuk, Nasabah Baru, Peminjam Baru, Istirahat, Selesai Istirahat, Absen Pulang. Semua lewat kamera dengan watermark. Jalankan `supabase/patch_v15.sql` (setelah patch_v14).
