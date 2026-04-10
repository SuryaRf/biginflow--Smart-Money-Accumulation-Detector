# BigInflow - Smart Money Accumulation Detector

Sistem otomatis untuk mendeteksi saham mid-cap IDX yang sedang diakumulasi oleh smart money (asing + lokal fund) sementara ritel sedang jual.

## Fitur Utama

- **Scraping Otomatis**: Mengambil data broker summary dari IDX setiap hari setelah market tutup
- **Klasifikasi Broker**: Mengkategorikan broker ke dalam Asing, Lokal Fund, Ritel, atau Other
- **Scoring Engine**: Menghitung skor akumulasi (0-100) berdasarkan multiple faktor
- **Dashboard Interaktif**: Visualisasi sinyal dengan filter dan sorting
- **Telegram Alert**: Notifikasi otomatis ketika sinyal terdeteksi
- **Scheduler**: Automasi penuh setiap hari Senin-Jumat jam 16:30 WIB

## Logika Sinyal

Sebuah saham dianggap "sinyal akumulasi smart money" jika memenuhi **tiga syarat sekaligus**:

1. **Net Asing Positif**: Total beli asing > total jual asing
2. **Net Lokal Fund Positif**: Total beli institusi lokal > total jual institusi lokal
3. **Net Ritel Negatif**: Total jual ritel > total beli ritel

## Sistem Skor (0-100)

| Komponen | Poin Max | Deskripsi |
|----------|----------|-----------|
| Intensitas Net Asing | 30 | Rasio net asing terhadap total transaksi |
| Intensitas Net Fund | 20 | Rasio net fund terhadap total transaksi |
| Net Ritel Negatif | 20 | Rasio net sell ritel terhadap total transaksi |
| Streak Harian | 20 | Berapa hari berturut-turut pola sama terjadi |
| Volume Anomali | 10 | Perbandingan volume hari ini vs rata-rata 10 hari |

## Tech Stack

- **Frontend + Backend**: Next.js 14 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Scraper**: Python (requests)
- **Scheduler**: Node-cron
- **Styling**: Tailwind CSS
- **Notification**: Telegram Bot API

## Persyaratan

- Node.js 18+
- Python 3.8+
- PostgreSQL 14+

## Instalasi

### 1. Clone & Install Dependencies

```bash
# Clone repository
git clone <repository-url>
cd BigInflow

# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r scripts/requirements.txt
```

### 2. Setup Database

```bash
# Copy environment file
cp .env.example .env

# Edit .env dengan kredensial database kamu
# DATABASE_URL="postgresql://user:password@localhost:5432/biginflow"
```

### 3. Initialize Database

```bash
# Push schema ke database
npm run db:push

# Seed data awal (broker + contoh saham)
npm run db:seed
```

### 4. Setup Telegram Bot (Opsional)

1. Buka @BotFather di Telegram
2. Kirim `/newbot` dan ikuti instruksi
3. Copy token yang diberikan
4. Kirim pesan apapun ke bot kamu
5. Buka `https://api.telegram.org/bot<TOKEN>/getUpdates`
6. Cari `chat.id` di response
7. Masukkan ke `.env`:
   ```
   TELEGRAM_BOT_TOKEN="your-token"
   TELEGRAM_CHAT_ID="your-chat-id"
   ```

## Menjalankan Aplikasi

### Development

```bash
# Jalankan Next.js dev server
npm run dev

# Buka http://localhost:3000
```

### Production

```bash
# Build aplikasi
npm run build

# Jalankan production server
npm start
```

### Scheduler (Automasi Harian)

```bash
# Jalankan scheduler (16:30 WIB setiap hari kerja)
npm run scheduler

# Atau jalankan sekali sekarang
npm run scheduler:now
```

## Scripts

| Command | Deskripsi |
|---------|-----------|
| `npm run dev` | Development server |
| `npm run build` | Build production |
| `npm run start` | Production server |
| `npm run db:push` | Push schema ke database |
| `npm run db:migrate` | Run migrations |
| `npm run db:studio` | Buka Prisma Studio |
| `npm run db:seed` | Seed data awal |
| `npm run scheduler` | Jalankan scheduler |
| `npm run scheduler:now` | Jalankan job sekarang |
| `npm run scrape` | Manual scrape hari ini |
| `npm run scrape:test BBCA` | Test scrape 1 saham |

