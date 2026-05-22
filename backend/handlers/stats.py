# backend/handlers/stats.py

from database import get_connection


def get_stats():
    """Return aggregated inventory statistics."""
    conn = get_connection()
    cur  = conn.cursor()

    total_items = cur.execute("SELECT COUNT(*) FROM items").fetchone()[0]

    low_stock = cur.execute(
        "SELECT COUNT(*) FROM items WHERE qty > 0 AND qty <= threshold"
    ).fetchone()[0]

    out_of_stock = cur.execute(
        "SELECT COUNT(*) FROM items WHERE qty = 0"
    ).fetchone()[0]

    total_value = cur.execute(
        "SELECT COALESCE(SUM(qty * price), 0) FROM items"
    ).fetchone()[0]

    categories = [
        row[0] for row in cur.execute(
            "SELECT DISTINCT category FROM items ORDER BY category"
        ).fetchall()
    ]

    low_stock_items = [
        {"id": r[0], "name": r[1], "qty": r[2], "threshold": r[3]}
        for r in cur.execute(
            "SELECT id, name, qty, threshold FROM items WHERE qty > 0 AND qty <= threshold ORDER BY qty ASC"
        ).fetchall()
    ]

    conn.close()

    return {
        "total_items":     total_items,
        "low_stock":       low_stock,
        "out_of_stock":    out_of_stock,
        "total_value":     round(total_value, 2),
        "categories":      categories,
        "low_stock_items": low_stock_items,
    }
