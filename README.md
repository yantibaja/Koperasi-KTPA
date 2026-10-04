# 🏦 Koperasi Simpan Pinjam (KSP Modern)

React + Vite + TailwindCSS + Supabase (Auth, Database, Storage, Edge Functions) + Midtrans QRIS. Hosting: GitHub Pages.

## 1. Role dan akses
| Role | Akses |
|---|---|
| Super Admin | Semua koperasi, aktif/nonaktif koperasi, blokir NIK/No HP |
| Admin Koperasi | Penuh untuk koperasinya sendiri (daftar langsung aktif, tanpa persetujuan) |
| Penagih | Tugas tagih yang ditugaskan; bayar CASH & TRANSFER |
| Nasabah | Pinjaman & tagihan sendiri; bayar TRANSFER & QRIS |

Nasabah dan penagih mendaftar dengan **kode koperasi**, lalu disetujui admin di menu **Persetujuan**.

## 2. Struktur folder terbaru
```
Koperasi-KTPA/
├── .github/workflows/deploy.yml
├── .gitignore · .env.example · README.md
├── index.html · package.json · vite.config.js
├── tailwind.config.js · postcss.config.js
├── supabase/
│   ├── schema.sql                  (ganti: sudah memuat patch)
│   ├── patch_lengkap.sql           (BARU)
│   ├── config.toml                 (BARU)
│   └── functions/
│       ├── create-qris/index.ts        (ganti)
│       ├── cek-tunggakan/index.ts
│       └── midtrans-webhook/index.ts   (BARU)
└── src/
    ├── main.jsx · App.jsx (ganti) · index.css
    ├── lib/    supabase.js · auth.jsx · utils.js · Foto.jsx (BARU)
    └── pages/  Login · Register · Dashboard · Approval · PesanWA · Pengaturan
                Pembayaran (ganti) · Tim (ganti) · Nasabah (ganti)
                Pinjaman (ganti) · Koperasi (BARU)
```

## 3. Tempat file baru dan file yang diganti
Semua path relatif dari root repo `Koperasi-KTPA`. Ambil isinya dari `koperasi-app.zip`.

| # | Path di GitHub | Status | Fungsi |
|---|---|---|---|
| 1 | `src/App.jsx` | Ganti | Menambah menu **Koperasi** untuk Super Admin |
| 2 | `src/lib/Foto.jsx` | **Baru** | Komponen tampil foto (KTP/usaha) |
| 3 | `src/pages/Pembayaran.jsx` | Ganti | Verifikasi transfer, bayar per role |
| 4 | `src/pages/Tim.jsx` | Ganti | Penugasan tugas tagih ke penagih |
| 5 | `src/pages/Nasabah.jsx` | Ganti | Detail, edit, blokir, daftar blokir manual |
| 6 | `src/pages/Pinjaman.jsx` | Ganti | Hapus pinjaman, dukung Super Admin |
| 7 | `src/pages/Koperasi.jsx` | **Baru** | Kelola semua koperasi (Super Admin) |
| 8 | `supabase/patch_lengkap.sql` | **Baru** | Patch database (dijalankan di Supabase) |
| 9 | `supabase/schema.sql` | Ganti | Skema lengkap + patch (arsip) |
| 10 | `supabase/config.toml` | **Baru** | `verify_jwt=false` untuk webhook |
| 11 | `supabase/functions/create-qris/index.ts` | Ganti | QRIS dengan cek hak akses |
| 12 | `supabase/functions/midtrans-webhook/index.ts` | **Baru** | Penerima notifikasi Midtrans |

**Jangan ditimpa:**
- `src/lib/supabase.js`: sudah berisi URL dan anon key Anda.
- `vite.config.js`: pastikan tetap `base: '/Koperasi-KTPA/'`.
- `.github/workflows/deploy.yml`: pakai versi perbaikan (tanpa `cache: npm`).

### Cara upload dari Android (Chrome)
**File baru:** buka repo → tombol **Add file → Create new file** → di kolom nama ketik path lengkap (garis miring otomatis membuat folder, mis. `src/pages/Koperasi.jsx`) → tempel isi → **Commit changes**.

**File ganti:** buka file → ikon pensil (Edit) → pilih semua, hapus → tempel isi baru → **Commit changes**.

Tips: buka file di zip dengan aplikasi File Manager, salin isinya, atau minta isi tiap file ke Claude bila sulit membuka zip. Tiap commit memicu build. Cukup tunggu setelah commit terakhir.

## 4. Langkah pemasangan berurutan
### A. Database (SQL Editor)
1. Pertama kali: jalankan seluruh `schema.sql`. Kalau sudah pernah, jalankan hanya `patch_lengkap.sql`.
2. Authentication → Providers → Email: **Enable signups** nyala, **Confirm email** mati.