## API Endpoints

### Stocks (Watchlist)

- `GET /api/stocks` - List semua saham
- `POST /api/stocks` - Tambah saham baru
- `PATCH /api/stocks/[id]` - Update saham
- `DELETE /api/stocks/[id]` - Hapus saham

### Signals

- `GET /api/signals?date=YYYY-MM-DD` - Get sinyal untuk tanggal tertentu

Query params:
- `date`: Tanggal (default: hari trading terakhir)
- `onlySignals`: true/false (default: true)
- `minScore`: Filter minimum skor
- `sector`: Filter sektor

### Scrape

- `GET /api/scrape` - Get scrape logs
- `POST /api/scrape` - Trigger manual scrape

### Scoring

- `GET /api/scoring` - Get scoring status
- `POST /api/scoring` - Trigger scoring engine

### Settings

- `GET /api/settings` - Get settings
- `POST /api/settings/test-telegram` - Test koneksi Telegram

## Struktur Folder

```
BigInflow/
├── prisma/
│   └── schema.prisma       # Database schema
├── scripts/
│   ├── scraper.py          # Python scraper
│   ├── seed.ts             # Database seeder
│   └── requirements.txt    # Python dependencies
├── src/
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── dashboard/      # Dashboard page
│   │   ├── watchlist/      # Watchlist page
│   │   └── settings/       # Settings page
│   ├── components/         # React components
│   ├── lib/
│   │   ├── broker-classifier.ts  # Klasifikasi broker
│   │   ├── scoring.ts            # Scoring engine
│   │   ├── telegram.ts           # Telegram bot
│   │   └── prisma.ts             # Prisma client
│   └── types/              # TypeScript types
├── scheduler.ts            # Cron scheduler
├── .env                    # Environment variables
└── package.json
```

## Klasifikasi Broker

### Asing (Foreign)
Broker dengan mayoritas klien institusi luar negeri:
- AK (UBS), BK (JPMorgan), KZ (CLSA), NI (Morgan Stanley), RX (Macquarie), dll.

### Lokal Fund
Broker yang mengelola dana institusi domestik (MI, BPJS, dana pensiun):
- CC (Mandiri), OD (BRI Danareksa), DX (Bahana), ZP (Maybank), SQ (BCA), dll.

### Ritel
Broker dengan basis nasabah individu:
- YP (Indo Premier), XC (Ajaib), XL (Stockbit), KK (Phillip), YU (CGS), dll.

## Alur Kerja Harian

```
16:30 WIB - Scheduler trigger
    │
    ▼
16:30-16:45 - Python scraper berjalan
    │         - Loop semua saham di watchlist
    │         - Hit IDX endpoint per saham
    │         - Simpan ke database
    │
    ▼
16:46 - Scraper selesai, trigger scoring
    │
    ▼
16:46-16:50 - Scoring engine berjalan
    │         - Klasifikasi broker
    │         - Hitung net per kategori
    │         - Hitung skor & streak
    │
    ▼
16:50 - Scoring selesai, kirim Telegram
    │
    ▼
17:00 - Dashboard ready dengan data terbaru
```

## Catatan Penting

1. **Data D+1**: Data IDX baru tersedia setelah market tutup, tidak untuk trading intraday
2. **Rate Limit**: Scraper menggunakan delay 1.5 detik antar request untuk menghindari rate limit
3. **Klasifikasi Tidak Sempurna**: Beberapa broker punya campuran nasabah, whitelist bisa diupdate
4. **IDX Endpoint**: Endpoint bisa berubah sewaktu-waktu, perlu monitoring

## Troubleshooting

### Scraping gagal

1. Cek koneksi internet
2. Pastikan IDX tidak sedang maintenance
3. Cek log di Settings > Scrape History
4. Coba manual scrape dari Dashboard

### Database connection error

1. Pastikan PostgreSQL berjalan
2. Cek kredensial di `.env`
3. Coba `npm run db:push` ulang

### Telegram tidak terkirim

1. Cek token dan chat ID di `.env`
2. Pastikan sudah kirim pesan ke bot
3. Test koneksi dari Settings page

## License

MIT
