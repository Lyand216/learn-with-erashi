# Learn with Erashi

Alat belajar pribadi yang memakai prinsip dari *Learning How to Learn* (Brown, Roediger & McDaniel):
timer fokus dan santai, catatan ber-chunk, kartu recall berjarak (Leitner), dan jurnal refleksi harian.
Diusulkan ulang dari berkas `belajar-cara-belajar (2).html` yang Lampiran, dengan seluruh fungsi
dipertahankan dan ditambah beberapa hal: sinkronisasi Supabase, mode gelap, pencarian catatan,
dialog konfirmasi hapus, serta state kosong/memuat/error.

**Live:** https://learn-with-erashi.vercel.app
**Kode:** https://github.com/Lyand216/learn-with-erashi

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + build produksi ke dist/
npm run preview  # serve hasil build
```

Tanpa konfigurasi apa pun, aplikasi langsung jalan dan menyimpan data di `localStorage` browser.

## Yang bisa dilakukan

| Tab | Fungsi |
| --- | --- |
| Fokus & santai | Timer fokus/santai (25/5, 50/10, 15/3, atau 5 menit sekali jalan), bunyi penanda, notifikasi browser, judul tab ikut berubah, hitungan sesi dan menit hari ini, tombol "Selesai & catat" untuk menyimpan sesi lebih awal, catatan sesi (tebakan awal + ingatan setelah belajar) yang otomatis jadi kartu catatan, jurnal refleksi harian dengan daftar 5 entri terakhir dan rencana besok |
| Catatan | Tambah, edit, hapus, ganti warna, filter per topik, pencarian isi, ubah catatan jadi kartu recall, jumlah catatan |
| Recall | Deck Leitner 5 kotak (jarak 0/1/3/7/14 hari), mode jatuh tempo / sulit diingat / campur topik, filter topik, balik kartu, tombol Ingat/Lupa, tambah dan edit kartu, ringkasan isi tiap kotak |
| Prinsip | Ceklis 5 habit harian, 9 kartu prinsip belajar |
| Semua | Cadangkan data ke file JSON, pulihkan data dari file JSON (format baru maupun format file HTML lama), mode terang/gelap, lencana status penyimpanan |

## Deploy

Build produksi menghasilkan folder `dist/` (statis, bisa di-host di mana saja):

```bash
npm run build
```

Buat `vercel.json` supaya Vercel memakai build command dan folder keluaran yang benar, plus
rewrite ke `index.html` untuk tautan langsung:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Di Vercel, tambahkan environment variable berikut (Settings → Environment Variables):

```
VITE_SUPABASE_URL=https://nvqkysepmsdsmmxjxevq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

Tanpa kedua variabel itu, aplikasi tetap jalan dalam mode lokal (data di localStorage).

## Penyimpanan data

Aplikasi punya dua mode, dipilih otomatis:

**Mode lokal (default).** Semua data disimpan di `localStorage` browser dengan kunci `lhl-v2`.
Kalau `lhl-v2` tidak ada, aplikasi mencoba membaca `lhl`, yaitu kunci yang dipakai file HTML lama,
lalu memuat datanya apa adanya. Tidak ada akun, tidak ada jaringan.

**Mode Supabase.** Aktif hanya kalau `.env` berisi:

```bash
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Salin `.env.example` menjadi `.env`, lalu jalankan ulang `npm run dev`. Setelah itu aplikasi
menampilkan layar masuk, dan setiap pengguna hanya melihat datanya sendiri (row level security
di level database, bukan di frontend).

Project yang dipakai repo ini: `nvqkysepmsdsmmxjxevq`. File `.env` sudah terisi, jadi `npm run dev`
langsung berjalan dalam mode cloud.

### Menyiapkan database Supabase

1. Buat project di Supabase, aktifkan Authentication (Email/Password).
2. Jalankan `supabase/migrations/20260101000000_create_learning_tables.sql` di SQL Editor.
   File itu membuat tabel `notes`, `cards`, `focus_sessions`, `journal`, `checklist`, `settings`,
   mengaktifkan RLS per pengguna, dan membuat fungsi `save_dataset(jsonb)` untuk menyimpan seluruh
   dataset secara atomik dalam satu panggilan.
3. Isi `.env`, jalankan ulang aplikasi, lalu daftar akun di layar masuk.

Kalau project Supabase belum bisa dijangkau, tekan "Lanjut tanpa akun, simpan di perangkat ini"
di layar masuk untuk memakai mode lokal.

### Dua setelan Auth yang perlu diubah di dashboard

- **Confirm email** (Authentication → Sign In / Providers → Email). Supabase punya SMTP bawaan
  dengan batas sekitar 2 email per jam, jadi daftar akun bisa gagal dengan
  `over_email_send_rate_limit`. Untuk pemakaian pribadi, matikan toggle ini supaya daftar
  langsung menghasilkan sesi tanpa perlu buka email.
- **Leaked password protection**. Masih nonaktif (ditemukan advisor keamanan Supabase). Aktifkan
  di Authentication → Sign In / Providers supaya password yang pernah bocor ditolak.

### Cara data disimpan

Frontend tidak pernah menulis tabel satu per satu. Semua perubahan dikirim sebagai satu payload
ke fungsi `save_dataset(jsonb)`, yang dalam satu transaksi menghapus baris yang sudah tidak ada di
payload, memasukkan baris baru, dan memperbarui baris yang berubah. RLS tetap berlaku di dalam
fungsi itu karena fungsinya `security invoker`, jadi `auth.uid()`-nya adalah pengguna yang sedang
masuk.


## Struktur proyek

```
src/
  lib/
    types.ts            model data, palet warna, prinsip, preset timer
    date.ts             format tanggal lokal
    id.ts               pembuatan id
    useTheme.ts         mode terang/gelap
    supabaseClient.ts   client Supabase (null kalau env belum diisi)
    storage/
      local.ts          penyimpanan lokal + migrasi dari format lama
      supabase.ts       pembacaan/penyimpanan lewat RPC save_dataset
  state/DataProvider.tsx   satu sumber data, optimistic update, status simpan
  components/              ToastProvider, ConfirmDialog
  features/
    focus/  notes/  recall/  principles/  auth/  workspace/
  styles/app.css        seluruh gaya, token warna, mode gelap
supabase/migrations/    SQL skema + RLS
```

## Catatan aksesibilitas

Semua kontrol adalah elemen native, punya nama yang bisa dibaca screen reader, dan punya indikator
fokus yang jelas. Dialog konfirmasi bisa ditutup dengan Escape atau klik di luar, dan fokus
dipindahkan ke tombol utama saat terbuka. Hasil audit Lighthouse (mode terang dan gelap): 100
accessibility, 100 best practices, 100 SEO. Tata letak diuji tanpa overflow horizontal pada
lebar 390px.
