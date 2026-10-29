# Koperasi Harian (Koperasi Tri Putra Abadi)

Aplikasi manajemen koperasi simpan pinjam: pinjaman harian dan mingguan, tagihan, pembayaran (QRIS unggahan, transfer, tunai), absensi kamera, notifikasi, penagihan WhatsApp, dan bisa dipasang di HP (PWA).

**Teknologi:** React + Vite + TailwindCSS · Supabase (Auth, Database, Storage, Edge Functions) · GitHub Pages
**Alamat:** https://yantibaja.github.io/Koperasi-KTPA/ · halaman harga publik: `/#/produk`
**Versi saat ini:** 2.6.0 (tertulis di halaman masuk dan menu Lainnya)

---
## 1. Role dan akses
| Role | Akses |
|---|---|
| Super Admin | Semua koperasi, persetujuan koperasi, daftar blokir |
| Pemilik (admin koperasi) | Penuh untuk koperasinya: nasabah, pinjaman, pembayaran, tim, absensi tim, pengaturan, fee, QRIS |
| Penagih | Tugas tagih, catat pembayaran (tunai/transfer), tambah nasabah, absensi, bukti pinjaman |
| Nasabah | Pinjaman dan tagihan sendiri, bayar lewat QRIS atau transfer |

Nasabah dan penagih mendaftar dengan **kode koperasi**; pemilik menyetujui di menu Persetujuan. Koperasi baru dan pemiliknya langsung aktif.

## 2. Fitur
- **Pendaftaran** dengan validasi (NIK 16 digit angka, huruf dan angka dipisah), foto dikompres otomatis.
- **Tarif:** harian 20 / 24 / 30 / 45 hari, mingguan 3 / 4 / 5 minggu. Tabel cicilan bisa diedit pemilik di Pengaturan.
- **Pinjaman:** buat, edit, hapus, ubah status; jadwal angsuran otomatis; fee per tenor (hanya terlihat pemilik).
- **Pembayaran:**
  - QRIS: nasabah melihat gambar QRIS koperasi yang diunggah pemilik, membayar, lalu mengunggah bukti.
  - Transfer: pilih rekening, salin nomor, unggah bukti.
  - Tunai: dicatat penagih atau pemilik.
  - Pemilik memverifikasi bukti (Terima/Tolak); tagihan lunas setelah diterima.
- **Absensi (pemilik dan penagih):** kamera langsung terbuka dengan watermark (jam, tanggal, alamat, nama, koperasi, kegiatan, kode foto, peta). Enam jenis: Masuk, Nasabah Baru, Peminjam Baru, Istirahat, Selesai Istirahat, Pulang. Belum absen masuk = pengingat kuning (tidak memblokir aplikasi).
- **Notifikasi** dalam aplikasi (ikon lonceng): pembayaran berhasil/ditolak, bukti baru, tugas tagih, absensi.
- **Pesan WhatsApp:** template promo/sapaan/pengingat + tabel angsuran; tagih via WA.
- **Bukti Penerimaan Pinjaman:** cetak terisi otomatis atau kosong (3 per A4).
- **Hari libur:** hari Minggu dan tanggal merah tidak ada jatuh tempo dan transaksi. Jatuh tempo yang jatuh pada hari libur otomatis digeser ke hari kerja berikutnya, termasuk saat pemilik menambah/menghapus tanggal merah. Pembayaran dan pinjaman baru ditolak pada hari libur.
- Denda otomatis (tidak dihitung pada hari libur), tugas tagih otomatis (cron), blokir NIK/No HP, hapus nasabah.
- **Tampilan:** navigasi bawah modern dengan tombol tengah menonjol, ikon garis, mode gelap, banner "Versi baru tersedia".

