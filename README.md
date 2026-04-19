# Simply Bhartiya — Inventory & Traceability System

A mobile-first PWA for tracking cold-pressed oil production from raw seed procurement to final bottled product, using a 3-stage QR code workflow.

## ✨ Features

- **Role-based access**: Admin (full financials) vs Staff (restricted view — no prices/vendor data)
- **3-stage state machine**: Procurement → Extraction → Packaging; each stage generates its own QR code
- **Public traceability**: Customers scan the bottle QR and see origin PIN, extraction & packaging dates on a public, no-login page (`/trace/:batchId`)
- **Admin analytics**: Weekly / Monthly / Yearly dashboards with charts + Excel export
- **Mobile-first**: camera-based QR scanning via `html5-qrcode` with manual entry fallback
- **Indian heritage design**: Cormorant Garamond typography, green + saffron palette, peacock branding

## 🏗️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Tailwind CSS, shadcn/ui, recharts, html5-qrcode, sonner, react-router v7 |
| Backend | FastAPI, Motor (async MongoDB), JWT auth (pyjwt), bcrypt, qrcode, openpyxl |
| Database | MongoDB (any: local, Atlas, self-hosted) |

## 🚀 Local Setup

### Prerequisites

- Node.js 18+ and `yarn`
- Python 3.11+
- MongoDB (local install or Atlas connection string)

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env and set MONGO_URL, DB_NAME, JWT_SECRET
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

On first startup the backend automatically seeds two users:
- **Admin** / `Administrator@321`
- **Staff** / `SimplyBhartiya@321`

### Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env and set REACT_APP_BACKEND_URL (e.g. http://localhost:8001)
yarn install
yarn start
```

Open <http://localhost:3000>.

## 🔐 Security Checklist (Before Deploying)

- [ ] Change `JWT_SECRET` in `backend/.env` to a long random string (`python -c "import secrets; print(secrets.token_urlsafe(48))"`)
- [ ] Restrict `CORS_ORIGINS` to your actual frontend domain (not `*`)
- [ ] Rotate the seeded Admin/Staff passwords after first login (feature on backlog)
- [ ] Set `PUBLIC_TRACE_URL` to your production domain so Stage-3 QR codes embed the correct customer URL
- [ ] Use MongoDB Atlas with a dedicated DB user (not the cluster admin)
- [ ] Enable HTTPS on both frontend and backend (required for camera API)

## 🔑 Batch ID Format

`[Prefix][YYYYMMDDHHMMSS]-[6-digit-PIN]`

| Prefix | Seed Type |
|---|---|
| `BM` | Black Mustard |
| `WS` | White Sesame |
| `GN` | Groundnut |
| `CO` | Coconut |
| `AL` | Almond |

Example: `BM20260419180217-110001`

## 📂 Project Structure

```
.
├── backend/
│   ├── server.py              FastAPI app: auth, batches, QR, analytics, excel
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.js             Routes
│   │   ├── contexts/          AuthContext
│   │   ├── lib/api.js         Axios instance
│   │   ├── components/        Header, ProtectedLayout, ui/* (shadcn)
│   │   └── pages/             Login, Dashboard, Batches, Procurement,
│   │                          BatchDetail, Stage2, Stage3, Scan, PublicTrace
│   ├── package.json
│   └── .env.example
└── README.md
```

## 🌐 API Overview

All routes prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login, returns JWT |
| POST | `/api/batches` | Admin | Create batch (Stage 1) |
| GET | `/api/batches` | Admin/Staff | List batches (role-filtered) |
| GET | `/api/batches/:id` | Admin/Staff | Single batch (role-filtered) |
| PATCH | `/api/batches/:id/stage2` | Any | Record extraction |
| PATCH | `/api/batches/:id/stage3` | Any | Record packaging |
| GET | `/api/batches/:id/qr/:stage` | Any | Generate QR PNG |
| GET | `/api/trace/:id` | **Public** | Customer-facing trace data |
| GET | `/api/analytics?period=week\|month\|year` | Admin | Dashboard data |
| GET | `/api/export/excel` | Admin | Full data .xlsx |

## 📜 License

Proprietary — © Simply Bhartiya