### B. Edge Functions (Supabase → Edge Functions → Deploy new function → Via Editor)
| Nama function | Isi dari | Verify JWT |
|---|---|---|
| `create-qris` | `functions/create-qris/index.ts` | Nyala |
| `cek-tunggakan` | `functions/cek-tunggakan/index.ts` | Nyala |
| `midtrans-webhook` | `functions/midtrans-webhook/index.ts` | **Mati** |

Folder `supabase/functions` di GitHub hanya arsip. Function aktif adalah yang ditempel di dashboard Supabase.

### C. Key Midtrans (hanya di Supabase)
Edge Functions → **Secrets**: `MIDTRANS_SERVER_KEY` (Server Key Sandbox `SB-Mid-server-...`) dan `MIDTRANS_PROD` = `false`. Jangan taruh di GitHub atau `supabase.js`. Produksi: ganti ke Server Key produksi dan `MIDTRANS_PROD` = `true`.

### D. Midtrans Dashboard
1. Settings → Access Keys: salin Server Key.
2. Pastikan **QRIS aktif**.
3. Settings → Configuration → **Payment Notification URL**: `https://gdwtnwsmiykobbfkfqae.supabase.co/functions/v1/midtrans-webhook`

### E. Jadwal cek tunggakan harian
Aktifkan `pg_cron` dan `pg_net` (Database → Extensions), lalu jalankan blok cron di bawah `schema.sql` dengan `PROJECT_REF` dan service role key Anda. Tes manual: menu **Kelola Tim → Cek tunggakan sekarang**.

### F. GitHub Pages
Settings → Secrets tidak diperlukan (key ada di `supabase.js`). Settings → Pages → Source: **GitHub Actions**. Tab Actions harus hijau, lalu Pages → **Visit site**.

### G. Super Admin
Daftar akun lewat "Koperasi baru", lalu SQL Editor (ganti email):
```sql
update profiles set role='super_admin', status='approved', koperasi_id=null
where id=(select id from auth.users where email='GANTI@EMAIL.COM');
```

## 5. Alur uji coba
1. Admin daftar → langsung masuk → Pengaturan: catat **kode koperasi**, isi rekening bank, denda, tanggal merah.
2. Nasabah dan penagih daftar dengan kode → admin setujui di **Persetujuan**.
3. Admin: Pinjaman → buat pinjaman (angsuran otomatis terbentuk).
4. Nasabah: Pembayaran → TRANSFER (admin verifikasi) atau QRIS (lunas otomatis via webhook).
5. Tunggakan: Kelola Tim → Cek tunggakan → tugaskan ke penagih → penagih bayar CASH/TRANSFER.
6. Pesan WA: tombol tagih dan broadcast.

## 6. Masalah umum
| Gejala | Penyebab / solusi |
|---|---|
| Layar putih | `base` salah, atau Pages Source bukan GitHub Actions |
| Registrasi gagal | Jalankan SQL, cek Logs → Auth/Postgres, `select gen_kode();` |
| QRIS gagal | Cek secret Midtrans dan Logs `create-qris` |
| QRIS dibayar tapi belum lunas | Webhook belum dipasang, Verify JWT belum mati, atau URL notifikasi salah |
| Penagih tidak melihat tagihan | Tugas belum dibuat atau belum ditugaskan di Kelola Tim |

## 7. Batasan
Nasabah/penagih dibuat lewat pendaftaran mandiri (bukan input admin); nasabah tidak dihapus permanen, hanya diblokir; penugasan per area manual. Belum diuji end-to-end, jadi laporkan error yang muncul.

## Pembaruan v3
Jalankan `supabase/patch_v3.sql` di SQL Editor. Perubahan: bunga dalam Rupiah, tenor harian/bulanan, form tambah nasabah (admin & penagih), validasi angka/teks, tampilan baru + toast, tombol Keluar di Android, pendaftaran lebih cepat (foto dikompres, bug macet diperbaiki), logo aplikasi di `public/logo.png`.

## Pembaruan v4
Jalankan `supabase/patch_v4.sql`. Pinjaman kini memakai **tabel angsuran** (harian: 24/30/45/60/70 hari; bulanan: 3/6/9/12/15 bulan) yang bisa diubah admin di Pengaturan → Tabel angsuran. Deploy ulang Edge Function `create-qris` (kode terbaru, header CORS lengkap).

## Pembaruan v6
Jalankan `supabase/patch_v6.sql`. Pinjaman bisa diedit & dihapus, nasabah bisa dihapus (dialog konfirmasi baru), Pesan WA punya template menarik + tabel angsuran.

## Pembaruan v7: aplikasi bisa dipasang (PWA)
File baru di folder `public/`: `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`. Tombol "Pasang aplikasi" ada di halaman masuk dan di menu.