## 3. Struktur folder
```
Koperasi-KTPA/
├── .github/workflows/deploy.yml
├── index.html · package.json · vite.config.js
├── tailwind.config.js · postcss.config.js · README.md
├── public/
│   ├── logo.png · bukti-bg.png
│   ├── icon-192.png · icon-512.png · icon-maskable-512.png
│   ├── manifest.webmanifest · sw.js
├── supabase/
│   ├── schema.sql · patch_*.sql · config.toml
│   └── functions/ cek-tunggakan · create-qris · midtrans-cek · midtrans-webhook  (index.ts)
└── src/
    ├── main.jsx · App.jsx · index.css
    ├── components/ BiayaAdmin · FormDaftar · Ikon · InstallButton · KameraAbsen · NotifBell
    │               QrisSetting · TabelAngsuran · TesMidtrans · UpdateBanner
    ├── lib/ Foto · absen · auth · confirm · notif · supabase · tempClient · theme · toast · utils · version
    └── pages/ Absensi · Approval · Bukti · Dashboard · Koperasi · Login · Nasabah · Pembayaran
               Pengaturan · PesanWA · Pinjaman · Produk · Register · TambahNasabah · Tim
```
**Jangan menimpa** `src/lib/supabase.js` (berisi URL dan key Anda), `vite.config.js` (`base` harus `'/Koperasi-KTPA/'`), dan `.github/workflows/deploy.yml`.

## 4. File baru sejak versi 2.2 dan letaknya
| File | Letak | Fungsi |
|---|---|---|
| `Ikon.jsx` | `src/components/` | Ikon garis modern (SVG) untuk menu |
| `NotifBell.jsx` | `src/components/` | Tombol lonceng notifikasi |
| `UpdateBanner.jsx` | `src/components/` | Banner "Versi baru tersedia" |
| `KameraAbsen.jsx` | `src/components/` | Kamera absensi + watermark |
| `QrisSetting.jsx` | `src/components/` | Unggah QRIS koperasi (Pengaturan) |
| `BiayaAdmin.jsx` | `src/components/` | Fee per tenor, khusus pemilik |
| `TesMidtrans.jsx` | `src/components/` | Tes koneksi Midtrans (opsional) |
| `TabelAngsuran.jsx` | `src/components/` | Editor tabel cicilan |
| `notif.jsx` | `src/lib/` | Mesin notifikasi + lembar riwayat |
| `libur.js` | `src/lib/` | Aturan Minggu/tanggal merah dan jadwal jatuh tempo |
| `theme.js` | `src/lib/` | Mode gelap |
| `absen.js` | `src/lib/` | Lokasi, alamat, peta, watermark, jenis absensi |
| `confirm.jsx` | `src/lib/` | Dialog konfirmasi |
| `version.js` | `src/lib/` | Nomor versi |
| `libur.js` | `src/lib/` | Aturan Minggu/tanggal merah: jadwal jatuh tempo, banner libur |
| `Absensi.jsx` | `src/pages/` | Halaman absensi + kehadiran tim |
| `libur.js` | `src/lib/` | Aturan Minggu dan tanggal merah (jadwal jatuh tempo, banner libur) |
| `Bukti.jsx` · `Koperasi.jsx` · `Produk.jsx` · `TambahNasabah.jsx` | `src/pages/` | Bukti pinjaman, kelola koperasi, harga publik, tambah nasabah |
| `bukti-bg.png` | `public/` | Latar bukti penerimaan pinjaman |
| `manifest.webmanifest` · `sw.js` · `icon-*.png` | `public/` | PWA (bisa dipasang) |
| `patch_v11.sql` … `patch_v16.sql` | `supabase/` | Lihat bagian 5 |
| `midtrans-cek` · `midtrans-webhook` | `supabase/functions/` | Opsional (hanya bila memakai Midtrans) |

`src/components/AbsenGate.jsx` sudah tidak dipakai; boleh dihapus.

