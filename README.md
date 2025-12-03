# Rubik View - Stock Trading Platform

A full-stack stock trading platform with real-time data processing, indicator calculations, and AI-powered stock analysis.

## 🚀 Quick Start Guide

### Prerequisites

- **Python 3.8+** (for backend)
- **Node.js 18+** (for frontend)
- **npm** or **yarn** (for frontend)

### Installation

#### 1. Install Backend Dependencies

```powershell
cd backend
pip install -r requirements.txt
```

#### 2. Install Frontend Dependencies

```powershell
cd web_app
npm install
```

### Running the Project

You need **TWO terminals** - one for backend, one for frontend.

#### Terminal 1: Start Backend Server

**⚠️ IMPORTANT:** Run from the **PROJECT ROOT** directory (not inside backend folder)

```powershell
# From project root (where README.md is located):
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

**OR use the startup scripts:**
- Double-click `START_BACKEND.bat` in project root (easiest way!)
- Double-click `START_FRONTEND.bat` in project root for frontend

**You should see:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

> **Note:** The command is `backend.main:app` (with `backend.` prefix) when running from project root!

#### Terminal 2: Start Frontend Server

```powershell
cd web_app
npm run dev
```

**You should see:**
```
▲ Next.js 16.0.6
- Local:        http://localhost:3000
```

### Access the Application

1. Open your browser: **http://localhost:3000**
2. Login with:


### Verify Servers are Running

- **Backend:** http://localhost:8000/health (should show `{"status":"healthy"}`)
- **Frontend:** http://localhost:3000 (should show login page)
- **API Docs:** http://localhost:8000/docs

---

## 📁 Project Structure

```
Rubik_view/
├── backend/          # FastAPI backend server
├── web_app/          # Next.js frontend application
├── Engine/           # Indicator processing engine
└── Data/             # All data files (databases, CSV files, etc.)
```

---

## 🔧 Troubleshooting

### Backend won't start

1. **Check you're in the right directory:**
   - Must be in **project root** (folder containing `backend` and `web_app`)
   - NOT inside the `backend` folder

2. **Check dependencies:**
   ```powershell
   cd backend
   pip install -r requirements.txt
   ```

3. **Check port 8000 is free:**
   ```powershell
   netstat -ano | findstr :8000
   ```
   If something is using it, kill that process or change the port

4. **Check database exists:**
   - Database path: `Data/rubikview_users.db`
   - It will be created automatically on first run

### Frontend won't start

1. **Install dependencies:**
   ```powershell
   cd web_app
   npm install
   ```

2. **Check port 3000 is free**

3. **Clear cache:**
   ```powershell
   Remove-Item -Recurse -Force web_app\.next
   ```

### Can't connect backend to frontend

1. Make sure backend is running: http://localhost:8000/health
2. Check browser console for errors
3. Verify API URL in `web_app/src/lib/api.ts` is `http://localhost:8000/api/v1`

---

## 📊 Server Information

| Component | Port | URL | Status Check |
|-----------|------|-----|--------------|
| Backend   | 8000 | http://localhost:8000 | http://localhost:8000/health |
| Frontend  | 3000 | http://localhost:3000 | http://localhost:3000 |
| API Docs  | 8000 | http://localhost:8000/docs | - |

---

## 💾 Data Storage

- **User Database:** `Data/rubikview_users.db` (SQLite)
- **OHCLV Data:** `Data/OHCLV Data/stocks.duckdb` (DuckDB)
- **Signals Data:** `Data/Signals Data/signals.duckdb` (DuckDB)
- **Symbols Data:** `Data/Symbols Data/symbols.duckdb` (DuckDB)
- **Logs Database:** `Data/logs.db` (SQLite)

---

## 🎯 Features

- User authentication (JWT tokens)
- Real-time stock data processing
- Indicator configuration and management
- Job scheduling (OHCLV loading, Signal processing)
- Admin console with job monitoring
- Dashboard with stock analysis
- AI-powered stock predictions

---

## 📝 Important Notes

- **Keep both terminal windows open** while using the app
- Backend must start **before** frontend
- Database and tables are created automatically on first run
- Super admin user is created automatically if it doesn't exist
- Job scheduler initializes on backend startup

---

## 🔐 Default Credentials

- **Email:** ``
- **Password:** ``
- **Role:** Super Admin

---

## 🛠️ Development

### Backend Development
- Uses hot-reload with `--reload` flag
- Changes automatically restart the server
- API documentation at `/docs`

### Frontend Development
- Next.js hot-reload enabled
- Changes automatically update in browser
- Check browser console for errors

---

## 📞 Support

For issues or questions, check the project repository or contact the development team.
