# 🎵 Aplikasi Pencarian Musik

![html](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![css](https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)
![javascript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![jquery](https://img.shields.io/badge/jQuery-0769AD?style=for-the-badge&logo=jquery&logoColor=white)
![Deezer](https://img.shields.io/badge/Deezer-orange?style=for-the-badge&logo=api&logoColor=white)

Aplikasi web sederhana yang memungkinkan pengguna mencari dan memutar preview lagu (30 detik) dari Deezer. Dibangun menggunakan Tailwind CSS, jQuery 3.7, dan Deezer API (JSONP).

---

## 📸 Tampilan Aplikasi
<table>
  <tr>
    <td><img src="screenshot-aplikasi/foto1.png" alt="Screenshot 1" width="100%" height="250"></td>
    <td><img src="screenshot-aplikasi/foto2.png" alt="Screenshot 2" width="100%" height="250"></td>
    <td><img src="screenshot-aplikasi/foto3.png" alt="Screenshot 3" width="100%" height="250"></td>
    <td><img src="screenshot-aplikasi/foto4.png" alt="Screenshot 4" width="100%" height="250"></td>
  </tr>
</table>

---

## ✨ Fitur Utama
- 🔍 **Pencarian Lagu** - Cari lagu, artis, atau album menggunakan Deezer API.
- 📈 **Top Chart** - Menampilkan lagu populer dari Deezer saat aplikasi dibuka.
- 🎶 **Mini Player** - Play, pause, next, previous, progress bar, dan tampilan cover.
- ⭐ **Favorit** - Simpan/hapus lagu favorit di localStorage.
- 🕒 **Riwayat Pencarian** - Riwayat otomatis (maks 10 item) dengan opsi hapus.
- 📤 **Bagikan** - Salin link Deezer ke clipboard.
- ⚡ **Skeleton Loader & Loading Overlay** - Indikator loading dan UX. 

---

## 🛠 Teknologi yang Digunakan
- **HTML5**
- **Tailwind CSS**
- **JavaScript (jQuery 3.7)**
- **Font Awesome**
- **[Deezer API (JSONP)](https://developers.deezer.com/login?redirect=/api)**

---

## 🚀 Instalasi
1. Clone repositori:
   ```bash
   git clone https://github.com/ReykaMR/pencari-musik.git
   cd pencari-musik
2. Buka file index.html di browser favorit.

---

🧭 Cara Pakai
1. Ketik kata kunci (judul, artis, atau album) di kotak pencarian.
2. Tekan tombol Cari atau Enter.
3. Klik Putar pada kartu lagu untuk mendengarkan preview.
4. Gunakan ikon bintang untuk menambah/menghapus favorit.
5. Buka tab Favorit untuk melihat lagu yang disimpan.

---

🔐 Catatan & Batasan
- Deezer menyediakan preview singkat (biasanya 30 detik), bukan lagu penuh.
- JSONP digunakan untuk menghindari pembatasan CORS. Jika Deezer mengubah API, aplikasi perlu disesuaikan.
- Jalankan lewat server lokal bila mengalami masalah saat membuka file://.
