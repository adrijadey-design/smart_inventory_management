# backend/handlers/purchases.py
from database import get_connection
from datetime import datetime, timedelta


def init_purchases():
    conn = get_connection()
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS purchases (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                purchase_number     TEXT    NOT NULL UNIQUE,
                supplier_id         INTEGER REFERENCES suppliers(id),
                supplier_name       TEXT    DEFAULT '',
                invoice_number      TEXT    DEFAULT '',
                payment_method      TEXT    DEFAULT 'Cash',
                payment_status      TEXT    DEFAULT 'Pending',
                paid_amount         REAL    DEFAULT 0,
                order_status        TEXT    NOT NULL DEFAULT 'ordered',
                notes               TEXT    DEFAULT '',
                subtotal            REAL    NOT NULL DEFAULT 0,
                total               REAL    NOT NULL DEFAULT 0,
                status              TEXT    NOT NULL DEFAULT 'confirmed',
                created_by          TEXT    DEFAULT '',
                created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS purchase_items (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                purchase_id     INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
                item_id         INTEGER NOT NULL REFERENCES items(id),
                item_name       TEXT    NOT NULL,
                barcode         TEXT    DEFAULT '',
                qty             INTEGER NOT NULL,
                cost_price      REAL    NOT NULL,
                total_price     REAL    NOT NULL,
                expiry_date     TEXT    DEFAULT '',
                batch_number    TEXT    DEFAULT '',
                damaged_qty     INTEGER DEFAULT 0,
                damaged_remarks TEXT    DEFAULT ''
            );
        """)
        conn.commit()

        # Safe migrations for older installs
        pur_cols = [r[1] for r in conn.execute("PRAGMA table_info(purchases)").fetchall()]
        pur_migrations = {
            'payment_method': "ALTER TABLE purchases ADD COLUMN payment_method TEXT DEFAULT 'Cash'",
            'paid_amount':    "ALTER TABLE purchases ADD COLUMN paid_amount REAL DEFAULT 0",
            'order_status':   "ALTER TABLE purchases ADD COLUMN order_status TEXT NOT NULL DEFAULT 'ordered'",
        }
        for col, sql in pur_migrations.items():
            if col not in pur_cols:
                conn.execute(sql)
                conn.commit()
                print(f"[Setup] Added column '{col}' to purchases.")

        pi_cols = [r[1] for r in conn.execute("PRAGMA table_info(purchase_items)").fetchall()]
        pi_migrations = {
            'expiry_date':     "ALTER TABLE purchase_items ADD COLUMN expiry_date TEXT DEFAULT ''",
            'batch_number':    "ALTER TABLE purchase_items ADD COLUMN batch_number TEXT DEFAULT ''",
            'damaged_qty':     "ALTER TABLE purchase_items ADD COLUMN damaged_qty INTEGER DEFAULT 0",
            'damaged_remarks': "ALTER TABLE purchase_items ADD COLUMN damaged_remarks TEXT DEFAULT ''",
        }
        for col, sql in pi_migrations.items():
            if col not in pi_cols:
                conn.execute(sql)
                conn.commit()
                print(f"[Setup] Added column '{col}' to purchase_items.")

        print("[Setup] Purchases tables ready.")
    except Exception as e:
        print(f"[Setup ERROR] Purchases init failed: {e}")
    finally:
        conn.close()


def _next_purchase_number():
    conn = get_connection()
    try:
        row = conn.execute("SELECT COUNT(*) AS c FROM purchases").fetchone()
        n   = (row['c'] or 0) + 1
    except Exception:
        n = 1
    finally:
        conn.close()
    return f"PO-{datetime.now().strftime('%Y%m')}-{n:04d}"


def get_last_purchase_price(item_id):
    """Return the most recent cost_price paid for an item (for price-hike detection)."""
    conn = get_connection()
    try:
        row = conn.execute("""
            SELECT pi.cost_price, p.created_at
            FROM purchase_items pi
            JOIN purchases p ON p.id = pi.purchase_id
            WHERE pi.item_id = ? AND p.status = 'confirmed'
            ORDER BY p.created_at DESC
            LIMIT 1
        """, (item_id,)).fetchone()
        return dict(row) if row else None
    except Exception as e:
        print(f"[Purchases Error] get_last_purchase_price: {e}")
        return None
    finally:
        conn.close()


def get_all_purchases(query=None):
    conn = get_connection()
    try:
        sql    = "SELECT * FROM purchases WHERE 1=1"
        params = []
        if query:
            if query.get('search'):
                s = f"%{query['search']}%"
                sql += " AND (purchase_number LIKE ? OR supplier_name LIKE ? OR invoice_number LIKE ?)"
                params.extend([s, s, s])
            if query.get('payment_status'):
                sql += " AND payment_status = ?"
                params.append(query['payment_status'])
            if query.get('order_status'):
                sql += " AND order_status = ?"
                params.append(query['order_status'])
            if query.get('date_from'):
                sql += " AND DATE(created_at) >= ?"
                params.append(query['date_from'])
            if query.get('date_to'):
                sql += " AND DATE(created_at) <= ?"
                params.append(query['date_to'])
        sql += " ORDER BY created_at DESC"
        rows   = conn.execute(sql, params).fetchall()
        result = []
        for r in rows:
            purchase = dict(r)
            items = conn.execute(
                "SELECT * FROM purchase_items WHERE purchase_id = ?", (purchase['id'],)
            ).fetchall()
            purchase['items'] = [dict(i) for i in items]
            result.append(purchase)
        return result
    except Exception as e:
        print(f"[Purchases Error] get_all_purchases: {e}")
        return []
    finally:
        conn.close()


def get_purchase(purchase_id):
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM purchases WHERE id = ?", (purchase_id,)).fetchone()
        if not row:
            return None
        purchase = dict(row)
        items    = conn.execute(
            "SELECT * FROM purchase_items WHERE purchase_id = ?", (purchase_id,)
        ).fetchall()
        purchase['items'] = [dict(i) for i in items]
        return purchase
    except Exception as e:
        print(f"[Purchases Error] get_purchase: {e}")
        return None
    finally:
        conn.close()


def get_purchase_stats():
    """Stats using local time — same fix as sales."""
    now        = datetime.now()
    this_month = now.strftime('%Y-%m')
    today_str  = now.strftime('%Y-%m-%d')
    week_start = (now - timedelta(days=6)).strftime('%Y-%m-%d')

    conn = get_connection()
    try:
        row = conn.execute("""
            SELECT
                COUNT(*)                                                        AS total_purchases,
                ROUND(SUM(total), 2)                                            AS total_spent,
                COUNT(CASE WHEN payment_status='Pending' THEN 1 END)            AS pending_payments,
                ROUND(SUM(CASE WHEN payment_status='Pending' THEN total ELSE 0 END), 2) AS pending_amount,

                COUNT(CASE WHEN strftime('%Y-%m', created_at) = ? THEN 1 END)  AS monthly_purchases,
                ROUND(SUM(CASE WHEN strftime('%Y-%m', created_at) = ?
                               THEN total ELSE 0 END), 2)                      AS monthly_spent,

                COUNT(CASE WHEN DATE(created_at) >= ? THEN 1 END)              AS weekly_purchases,
                ROUND(SUM(CASE WHEN DATE(created_at) >= ?
                               THEN total ELSE 0 END), 2)                      AS weekly_spent,

                COUNT(CASE WHEN order_status='draft'     THEN 1 END)           AS draft_count,
                COUNT(CASE WHEN order_status='ordered'   THEN 1 END)           AS ordered_count,
                COUNT(CASE WHEN order_status='received'  THEN 1 END)           AS received_count,
                COUNT(CASE WHEN order_status='cancelled' THEN 1 END)           AS cancelled_count
            FROM purchases
            WHERE status = 'confirmed'
        """, (this_month, this_month, week_start, week_start)).fetchone()
        return dict(row) if row else {}
    except Exception as e:
        print(f"[Purchases Error] get_purchase_stats: {e}")
        return {}
    finally:
        conn.close()


def create_purchase(data, created_by=''):
    cart = data.get('items', [])
    if not cart:
        return None, "No items in purchase"

    conn = get_connection()
    try:
        subtotal     = sum(float(ci['qty']) * float(ci['cost_price']) for ci in cart)
        total        = round(subtotal, 2)
        purchase_no  = _next_purchase_number()
        order_status = data.get('order_status', 'ordered')
        local_now    = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # Resolve supplier name
        supplier_name = str(data.get('supplier_name', '')).strip()
        supplier_id   = data.get('supplier_id') or None
        if supplier_id:
            sup = conn.execute(
                "SELECT company_name FROM suppliers WHERE id = ?", (supplier_id,)
            ).fetchone()
            if sup:
                supplier_name = sup['company_name']

        paid_amount = float(data.get('paid_amount', 0) or 0)

        cur = conn.execute("""
            INSERT INTO purchases
                (purchase_number, supplier_id, supplier_name, invoice_number,
                 payment_method, payment_status, paid_amount,
                 order_status, notes, subtotal, total, status, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)
        """, (
            purchase_no,
            supplier_id,
            supplier_name,
            str(data.get('invoice_number', '')).strip(),
            str(data.get('payment_method', 'Cash')),
            str(data.get('payment_status', 'Pending')),
            paid_amount,
            order_status,
            str(data.get('notes', '')).strip(),
            round(subtotal, 2),
            total,
            str(created_by),
            local_now,
        ))
        purchase_id = cur.lastrowid

        for ci in cart:
            item = conn.execute(
                "SELECT name, barcode FROM items WHERE id = ?", (int(ci['item_id']),)
            ).fetchone()
            if not item:
                conn.rollback()
                return None, f"Item ID {ci['item_id']} not found"

            qty         = int(ci['qty'])
            cost_price  = float(ci['cost_price'])
            damaged_qty = int(ci.get('damaged_qty', 0) or 0)

            conn.execute("""
                INSERT INTO purchase_items
                    (purchase_id, item_id, item_name, barcode,
                     qty, cost_price, total_price,
                     expiry_date, batch_number, damaged_qty, damaged_remarks)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                purchase_id,
                int(ci['item_id']),
                item['name'],
                item['barcode'] or '',
                qty,
                cost_price,
                round(qty * cost_price, 2),
                str(ci.get('expiry_date', '') or ''),
                str(ci.get('batch_number', '') or ''),
                damaged_qty,
                str(ci.get('damaged_remarks', '') or ''),
            ))

            # Only add to stock if order is received (not draft/ordered)
            usable_qty = qty - damaged_qty
            if order_status == 'received' and usable_qty > 0:
                conn.execute(
                    "UPDATE items SET qty = qty + ? WHERE id = ?",
                    (usable_qty, int(ci['item_id']))
                )

        conn.commit()
        return get_purchase(purchase_id), None

    except Exception as e:
        conn.rollback()
        print(f"[Purchases Error] create_purchase: {e}")
        return None, str(e)
    finally:
        conn.close()


