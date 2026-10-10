# Panduan Midtrans QRIS (rinci)

## Arti pesan error
| Pesan | Artinya | Solusi |
|---|---|---|
| Unknown Merchant server_key/id | Midtrans tidak mengenali Server Key | Langkah 1-2, lalu tes di Langkah 4 |
| Failed to send a request to the Edge Function | Function belum di-deploy / nama salah | Langkah 3 |
| MIDTRANS_PROD=true tetapi key Sandbox | Mode dan key tidak sepasang | Samakan (Langkah 2) |
| Merchant doesn't have access for this payment type | QRIS belum aktif di akun Midtrans | Aktifkan QRIS (Settings → Payment) |

## Jika muncul "Payment channel is not activated"
Artinya Server Key sudah diterima, tetapi channel QRIS belum aktif di akun Midtrans untuk lingkungan yang dipakai (Sandbox atau Produksi).
1. Jalankan **Pengaturan → Tes koneksi Midtrans**. Pada mode Sandbox, tes ini mencoba membuat QRIS uji Rp1.500 dan menampilkan kodenya.
2. **Sandbox:** di dashboard Midtrans (lingkungan Sandbox) buka Settings → Payment (atau Payment Channels / Configuration), lalu aktifkan **QRIS** dan **GoPay**. Simpan, lalu jalankan tes lagi.
3. **Acquirer lain:** tambahkan secret `MIDTRANS_QRIS_ACQUIRER` dengan isi `gopay` (bawaan) atau `airpay shopee`. Coba yang kedua bila yang pertama ditolak, lalu jalankan tes lagi.
4. **Produksi:** QRIS aktif setelah akun disetujui Midtrans. Pastikan verifikasi bisnis selesai, lalu minta pengaktifan QRIS lewat menu Help di dashboard atau email support Midtrans.
5. Selama QRIS belum aktif, pembayaran **Transfer + upload bukti** tetap bisa dipakai.
Nama menu Midtrans bisa berbeda dari tulisan di atas.

## Langkah 1: Ambil Server Key
1. Buka dashboard.midtrans.com dan masuk.
2. Pojok kiri atas: pilih lingkungan **Sandbox** (untuk uji coba).
3. Menu **Settings → Access Keys**.
4. Pada **Server Key**, ketuk ikon mata, lalu salin SELURUHNYA. Awalannya `SB-Mid-server-` untuk Sandbox.
5. Yang dipakai hanya Server Key, bukan Client Key dan bukan Merchant ID.

## Langkah 2: Simpan di Supabase
1. Supabase → project Anda → **Edge Functions → Secrets**.
2. Buat atau ganti dua secret (nama huruf besar semua):
   - `MIDTRANS_SERVER_KEY` = Server Key tadi (tanpa spasi, tanpa tanda kutip, satu baris)
   - `MIDTRANS_PROD` = `false` untuk Sandbox, `true` untuk Produksi
3. Simpan. Key Sandbox (`SB-`) harus berpasangan dengan `false`; key produksi (tanpa `SB-`) dengan `true`.
4. Jika sebelumnya sudah ada secret dengan nama yang sama, ganti nilainya (jangan membuat nama berbeda).

## Langkah 3: Deploy function
Supabase → Edge Functions → Deploy a new function → Via Editor:
| Nama persis | Isi dari | Verify JWT |
|---|---|---|
| `create-qris` | create-qris-index.ts (versi terbaru) | Nyala |
| `midtrans-cek` | midtrans-cek-index.ts | Nyala |
| `midtrans-webhook` | (sudah ada) | Mati |
Jika function sudah ada, buka function-nya, ganti seluruh kode, lalu Deploy.

## Langkah 4: Tes koneksi (tanpa membuat transaksi)
1. Masuk ke aplikasi sebagai admin → **Pengaturan → Tes koneksi Midtrans → Jalankan tes**.
2. Hasil ✅ berarti Server Key diterima Midtrans. Hasil ❌ menampilkan penyebabnya (mode tidak cocok, key dengan spasi, dll).
3. Perbaiki sesuai pesan, simpan ulang secret, jalankan tes lagi.

## Langkah 5: Coba QRIS
1. Masuk sebagai nasabah/admin → Pembayaran → pilih tagihan → QRIS → Buat QRIS.
2. Di Sandbox, QR tidak bisa dibayar dengan aplikasi e-wallet asli. Gunakan simulator Midtrans (simulator.sandbox.midtrans.com, menu QRIS): salin alamat gambar QR (tahan lama gambar QR → salin alamat gambar), tempel di simulator, lalu bayar.
3. Setelah dibayar, status tagihan menjadi lunas lewat webhook (Langkah 6).

## Langkah 6: Webhook
1. Midtrans → Settings → Configuration → **Payment Notification URL**: `https://gdwtnwsmiykobbfkfqae.supabase.co/functions/v1/midtrans-webhook`
2. Function `midtrans-webhook` harus Verify JWT **mati**.

## Langkah 7: Jika masih gagal
Supabase → Edge Functions → pilih function → **Logs**. Catat pesan error terakhir dan kirim ke pengembang.

## Pindah ke Produksi
Ganti ke Environment Production di Midtrans, ambil Server Key produksi, ubah `MIDTRANS_SERVER_KEY` dan `MIDTRANS_PROD=true`, isi lagi Payment Notification URL untuk Production, lalu jalankan Tes koneksi.

*Nama menu Midtrans bisa sedikit berbeda dari tulisan di atas karena tampilannya sewaktu-waktu berubah.*
