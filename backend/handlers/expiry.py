# backend/handlers/expiry.py
from database import get_connection
from datetime import datetime, timedelta


def init_expiry():
    """Add expiry_date and batch_number columns to items if not present."""
    conn = get_connection()
    # Check existing columns
    cols = [r['name'] for r in conn.execute("PRAGMA table_info(items)").fetchall()]
    if 'expiry_date' not in cols:
        conn.execute("ALTER TABLE items ADD COLUMN expiry_date TEXT DEFAULT NULL")
        print("[Setup] Added expiry_date column to items.")
    if 'batch_number' not in cols:
        conn.execute("ALTER TABLE items ADD COLUMN batch_number TEXT DEFAULT ''")
        print("[Setup] Added batch_number column to items.")
    conn.commit()
    conn.close()
    print("[Setup] Expiry tracking ready.")


def get_expiry_overview(days_ahead=30):
    conn = get_connection()
    today      = datetime.now().date()
    alert_date = (today + timedelta(days=days_ahead)).isoformat()
    today_str  = today.isoformat()

    expired = conn.execute("""
        SELECT id, name, barcode, category, qty, expiry_date, batch_number
        FROM items
        WHERE expiry_date IS NOT NULL AND expiry_date != '' AND expiry_date < ?
        ORDER BY expiry_date ASC
    """, (today_str,)).fetchall()

    expiring_soon = conn.execute("""
        SELECT id, name, barcode, category, qty, expiry_date, batch_number,
               CAST(julianday(expiry_date) - julianday('now') AS INTEGER) AS days_left
        FROM items
        WHERE expiry_date IS NOT NULL AND expiry_date != ''
          AND expiry_date >= ? AND expiry_date <= ?
        ORDER BY expiry_date ASC
    """, (today_str, alert_date)).fetchall()

    healthy = conn.execute("""
        SELECT COUNT(*) AS c FROM items
        WHERE expiry_date IS NOT NULL AND expiry_date != '' AND expiry_date > ?
    """, (alert_date,)).fetchone()

    no_expiry = conn.execute("""
        SELECT COUNT(*) AS c FROM items
        WHERE expiry_date IS NULL OR expiry_date = ''
    """).fetchone()

    conn.close()
    return {
        'expired':       [dict(r) for r in expired],
        'expiring_soon': [dict(r) for r in expiring_soon],
        'stats': {
            'expired_count':      len(expired),
            'expiring_soon_count':len(expiring_soon),
            'healthy_count':      healthy['c'] if healthy else 0,
            'no_expiry_count':    no_expiry['c'] if no_expiry else 0,
            'days_ahead':         days_ahead,
        }
    }


def update_item_expiry(item_id, data):
    conn = get_connection()
    row  = conn.execute("SELECT id FROM items WHERE id = ?", (item_id,)).fetchone()
    if not row:
        conn.close()
        return None, "Item not found"
    conn.execute(
        "UPDATE items SET expiry_date = ?, batch_number = ? WHERE id = ?",
        (
            data.get('expiry_date') or None,
            data.get('batch_number', ''),
            item_id,
        )
    )
    conn.commit()
    updated = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    conn.close()
    return dict(updated), None


def get_all_items_with_expiry():
    conn = get_connection()
    rows = conn.execute("""
        SELECT id, name, barcode, category, qty, price, threshold,
               expiry_date, batch_number,
               CASE
                 WHEN expiry_date IS NULL OR expiry_date = '' THEN 'no_date'
                 WHEN expiry_date < DATE('now') THEN 'expired'
                 WHEN expiry_date <= DATE('now', '+30 days') THEN 'expiring_soon'
                 ELSE 'healthy'
               END AS expiry_status
        FROM items
        ORDER BY
          CASE
            WHEN expiry_date IS NULL OR expiry_date = '' THEN 3
            WHEN expiry_date < DATE('now') THEN 0
            WHEN expiry_date <= DATE('now', '+30 days') THEN 1
            ELSE 2
          END,
          expiry_date ASC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]
