# backend/handlers/analytics.py
# Analytics data for the Power BI-style dashboard

from database import get_connection
from datetime import datetime, timedelta
import random


def get_analytics():
    """Return all analytics data in one call."""
    conn = get_connection()

    # ── 1. Top 10 items by total value (qty × price) ─────────────────────────
    top_items = conn.execute("""
        SELECT name, category, qty, price,
               ROUND(qty * price, 2) AS total_value,
               threshold
        FROM items
        ORDER BY total_value DESC
        LIMIT 10
    """).fetchall()

    # ── 2. Stock by category (pie chart) ─────────────────────────────────────
    by_category = conn.execute("""
        SELECT category,
               COUNT(*)            AS item_count,
               SUM(qty)            AS total_qty,
               ROUND(SUM(qty * price), 2) AS total_value
        FROM items
        GROUP BY category
        ORDER BY total_value DESC
    """).fetchall()

    # ── 3. Stock level overview per item (for line chart) ────────────────────
    stock_levels = conn.execute("""
        SELECT name, qty, threshold,
               CASE
                 WHEN qty = 0         THEN 'Out of Stock'
                 WHEN qty <= threshold THEN 'Low Stock'
                 ELSE 'In Stock'
               END AS status
        FROM items
        ORDER BY qty ASC
        LIMIT 15
    """).fetchall()

    # ── 4. Revenue vs Expense summary ────────────────────────────────────────
    summary = conn.execute("""
        SELECT
            COUNT(*)                          AS total_items,
            SUM(qty)                          AS total_units,
            ROUND(SUM(qty * price), 2)        AS inventory_value,
            ROUND(AVG(price), 2)              AS avg_price,
            ROUND(SUM(price * threshold), 2)  AS reorder_cost,
            COUNT(CASE WHEN qty = 0 THEN 1 END)            AS out_of_stock,
            COUNT(CASE WHEN qty <= threshold AND qty > 0 THEN 1 END) AS low_stock,
            COUNT(CASE WHEN qty > threshold THEN 1 END)    AS in_stock
        FROM items
    """).fetchone()

    # ── 5. Category breakdown with in/low/out counts ─────────────────────────
    cat_breakdown = conn.execute("""
        SELECT
            category,
            COUNT(*) AS total,
            COUNT(CASE WHEN qty > threshold THEN 1 END)              AS in_stock,
            COUNT(CASE WHEN qty <= threshold AND qty > 0 THEN 1 END) AS low_stock,
            COUNT(CASE WHEN qty = 0 THEN 1 END)                      AS out_of_stock,
            ROUND(SUM(qty * price), 2) AS value
        FROM items
        GROUP BY category
        ORDER BY value DESC
    """).fetchall()

    # ── 6. Simulated monthly stock trend (last 6 months) ─────────────────────
    # Since we have no sales history, we simulate realistic trend data
    # based on current stock levels
    total_items = summary['total_items'] or 0
    base_value  = float(summary['inventory_value'] or 0)

    months = []
    now = datetime.now()
    for i in range(5, -1, -1):
        month = now - timedelta(days=30 * i)
        label = month.strftime('%b %Y')
        # Simulate: value grows slightly each month with some variance
        factor  = 0.72 + (5 - i) * 0.06 + random.uniform(-0.03, 0.03)
        revenue = round(base_value * factor, 2)
        expense = round(revenue * random.uniform(0.55, 0.72), 2)
        months.append({
            'month':   label,
            'revenue': revenue,
            'expense': expense,
            'profit':  round(revenue - expense, 2),
        })

    conn.close()

    return {
        'top_items':      [dict(r) for r in top_items],
        'by_category':    [dict(r) for r in by_category],
        'stock_levels':   [dict(r) for r in stock_levels],
        'cat_breakdown':  [dict(r) for r in cat_breakdown],
        'monthly_trend':  months,
        'summary':        dict(summary) if summary else {},
    }