def update_payment_status(purchase_id, data):
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM purchases WHERE id = ?", (purchase_id,)).fetchone()
        if not row:
            return None, "Purchase not found"

        new_payment_status = data.get('payment_status', row['payment_status'])
        new_order_status   = data.get('order_status',   row['order_status'])
        paid_amount        = float(data.get('paid_amount', row['paid_amount'] or 0))
        payment_method     = data.get('payment_method',  row['payment_method'])

        old_order_status = row['order_status']

        conn.execute("""
            UPDATE purchases
            SET payment_status = ?, order_status = ?, paid_amount = ?, payment_method = ?
            WHERE id = ?
        """, (new_payment_status, new_order_status, paid_amount, payment_method, purchase_id))

        # If status just changed TO 'received', add stock now
        if old_order_status != 'received' and new_order_status == 'received':
            items = conn.execute(
                "SELECT item_id, qty, damaged_qty FROM purchase_items WHERE purchase_id = ?",
                (purchase_id,)
            ).fetchall()
            for i in items:
                usable = (i['qty'] or 0) - (i['damaged_qty'] or 0)
                if usable > 0:
                    conn.execute(
                        "UPDATE items SET qty = qty + ? WHERE id = ?",
                        (usable, i['item_id'])
                    )

        # If status changed FROM 'received' to something else, reverse stock
        if old_order_status == 'received' and new_order_status != 'received':
            items = conn.execute(
                "SELECT item_id, qty, damaged_qty FROM purchase_items WHERE purchase_id = ?",
                (purchase_id,)
            ).fetchall()
            for i in items:
                usable = (i['qty'] or 0) - (i['damaged_qty'] or 0)
                if usable > 0:
                    conn.execute(
                        "UPDATE items SET qty = qty - ? WHERE id = ?",
                        (usable, i['item_id'])
                    )

        conn.commit()
        return get_purchase(purchase_id), None
    except Exception as e:
        conn.rollback()
        print(f"[Purchases Error] update_payment_status: {e}")
        return None, str(e)
    finally:
        conn.close()


def delete_purchase(purchase_id):
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT purchase_number, order_status FROM purchases WHERE id = ?", (purchase_id,)
        ).fetchone()
        if not row:
            return None, "Purchase not found"

        # Only reverse stock if it was actually received
        if row['order_status'] == 'received':
            items = conn.execute(
                "SELECT item_id, qty, damaged_qty FROM purchase_items WHERE purchase_id = ?",
                (purchase_id,)
            ).fetchall()
            for i in items:
                usable = (i['qty'] or 0) - (i['damaged_qty'] or 0)
                if usable > 0:
                    conn.execute(
                        "UPDATE items SET qty = qty - ? WHERE id = ?",
                        (usable, i['item_id'])
                    )

        conn.execute("DELETE FROM purchases WHERE id = ?", (purchase_id,))
        conn.commit()
        return row['purchase_number'], None
    except Exception as e:
        conn.rollback()
        print(f"[Purchases Error] delete_purchase: {e}")
        return None, str(e)
    finally:
        conn.close()
