// [path, label, ikon, role yang boleh]
export const MENU_META = [
  ['/', 'Beranda', '🏠', ['super_admin', 'admin', 'penagih', 'nasabah']],
  ['/absensi', 'Absensi', '🕒', ['admin', 'penagih']],
  ['/koperasi', 'Koperasi', '🏢', ['super_admin']],
  ['/nasabah', 'Nasabah', '👥', ['super_admin', 'admin']],
  ['/tambah-nasabah', 'Tambah Nasabah', '➕', ['penagih']],
  ['/pinjaman', 'Pinjaman', '💰', ['super_admin', 'admin', 'nasabah']],
  ['/bukti', 'Bukti Pinjaman', '🧾', ['super_admin', 'admin', 'penagih']],
  ['/pembayaran', 'Pembayaran', '💳', ['super_admin', 'admin', 'penagih', 'nasabah']],
  ['/tim', 'Kelola Tim', '🧑‍💼', ['super_admin', 'admin']],
  ['/persetujuan', 'Persetujuan', '✅', ['super_admin', 'admin']],
  ['/wa', 'Pesan WA', '💬', ['super_admin', 'admin']],
  ['/pengaturan', 'Pengaturan', '⚙️', ['super_admin', 'admin']],
]
// Menu tetap di bar bawah (sisanya ada di "Lainnya")
export const NAV_UTAMA = { admin: ['/', '/nasabah', '/pinjaman', '/pembayaran'], super_admin: ['/', '/koperasi', '/nasabah', '/pembayaran'], penagih: ['/', '/pembayaran', '/absensi', '/tambah-nasabah'], nasabah: ['/', '/pinjaman', '/pembayaran'] }
