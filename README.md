# StockFlow – Full Stack Inventory Tracker

For small to medium-sized businesses, reliance on manual registers and fragmented spreadsheets frequently leads to stock discrepancies, undetected product expirations, and a lack of real-time operational visibility, while traditional enterprise software remains prohibitively expensive. Developed as a final-year Master of Computer Applications (MCA) project, StockFlow is a comprehensive, full-stack digital inventory management system designed to directly address and eliminate these inefficiencies. It provides a centralized, highly intuitive web-based platform that acts as the single source of truth for a business's entire inventory lifecycle, from procurement to point-of-sale.

# Roles:
### Owner: 

•	View full dashboard & analytics

•	Manage Admins & Staff

•	View all reports (sales, profit, stock)

•	Approve major changes

•	Access system settings
### Admin:

•	Manage inventory (add/update/delete items)

•	Handle suppliers

•	View sales reports

•	Manage staff accounts

•	Handle low stock alerts
### Staff:

•	Create sales (billing)

•	Scan barcode

•	View limited inventory

•	Cannot delete items

•	Cannot access reports/settings

# Features:

📊 Live Dashboard — real-time stats, stock levels, and alerts at a glance

🔍 Smart Search & Filter — filter by category, status (low / out / ok), sort by any field

➕ Full CRUD — add, edit, restock, and delete inventory items

📷 Barcode Lookup — fetch items instantly by barcode

🚨 Low-Stock Alerts — automatic threshold-based notifications

📤 Export — download inventory as CSV or a formatted text report

🗄️ Pre-seeded Database — ships with 12 sample items so you can explore immediately

⚡ Zero Dependencies — backend runs on Python's built-in standard library only

## Tech Stack:
- Operating System: Windows 
- Frontend Technologies: HTML5, CSS3, JavaScript, React.js
- Backend Technologies: Pure Python
- Database: SQLite (for small-scale usage)
- Libraries & Tools: Pandas (for Excel/CSV export)
- Development Tools: VS Code, Web browser (Google Chrome)



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







