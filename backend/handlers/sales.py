# backend/handlers/sales.py

import sqlite3
from database import get_connection
from datetime import datetime, timedelta


def init_sales():
    """Create sales tables and safely add missing columns."""
    conn = get_connection()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sales (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_number   TEXT    NOT NULL UNIQUE,
                customer_name    TEXT    DEFAULT '',
                customer_phone   TEXT    DEFAULT '',
                payment_method   TEXT    DEFAULT 'Cash',
                payment_status   TEXT    DEFAULT 'Paid',
                discount         REAL    DEFAULT 0,
                notes            TEXT    DEFAULT '',
                subtotal         REAL    NOT NULL DEFAULT 0,
                discount_amount  REAL    NOT NULL DEFAULT 0,
                total            REAL    NOT NULL DEFAULT 0,
                status           TEXT    NOT NULL DEFAULT 'confirmed',
                created_by       TEXT    DEFAULT '',
                created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS sale_items (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id     INTEGER NOT NULL,
                item_id     INTEGER NOT NULL,
                item_name   TEXT    NOT NULL,
                barcode     TEXT    DEFAULT '',
                qty         INTEGER NOT NULL DEFAULT 1,
                unit_price  REAL    NOT NULL DEFAULT 0,
                total_price REAL    NOT NULL DEFAULT 0,
                FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
            )
        """)

        conn.commit()

        existing = [r[1] for r in conn.execute("PRAGMA table_info(sales)").fetchall()]
        migrations = {
            'payment_status':  "ALTER TABLE sales ADD COLUMN payment_status TEXT DEFAULT 'Paid'",
            'discount_amount': "ALTER TABLE sales ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0",
        }
        for col, sql in migrations.items():
            if col not in existing:
                conn.execute(sql)
                conn.commit()
                print(f"[Setup] Added column '{col}' to sales table.")

        print("[Setup] Sales tables ready.")
    except Exception as e:
        print(f"[Setup ERROR] Sales init failed: {e}")
    finally:
        conn.close()


def _next_invoice():
    conn = get_connection()
    try:
        row = conn.execute("SELECT COUNT(*) AS c FROM sales").fetchone()
        n   = (row['c'] or 0) + 1
    except Exception:
        n = 1
    finally:
        conn.close()
    return f"INV-{datetime.now().strftime('%Y%m')}-{n:04d}"


def get_all_sales(query=None):
    conn = get_connection()
    try:
        sql    = "SELECT * FROM sales WHERE 1=1"
        params = []
        if query:
            if query.get('search'):
                s = f"%{query['search']}%"
                sql += " AND (invoice_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)"
                params.extend([s, s, s])
            if query.get('payment_status'):
                sql += " AND payment_status = ?"
                params.append(query['payment_status'])
        sql += " ORDER BY created_at DESC"

        rows   = conn.execute(sql, params).fetchall()
        result = []
        for r in rows:
            sale  = dict(r)
            items = conn.execute(
                "SELECT * FROM sale_items WHERE sale_id = ?", (sale['id'],)
            ).fetchall()
            sale['items'] = [dict(i) for i in items]
            result.append(sale)
        return result
    except Exception as e:
        print(f"[Sales Error] get_all_sales: {e}")
        return []
    finally:
        conn.close()


def get_sale(sale_id):
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM sales WHERE id = ?", (sale_id,)).fetchone()
        if not row:
            return None
        sale  = dict(row)
        items = conn.execute(
            "SELECT * FROM sale_items WHERE sale_id = ?", (sale_id,)
        ).fetchall()
        sale['items'] = [dict(i) for i in items]
        return sale
    except Exception as e:
        print(f"[Sales Error] get_sale: {e}")
        return None
    finally:
        conn.close()


def get_sales_stats():
    """
    Return monthly, weekly, today and total stats.

    created_at is stored as LOCAL time strings by Python's datetime.now()
    (e.g. '2026-04-03 20:31:00' in IST).  We pass Python-computed local
    date strings as parameters so SQLite never applies any tz modifier,
    avoiding the double-shift bug.
    """
    now        = datetime.now()
    this_month = now.strftime('%Y-%m')                          # '2026-04'
    today_str  = now.strftime('%Y-%m-%d')                       # '2026-04-04'
    week_start = (now - timedelta(days=6)).strftime('%Y-%m-%d') # 6 days ago

    conn = get_connection()
    try:
        row = conn.execute("""
            SELECT
                COUNT(CASE WHEN strftime('%Y-%m', created_at) = ? THEN 1 END)       AS monthly_sales,
                ROUND(SUM(CASE WHEN strftime('%Y-%m', created_at) = ?
                               THEN total ELSE 0 END), 2)                           AS monthly_revenue,

                COUNT(CASE WHEN DATE(created_at) >= ? THEN 1 END)                   AS weekly_sales,
                ROUND(SUM(CASE WHEN DATE(created_at) >= ?
                               THEN total ELSE 0 END), 2)                           AS weekly_revenue,

                COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END)                    AS today_sales,
                ROUND(SUM(CASE WHEN DATE(created_at) = ?
                               THEN total ELSE 0 END), 2)                           AS today_revenue,

                COUNT(*)                                                             AS total_sales,
                ROUND(SUM(total), 2)                                                AS total_revenue

            FROM sales
            WHERE status = 'confirmed'
        """, (
            this_month, this_month,
            week_start, week_start,
            today_str,  today_str,
        )).fetchone()
        return dict(row) if row else {}
    except Exception as e:
        print(f"[Sales Error] get_sales_stats: {e}")
        return {}
    finally:
        conn.close()


def create_sale(data, created_by=''):
    cart = data.get('items', [])
    if not cart:
        return None, "No items in sale"

    conn = get_connection()
    try:
        for ci in cart:
            row = conn.execute(
                "SELECT id, name, qty FROM items WHERE id = ?",
                (int(ci['item_id']),)
            ).fetchone()
            if not row:
                return None, f"Item ID {ci['item_id']} not found in inventory"
            if row['qty'] < int(ci['qty']):
                return None, f"Insufficient stock for '{row['name']}' (available: {row['qty']})"

        discount    = float(data.get('discount', 0) or 0)
        subtotal    = sum(float(ci['qty']) * float(ci['unit_price']) for ci in cart)
        disc_amount = round(subtotal * discount / 100, 2)
        total       = round(subtotal - disc_amount, 2)
        invoice_no  = _next_invoice()

        # Store created_at as local time string explicitly so stats queries always match
        local_now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        cur = conn.execute("""
            INSERT INTO sales (
                invoice_number, customer_name, customer_phone,
                payment_method, payment_status,
                discount, notes,
                subtotal, discount_amount, total,
                status, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)
        """, (
            invoice_no,
            str(data.get('customer_name', '')).strip(),
            str(data.get('customer_phone', '')).strip(),
            str(data.get('payment_method', 'Cash')),
            str(data.get('payment_status', 'Paid')),
            discount,
            str(data.get('notes', '')).strip(),
            round(subtotal, 2),
            disc_amount,
            total,
            str(created_by),
            local_now,
        ))
        sale_id = cur.lastrowid

        for ci in cart:
            item = conn.execute(
                "SELECT name, barcode FROM items WHERE id = ?",
                (int(ci['item_id']),)
            ).fetchone()
            qty        = int(ci['qty'])
            unit_price = float(ci['unit_price'])

            conn.execute("""
                INSERT INTO sale_items
                    (sale_id, item_id, item_name, barcode, qty, unit_price, total_price)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                sale_id, int(ci['item_id']),
                item['name'], item['barcode'] or '',
                qty, unit_price, round(qty * unit_price, 2),
            ))

            conn.execute(
                "UPDATE items SET qty = qty - ? WHERE id = ?",
                (qty, int(ci['item_id']))
            )

        conn.commit()
        return get_sale(sale_id), None

    except Exception as e:
        conn.rollback()
        print(f"[Sales Error] create_sale: {e}")
        return None, str(e)
    finally:
        conn.close()


def delete_sale(sale_id):
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT invoice_number FROM sales WHERE id = ?", (sale_id,)
        ).fetchone()
        if not row:
            return None, "Sale not found"

        items = conn.execute(
            "SELECT item_id, qty FROM sale_items WHERE sale_id = ?", (sale_id,)
        ).fetchall()
        for i in items:
            conn.execute(
                "UPDATE items SET qty = qty + ? WHERE id = ?",
                (i['qty'], i['item_id'])
            )

        conn.execute("DELETE FROM sales WHERE id = ?", (sale_id,))
        conn.commit()
        return row['invoice_number'], None

    except Exception as e:
        conn.rollback()
        print(f"[Sales Error] delete_sale: {e}")
        return None, str(e)
    finally:
        conn.close()
