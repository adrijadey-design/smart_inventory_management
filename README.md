# StockFlow – Full Stack Inventory Tracker

For small to medium-sized businesses, reliance on manual registers and fragmented spreadsheets frequently leads to stock discrepancies, undetected product expirations, and a lack of real-time operational visibility, while traditional enterprise software remains prohibitively expensive. Developed as a final-year Master of Computer Applications (MCA) project, StockFlow is a comprehensive, full-stack digital inventory management system designed to directly address and eliminate these inefficiencies. It provides a centralized, highly intuitive web-based platform that acts as the single source of truth for a business's entire inventory lifecycle, from procurement to point-of-sale.

## User Roles & Permissions
Stockflow supports three distinct roles, each with carefully scoped access to keep your inventory data secure and operations smooth.
#### 👑 Owner
The Owner has unrestricted access to every part of the system — ideal for business proprietors who need full visibility and control.

- View full dashboard & analytics — Access the complete overview including revenue summaries, profit margins, stock health indicators, and historical trend charts across all categories and time periods.
- Manage Admins & Staff — Create, edit, deactivate, or remove Admin and Staff accounts. Assign roles and control who has access to what within the system.
- View all reports — Generate and download detailed sales reports, profit/loss breakdowns, and stock movement history. Export data as CSV or formatted text reports for accounting or audits.
- Approve major changes — Acts as the final approver for high-impact actions such as bulk deletions, large restocks, or price overrides that exceed set thresholds.
- Access system settings — Configure global settings such as low-stock thresholds, categories, barcode formats, export preferences, and database management options.


#### 🛠️ Admin
Admins handle the day-to-day operational management of the inventory. They have enough access to keep things running without touching business-critical settings.

- Manage inventory — Add new products with full details (name, category, barcode, quantity, price, threshold), update existing item information, and permanently delete items that are discontinued or no longer tracked.
- Handle suppliers — Record and manage supplier information linked to inventory items, making it easy to track which products come from which vendors and when restocks are expected.
- View sales reports — Access sales summaries to understand which products are moving fast, which are stagnant, and overall revenue generated within a selected time period.
- Manage staff accounts — Create and manage Staff-level accounts, reset credentials, and monitor staff activity logs to ensure accountability on the floor.
- Handle low stock alerts — Review and act on automatic low-stock notifications. Trigger restock actions directly from the alerts panel and mark alerts as resolved once restocking is confirmed.


#### 🧑‍💼 Staff
Staff members are limited to operational tasks only — scanning, billing, and basic inventory visibility — ensuring they can do their job without accidentally modifying critical data.

- Create sales (billing) — Generate new sales entries by selecting items, entering quantities, and producing a bill. This updates stock levels automatically upon sale confirmation.
- Scan barcode — Use the barcode scanner interface to instantly look up any item in the inventory by scanning its code, pulling up name, quantity, price, and stock status in real time.
- View limited inventory — Browse the inventory list to check stock availability, item locations, and basic product details — but without access to pricing analytics or full report data.
- Cannot delete items — Item deletion is restricted to Admin and Owner roles only. Staff members will not see the delete option, preventing accidental or unauthorized removal of inventory records.
- Cannot access reports/settings — Financial reports, export tools, and system configuration pages are fully hidden from Staff accounts to protect sensitive business data and system integrity.

## Features:

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







