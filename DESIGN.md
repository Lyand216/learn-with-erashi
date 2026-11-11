# Arah desain

Arah ini disalin dari berkas `belajar-cara-belajar (2).html` milik pemilik proyek, bukan pilihan
agen. Kalau ada pertentangan antara dokumen ini dan berkas asli, berkas asli yang menang.

## Identitas

Aplikasi ini terasa seperti catatan tempel di dinding belajar: kertas warna pastel, outline
hitam tebal, dan bayangan keras tanpa blur. Tidak ada gradien, tidak ada glassmorphism, tidak ada
bayangan lembut. Identitasnya datang dari tiga hal: outline 2,5px, radius yang tidak simetris
(14/14/4/14 pada tombol tab, 4/4/16/4 pada kartu catatan), dan tulisan tangan-ish lewat
Baloo 2 untuk judul.

## Palet

| Token | Nilai | Pakai untuk |
| --- | --- | --- |
| `--bg` | `#f4f1ff` | latar aplikasi, dengan titik 22px (`#d9d2f5`) sebagai tekstur kertas |
| `--ink` | `#2b2540` | teks utama dan outline |
| `--y` | `#ffe27a` | tombol utama, ceklis |
| `--p` | `#ffa6c9` | mode fokus, kartu bertanda |
| `--m` | `#8de6bf` | mode santai, principles |
| `--s` | `#95d6ff` | kartu recall |
| `--l` | `#cdb4ff` | jurnal, filter aktif |
| `--o` | `#ffb98a` | peringatan |

Enam warna pastel dipakai sebagai warna catatan, bukan sebagai warna antarmuka. Warna
antarmuka sendiri hanya putih, tinta gelap, dan satu warna aksen per konteks, supaya palet
tetap terbaca sebagai satu sistem.

Mode gelap memakai latar `#171426`, kartu `#221d33`, dan outline `#857cc4`. Kartu catatan
bertahan pada warna pastelnya dengan tinta gelap (`--note-ink`), karena Warnanya dianggap
kertas tempel yang ditempel di dinding gelap, bukan elemen UI.

## Tipografi

- `Baloo 2` (800) untuk judul: h1, judul kartu catatan, angka timer. Dipilih karena membulat dan
  ramah, cocok untuk materi belajar, dan tetap terbaca pada ukuran besar.
- `Nunito` (400/600/800) untuk seluruh teks. Huruf sans-serif bulat yang mengizinkan label
  tebal tanpa terlihat tajam.

## Tata letak

- Lebar konten maksimum 980px, satu kolom. Aplikasi ini dipakai sambil belajar, bukan untuk
  dijelajahi, jadi tidak ada grid fitur atau navigasi samping.
- Navigasi berupa tab, bukan daftar menu. Tab yang aktif ditekan 2px ke kanan dan ke bawah,
  persis seperti tombol yang ditekan.
- Kartu catatan dimiringkan sedikit (`--r` antara -1.2deg dan 1.2deg) supaya terasa ditempel
  tangan, bukan hasil grid.

## Gerak

- Gerak hanya pada hover, tekan, dan perpindahan warna kartu timer (0.4s).
- `prefers-reduced-motion: reduce` mematikan semua transisi.
- Tidak ada animasi masuk, tidak ada parallax, tidak ada skeleton yang bergoyang.

## Dial

ENERGY 2 / RHYTHM 2 / MOTION 1.ENERGY 2 karena warnanya berani tapi bentuknya tetap lugas;
RHYTHM 2 karena tiap tab punya komposisi berbeda (timer besar, form rapat, grid kartu, daftar
prinsip) meski satu kolom; MOTION 1 karena tidak ada alasan interaktif untuk bergerak lebih dari
state hover dan tekan.
