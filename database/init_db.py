"""
database/init_db.py
-------------------
Creates stockflow.db (SQLite) with full schema + sample data.
Copy the resulting stockflow.db into backend/ before starting Flask.

Usage:
    cd database
    python init_db.py
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "stockflow.db")


SCHEMA = """
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS items (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT,
    name        TEXT     NOT NULL,
    category    TEXT     NOT NULL  DEFAULT 'General',
    barcode     TEXT     UNIQUE,
    qty         INTEGER  NOT NULL  DEFAULT 0       CHECK(qty >= 0),
    price       REAL     NOT NULL  DEFAULT 0.0     CHECK(price >= 0),
    threshold   INTEGER  NOT NULL  DEFAULT 5       CHECK(threshold >= 0),
    created_at  TEXT     NOT NULL  DEFAULT (datetime('now')),
    updated_at  TEXT     NOT NULL  DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS trg_items_updated_at
AFTER UPDATE ON items
FOR EACH ROW
BEGIN
    UPDATE items SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_barcode  ON items(barcode);
CREATE INDEX IF NOT EXISTS idx_items_qty      ON items(qty);
"""

SEED_DATA = [
    ("Basmati Rice 1kg",        "Grocery",      "8901234000001",  3,  65.00, 10),
    ("Ariel Detergent 500g",    "Grocery",      "8901234000002", 42, 135.00,  5),
    ("A4 Notebook 200 pages",   "Stationery",   "8901234000003",  8,  45.00, 15),
    ("Glucose-D 500g",          "Grocery",      "8901234000004",  0,  89.00,  5),
    ("Ball Pen Blue (Box)",     "Stationery",   "8901234000005", 22,  60.00, 10),
    ("Latex Gloves 100pc",      "Lab Supplies", "8901234000006",  4, 280.00, 10),
    ("Rin Soap Bar 150g",       "Grocery",      "8901234000007", 18,  22.00,  8),
    ("Erlenmeyer Flask 250ml",  "Lab Supplies", "8901234000008",  6, 350.00,  5),
    ("Stapler + Pins Set",      "Stationery",   "8901234000009", 12, 110.00,  5),
    ("Dettol Antiseptic 250ml", "Grocery",      "8901234000010",  9,  95.00,  6),
    ("Fevicol 200ml",           "Stationery",   "8901234000011", 14,  55.00,  8),
    ("Hand Sanitizer 500ml",    "Lab Supplies", "8901234000012",  2, 180.00,  5),
]


def init():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"Removed old database at {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()

    cur.executescript(SCHEMA)

    cur.executemany(
        """INSERT OR IGNORE INTO items
           (name, category, barcode, qty, price, threshold)
           VALUES (?, ?, ?, ?, ?, ?)""",
        SEED_DATA,
    )
    conn.commit()

    # Verify
    cur.execute("""
        SELECT id, name, qty, threshold,
               CASE
                 WHEN qty = 0         THEN 'OUT OF STOCK'
                 WHEN qty <= threshold THEN 'LOW STOCK'
                 ELSE                      'IN STOCK'
               END AS status
        FROM items ORDER BY id
    """)
    rows = cur.fetchall()

    print(f"\n✅  stockflow.db created — {len(rows)} items\n")
    print(f"  {'ID':<4} {'Name':<30} {'Qty':>5} {'Threshold':>10}  Status")
    print("  " + "─" * 60)
    for r in rows:
        print(f"  {r[0]:<4} {r[1]:<30} {r[2]:>5} {r[3]:>10}  {r[4]}")

    conn.close()
    print(f"\n  Copy database/stockflow.db → backend/stockflow.db")


if __name__ == "__main__":
    init()
