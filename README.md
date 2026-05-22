# StockFlow – Full Stack Inventory Tracker
# Pure Python Backend (zero pip installs) + React Frontend + SQLite

## QUICK START

    # Terminal 1 — Backend  (needs Python 3.6+, nothing else)
    cd backend
    python app.py
    # → http://localhost:5000

    # Terminal 2 — Frontend
    cd frontend
    npm install
    npm start
    # → http://localhost:3000


## FOLDER STRUCTURE

    stockflow-pure/
    ├── backend/                  ← Pure Python, NO external packages
    │   ├── app.py                ← Entry point  →  python app.py
    │   ├── server.py             ← HTTP server  (http.server)
    │   ├── router.py             ← URL pattern matcher (regex)
    │   ├── database.py           ← SQLite connection + schema + seed
    │   ├── stockflow.db          ← Pre-filled database (12 items)
    │   └── handlers/
    │       ├── items.py          ← CRUD + barcode endpoints
    │       ├── stats.py          ← Dashboard stats
    │       └── export.py         ← CSV + text report
    │
    ├── frontend/                 ← React 18 SPA
    │   ├── src/
    │   │   ├── App.js
    │   │   ├── context/InventoryContext.js
    │   │   ├── components/  (Sidebar, Topbar, ItemRow, ItemModal, ScanModal, Toast)
    │   │   ├── pages/       (Dashboard, Inventory, Alerts, Export)
    │   │   └── utils/       (helpers, toast)
    │   └── package.json
    │
    └── database/
        ├── stockflow.db          ← SQLite database (pre-seeded)
        ├── stockflow.sql         ← Re-create SQLite:  sqlite3 stockflow.db < stockflow.sql
        ├── stockflow_postgres.sql← PostgreSQL schema
        └── init_db.py            ← Re-seed:  python init_db.py


## API ENDPOINTS

    GET    /api/health
    GET    /api/stats

    GET    /api/items                 ?search= &category= &status=low|out|ok &sort= &order=
    GET    /api/items/:id
    GET    /api/items/barcode/:bc
    POST   /api/items                 body: { name, category, barcode, qty, price, threshold }
    PUT    /api/items/:id             body: any subset of above
    PATCH  /api/items/:id/restock     body: { qty }
    DELETE /api/items/:id

    GET    /api/export/csv
    GET    /api/export/report


## BUILT-IN PYTHON MODULES USED (no pip needed)

    http.server   — HTTP server
    sqlite3       — database
    json          — request / response parsing
    urllib.parse  — query string + URL parsing
    csv, io       — CSV export
    re            — URL routing (regex)
    datetime      — timestamps
    sys, os       — path resolution


## SWITCHING TO POSTGRESQL

    1. Install psycopg2:   pip install psycopg2-binary
    2. In database.py, replace get_connection() with a psycopg2 connection.
    3. Run:  psql -U postgres -d stockflow_db -f database/stockflow_postgres.sql
