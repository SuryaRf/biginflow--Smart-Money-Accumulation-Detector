# BigInflow - Smart Money Accumulation Detector 💰

Sistem otomatis untuk mendeteksi akumulasi smart money (institusi asing + fund lokal) pada saham mid-cap IDX, dengan tracking divergensi terhadap retail investors.

![Next.js](https://img.shields.io/badge/Next.js-16.2-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Python](https://img.shields.io/badge/Python-3.14-yellow)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)

## ✨ Fitur Utama

- 🔍 Auto-Detection: Deteksi otomatis akumulasi smart money
- 📊 Broker Classification: Foreign, Local Fund, Retail, Other
- 📈 Price Correlation: Analisis korelasi partisipasi vs harga
- 🎯 Scoring System: 0-100 points dengan breakdown
- 📱 Telegram Alerts: Notifikasi otomatis
- 🕒 Automated: Scraping harian jam 16:30 WIB
- 📉 Dashboard: React dashboard real-time

## 🎯 Cara Kerja

### Signal Detection Criteria
✅ Harga trending naik (> 0.5%)
✅ Foreign participation >= 10%
✅ Local fund participation >= 5%  
✅ Retail < Combined Smart Money

### Scoring (0-100 pts)
- Foreign Participation: 30 pts
- Fund Participation: 20 pts
- Retail Divergence: 20 pts
- Streak Days: 20 pts
- Volume Anomaly: 10 pts

## 📦 Instalasi

### Prerequisites
- Node.js 20+
- Python 3.14+
- PostgreSQL 16+

### Setup
bash
git clone https://github.com/yourusername/BigInflow.git
cd BigInflow
npm install
py -m pip install curl_cffi psycopg2-binary python-dotenv
npx prisma db push
npm run db:seed


## ⚙️ Konfigurasi

Create .env:
env
DATABASE_URL="postgresql://postgres:password@localhost:5432/biginflow"
TELEGRAM_BOT_TOKEN="your_token"
TELEGRAM_CHAT_ID="your_chat_id"


## 🚀 Penggunaan

bash
# Development
npm run dev

# Scrape data
py scripts/scraper.py --test BBCA --date 20240315

# Run scoring
curl -X POST http://localhost:3000/api/scoring


## 📊 Tech Stack

- Next.js 16 + TypeScript
- Prisma 7 + PostgreSQL
- Python + curl_cffi
- React + TailwindCSS
- Shadcn/ui + Recharts

## 📁 Struktur Project

BigInflow/
├── prisma/             # Database schema
├── scripts/            # Python scraper & utilities
├── src/
│   ├── app/            # Next.js pages & API
│   ├── components/     # React components
│   └── lib/            # Core logic
└── .env                # Config

## 🐛 Troubleshooting

### Scraper 403 Error
- Install curl_cffi
- Check IDX website accessible
- Try VPN with ID IP

### 0 Signals Found
bash
# Check dates aligned
npx ts-node scripts/list-dates.ts

# Debug scoring
node scripts/debug-scoring.mjs


## 📝 License

MIT License

## ⚠️ Disclaimer

Educational purposes only. Not financial advice. Scraping may violate ToS.

