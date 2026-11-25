# IoT Smart Monitoring — Node-RED backend + HTML/CSS/JavaScript frontend

Paket ini berisi:
- `public/index.html` — struktur halaman dashboard
- `public/style.css` — desain/responsif
- `public/app.js` — mengambil data dari API Node-RED dan menggambar grafik
- `nodered-flow.json` — flow MQTT + API `/api/status` dan `/api/history`

## 1. Asumsi topik dan format MQTT

Flow menggunakan:
- Broker: `127.0.0.1`
- Port: `1883`
- Topic: `iot/esp32/data`

Contoh payload JSON yang diharapkan:

```json
{
  "device_id": "ESP32-DHT22-01",
  "timestamp": "2026-11-24T10:30:00",
  "temperature": 28.5,
  "humidity": 75.2,
  "rule_anomaly": "normal",
  "ai_score": 0.12,
  "status": "normal"
}
```

Jika sketch ESP32 menggunakan topic atau nama properti JSON berbeda, ubah konfigurasi MQTT pada flow dan/atau pemetaan di function node `Simpan data & normalisasi`.

## 2. Pasang frontend di folder Node-RED

1. Buka File Explorer, ketik `%USERPROFILE%\.node-red` pada address bar.
2. Buat folder bernama `public`.
3. Salin **isi folder `public`** dari paket ini ke `%USERPROFILE%\.node-red\public`.
4. Buka `settings.js` di folder `%USERPROFILE%\.node-red`.
5. Cari opsi `httpStatic`. Aktifkan/isi seperti berikut (sesuaikan jika sudah ada pengaturan `httpStatic`):

```js
httpStatic: 'C:\\Users\\NAMA_USER\\.node-red\\public',
```

Contoh: ganti `NAMA_USER` dengan nama folder akun Windows Anda.
6. Simpan lalu restart Node-RED.
7. Frontend akan tersedia di `http://127.0.0.1:1880/`.

Catatan: `httpStatic` harus berada di dalam objek konfigurasi `module.exports = { ... }`. Jangan membuat dua properti `httpStatic`.

## 3. Import flow Node-RED

1. Buka editor `http://127.0.0.1:1880`.
2. Menu ☰ → Import → pilih file `nodered-flow.json`.
3. Import ke flow baru.
4. Buka node MQTT In, pastikan broker mengarah ke `127.0.0.1:1883`, port `1883`, topic `iot/esp32/data`.
5. Deploy.
6. Pastikan broker HiveMQ lokal sedang berjalan.

Flow menyimpan maksimal 100 data terakhir di context memory. Data akan hilang jika Node-RED direstart. Untuk penyimpanan permanen, nanti dapat ditambahkan SQLite atau database.

## 4. Uji tanpa ESP32 (opsional)

Gunakan MQTT Explorer:
- Host: `127.0.0.1`
- Port: `1883`
- Topic: `iot/esp32/data`
- Payload: JSON contoh pada bagian 1.

Jika dashboard menerima data, kartu ringkasan, grafik, dan tabel riwayat akan terisi.

## 5. Ubah parameter sesuai sketch ESP32

- Topic MQTT: sesuaikan pada node `MQTT In`.
- Broker lokal untuk Node-RED: `127.0.0.1:1883`.
- ESP32 tidak boleh memakai `127.0.0.1` sebagai alamat broker. Gunakan IPv4 komputer tempat HiveMQ berjalan, misalnya `192.168.1.10`, port `1883`.
- Pastikan HiveMQ menerima koneksi dari jaringan lokal dan Windows Firewall mengizinkan TCP 1883 pada jaringan Private.

## 6. Endpoint API

- `GET /api/status` → `{ "latest": { ... } }`
- `GET /api/history` → array data terbaru

Frontend memanggil endpoint pada origin yang sama, jadi tidak memerlukan konfigurasi CORS.
