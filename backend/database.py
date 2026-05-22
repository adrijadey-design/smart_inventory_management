# backend/database.py


import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "stockflow.db")


def get_connection():
    """Return a sqlite3 connection with row_factory set to dict-like rows."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row          # rows behave like dicts
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init_db():
    """Create tables, triggers and indexes if they don't exist."""
    conn = get_connection()
    cur  = conn.cursor()

    cur.executescript("""
        CREATE TABLE IF NOT EXISTS items (
            id          INTEGER  PRIMARY KEY AUTOINCREMENT,
            name        TEXT     NOT NULL,
            category    TEXT     NOT NULL  DEFAULT 'General',
            barcode     TEXT     UNIQUE,
            qty         INTEGER  NOT NULL  DEFAULT 0    CHECK(qty >= 0),
            price       REAL     NOT NULL  DEFAULT 0.0  CHECK(price >= 0),
            threshold   INTEGER  NOT NULL  DEFAULT 5    CHECK(threshold >= 0),
            created_at  TEXT     NOT NULL  DEFAULT (datetime('now')),
            updated_at  TEXT     NOT NULL  DEFAULT (datetime('now'))
        );

        CREATE TRIGGER IF NOT EXISTS trg_items_updated_at
        AFTER UPDATE ON items FOR EACH ROW
        BEGIN
            UPDATE items SET updated_at = datetime('now') WHERE id = OLD.id;
        END;

        CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
        CREATE INDEX IF NOT EXISTS idx_items_barcode  ON items(barcode);
        CREATE INDEX IF NOT EXISTS idx_items_qty      ON items(qty);
    """)

    conn.commit()
    conn.close()
    print("[DB] Schema ready.")


def seed_db():
    """Insert sample data only if the table is empty."""
    conn = get_connection()
    cur  = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM items")
    if cur.fetchone()[0] > 0:
        print("[DB] Already seeded — skipping.")
        conn.close()
        return

    SAMPLES = [
        ("Basmati Rice 1kg",        "Grocery",       "8901234000001",  3,  65.00, 10),
        ("Ariel Detergent 500g",    "Grocery",       "8901234000002", 42, 135.00,  5),
        ("A4 Notebook 200 pages",   "Stationery",    "8901234000003",  8,  45.00, 15),
        ("Glucose-D 500g",          "Grocery",       "8901234000004",  0,  89.00,  5),
        ("Ball Pen Blue (Box)",     "Stationery",    "8901234000005", 22,  60.00, 10),
        ("Latex Gloves 100pc",      "Lab Supplies",  "8901234000006",  4, 280.00, 10),
        ("Rin Soap Bar 150g",       "Grocery",       "8901234000007", 18,  22.00,  8),
        ("Erlenmeyer Flask 250ml",  "Lab Supplies",  "8901234000008",  6, 350.00,  5),
        ("Stapler + Pins Set",      "Stationery",    "8901234000009", 12, 110.00,  5),
        ("Dettol Antiseptic 250ml", "Grocery",       "8901234000010",  9,  95.00,  6),
        ("Fevicol 200ml",           "Stationery",    "8901234000011", 14,  55.00,  8),
        ("Hand Sanitizer 500ml",    "Lab Supplies",  "8901234000012",  2, 180.00,  5),
    ]

    cur.executemany(
        "INSERT OR IGNORE INTO items (name,category,barcode,qty,price,threshold) VALUES (?,?,?,?,?,?)",
        SAMPLES,
    )
    conn.commit()
    print(f"[DB] Seeded {len(SAMPLES)} items.")
    conn.close()


def row_to_dict(row):
    """Convert a sqlite3.Row to a plain dict and attach computed fields."""
    d = dict(row)
    qty       = d.get("qty", 0)
    threshold = d.get("threshold", 5)

    if qty == 0:
        d["stock_status"] = "Out of Stock"
    elif qty <= threshold:
        d["stock_status"] = "Low Stock"
    else:
        d["stock_status"] = "In Stock"

    d["total_value"] = round(qty * d.get("price", 0), 2)
    return d