## 5. Database (Supabase → SQL Editor)
**Instal baru, jalankan berurutan:**
1. `schema.sql`
2. `patch_v3.sql` (kolom tenor hari/minggu, NIK unik)
3. `patch_v4.sql` (tabel angsuran)
4. `patch_v5.sql` (data publik halaman harga)
5. `patch_v6.sql` (hapus pinjaman/nasabah)
6. `patch_v8.sql` (jenis minggu, biaya admin; berdiri sendiri)
7. `patch_v11.sql` (bukti transfer + bucket `bukti_transfer`)
8. `patch_v12.sql` (tarif sesuai foto + fee per tenor)
9. `patch_v13.sql` (notifikasi)
10. `patch_v14.sql` (absensi + bucket `absensi`)
11. `patch_v15.sql` (enam jenis absensi + aturan urutan)
12. `patch_v16.sql` (QRIS unggahan)
13. `patch_v17.sql` (hari Minggu dan tanggal merah libur)
13. `patch_v17.sql` (Minggu dan tanggal merah libur: jatuh tempo digeser, tanpa transaksi)
13. `patch_v17.sql` (Minggu dan tanggal merah libur: geser jatuh tempo, blok transaksi, denda)
13. `patch_v17.sql` (Minggu dan tanggal merah libur)

`patch_v7.sql`, `patch_v9.sql`, dan `patch_v10.sql` sudah tergantikan dan **tidak perlu** dijalankan. Untuk database yang sudah berjalan, jalankan hanya patch yang belum pernah dijalankan.

Pengaturan Auth: Authentication → Providers → Email: **Enable signups** nyala, **Confirm email** mati.

**Super Admin** (ganti email):
```sql
update profiles set role='super_admin', status='approved', koperasi_id=null
where id=(select id from auth.users where email='GANTI@EMAIL.COM');
```

## 6. Edge Functions (opsional kecuali cek-tunggakan)
| Nama persis | Fungsi | Verify JWT |
|---|---|---|
| `cek-tunggakan` | Hitung denda dan buat tugas tagih; dilewati pada hari Minggu dan tanggal merah (tombol di Kelola Tim, bisa dijadwalkan cron) | Nyala |
| `create-qris` | QR otomatis Midtrans (hanya mode "Midtrans + cadangan") | Nyala |
| `midtrans-cek` | Tes Server Key Midtrans | Nyala |
| `midtrans-webhook` | Terima notifikasi pembayaran Midtrans | **Mati** |

Secret Midtrans (hanya jika dipakai): `MIDTRANS_SERVER_KEY` dan `MIDTRANS_PROD` (`false` untuk Sandbox). Panduan rinci ada di `PANDUAN-MIDTRANS.md`.

## 7. Pasang di GitHub Pages
1. `vite.config.js`: `base: '/Koperasi-KTPA/'`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Setiap commit memicu build. Tunggu hijau di tab Actions.

**Urutan unggah yang aman:** jalankan SQL dulu, unggah semua file baru, dan jadikan `src/App.jsx` commit terakhir. Jika ada file yang terlewat, Actions merah dan nama file tertulis di log.

## 8. Cara memakai fitur baru
- **QRIS koperasi:** Pengaturan → QRIS koperasi → unggah gambar QRIS. Nasabah memilih QRIS, membayar, unggah bukti. Pemilik memverifikasi di Pembayaran.
- **Fee per tenor:** Pengaturan → Fee per tenor (tidak terlihat penagih dan nasabah).
- **Absensi:** menu Absensi (tombol kamera di tengah) → pilih kegiatan → kamera terbuka → potret → Gunakan foto. Nasabah/Peminjam Baru meminta nama dulu. Izinkan Kamera dan Lokasi saat diminta.
- **Pasang sebagai aplikasi:** tombol Pasang aplikasi di halaman masuk atau menu Lainnya.

## 8b. Aturan libur
- **Hari Minggu selalu libur**, begitu juga **tanggal merah** yang diisi pemilik di Pengaturan.
- Jatuh tempo yang jatuh pada hari libur otomatis **digeser ke hari kerja berikutnya**. Harian: satu angsuran per hari kerja. Saat tanggal merah ditambah atau dihapus, jadwal yang belum jatuh tempo ikut disesuaikan otomatis.
- **Tidak ada transaksi** (pembayaran baru dan pinjaman baru) pada hari libur; aplikasi menampilkan banner dan database menolaknya. Denda juga tidak dihitung pada hari libur.

