# 🏦 Koperasi Simpan Pinjam

Aplikasi manajemen koperasi simpan pinjam: **React + Vite + TailwindCSS + Supabase** (Auth, Database, Storage) + **Midtrans QRIS**, deploy ke **GitHub Pages**.

## Role
| Role | Akses |
|---|---|
| Super Admin | Semua koperasi, approval koperasi, blokir NIK/No HP |
| Admin Koperasi | Penuh untuk koperasinya sendiri |
| Penagih | Tagihan terlambat yang ditugaskan; bayar CASH & TRANSFER |
| Nasabah | Pinjaman & tagihan sendiri; bayar TRANSFER & QRIS |

## Struktur Folder
```
koperasi-app/
├── .github/workflows/deploy.yml     # auto deploy GitHub Pages
├── supabase/
│   ├── schema.sql                   # tabel, RLS, trigger, fungsi, bucket
│   └── functions/
│       ├── create-qris/index.ts     # buat transaksi QRIS Midtrans
│       └── cek-tunggakan/index.ts   # cron: denda + tugas tagih
├── src/
│   ├── main.jsx · App.jsx · index.css
│   ├── lib/    supabase.js · auth.jsx · utils.js
│   └── pages/  Login · Register · Dashboard · Nasabah · Pinjaman
│               Pembayaran · Tim · Approval · PesanWA · Pengaturan
├── index.html · vite.config.js · tailwind.config.js · postcss.config.js
├── package.json · .env.example · .gitignore
```

## Setup Lokal
1. `npm install`
2. Salin `.env.example` ke `.env`, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
3. `npm run dev`

## Setup Supabase
1. Buat project, buka **SQL Editor**, jalankan seluruh `supabase/schema.sql`.
2. Authentication → Providers → Email: matikan **Confirm email** (login No HP memakai email sintetis `nohp@hp.koperasi.app`).
3. Daftar lewat "Koperasi baru", lalu jadikan Super Admin dengan SQL di bagian bawah `schema.sql`.
4. Deploy function:
   ```
   supabase functions deploy create-qris
   supabase functions deploy cek-tunggakan
   supabase secrets set MIDTRANS_SERVER_KEY=SB-Mid-server-xxxx MIDTRANS_PROD=false
   ```
5. Aktifkan `pg_cron` & `pg_net`, jalankan blok cron di bawah `schema.sql`.

## Deploy GitHub Pages
1. Ubah `base` di `vite.config.js` menjadi `'/NAMA-REPO/'`.
2. Repo → Settings → Secrets → Actions: tambah `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
3. Settings → Pages → Source: **GitHub Actions**.
4. `git push origin main`, situs live di `https://USERNAME.github.io/NAMA-REPO/`.

## Alur Singkat
Koperasi daftar → Super Admin setujui → kode unik muncul di Pengaturan → nasabah/penagih daftar dengan kode → admin setujui di Persetujuan.

## Catatan
- Webhook Midtrans belum ada; fungsi SQL `tandai_qris_lunas` sudah disiapkan untuk dipanggil dari webhook.
- GitHub Pages hanya hosting statis; semua logika sensitif ada di Supabase (RLS + Edge Functions).
- Jangan commit `.env` atau Service Role Key.