## 9. Masalah umum
| Gejala | Penyebab / solusi |
|---|---|
| Ikon Absensi kembali ke Beranda | `src/App.jsx` di GitHub masih versi lama; unggah versi terbaru |
| Actions merah setelah unggah | Ada file yang terlewat (lihat tabel bagian 4) |
| Halaman tidak bisa digulir / tombol Keluar terpotong | Unggah `index.css` dan `App.jsx` versi 2.6.0 |
| Pembayaran/pinjaman ditolak "Hari ini libur" | Normal pada hari Minggu dan tanggal merah; coba lagi hari kerja |
| Layar tidak pas lebar / halaman tidak bisa digulir | Pastikan `index.css` dan `index.html` terbaru terunggah (versi 2.6.0) |
| "Hari ini libur" saat bayar atau buat pinjaman | Memang diblokir pada hari Minggu dan tanggal merah; coba lagi hari kerja berikutnya |
| Banner kuning pudar / lencana tanpa warna | Unggah `tailwind.config.js` dan file komponen terbaru |
| Kamera atau lokasi tidak bisa | Izinkan Kamera dan Lokasi: ketuk gembok di kolom alamat → Izin; buka lewat Chrome |
| "QRIS koperasi belum diatur" | Pemilik belum mengunggah QRIS di Pengaturan |
| Halaman Absensi menampilkan kotak merah | Jalankan `patch_v14.sql` lalu `patch_v15.sql` |
| Halaman tidak bisa digulir / tombol Keluar terpotong | Unggah `index.css` dan `App.jsx` terbaru (versi 2.6.0) |
| Pembayaran/pinjaman ditolak "Hari ini libur" | Aturan hari libur; coba lagi di hari kerja |
| Tabel/kolom tidak ditemukan | Jalankan patch SQL yang belum dijalankan (urutan bagian 5) |
| Notifikasi tidak muncul | Jalankan `patch_v13.sql` |
| Midtrans: Unknown Merchant / channel not activated | Hanya relevan bila memakai mode Midtrans; lihat `PANDUAN-MIDTRANS.md` |

## 10. Riwayat versi
| Versi | Isi |
|---|---|
| 2.0–2.1 | Tampilan baru, mode gelap, PWA, tarif harian/mingguan |
| 2.2 | Beranda bergaya fintech, absensi dengan kamera dan watermark |
| 2.3 | Enam jenis absensi dengan aturan urutan, perbaikan kamera |
| 2.4 | Navigasi bawah modern + ikon garis; absensi tidak lagi memblokir login |
| 2.5 | QRIS unggahan menggantikan Midtrans sebagai bawaan |
| 2.5.1 | Perbaikan layar melebar dan warna banner/lencana |
| 2.6.0 | Aturan hari Minggu/tanggal merah libur, perbaikan gulir halaman |
| 2.6 | Hari Minggu dan tanggal merah libur (jatuh tempo digeser otomatis, tanpa transaksi); perbaikan gulir dan tombol Keluar |
| 2.6 | Hari Minggu dan tanggal merah libur (geser jatuh tempo, blok transaksi), perbaikan gulir dan tombol Keluar |
| 2.6 | Hari Minggu dan tanggal merah libur: jatuh tempo digeser otomatis, tanpa transaksi (`patch_v17.sql`); perbaikan gulir dan tombol Keluar |

## 11. Batasan
- Alamat dan peta absensi memakai OpenStreetMap (perlu internet; jika gagal, tampil koordinat).
- Jam pada watermark memakai jam HP; waktu yang tersimpan memakai jam server (zona WITA untuk aturan harian).
- Lokasi palsu dari aplikasi tertentu tidak diblokir.
- Notifikasi saat aplikasi benar-benar tertutup (push server) belum tersedia.
