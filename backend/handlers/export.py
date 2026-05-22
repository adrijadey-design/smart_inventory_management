# backend/handlers/export.py


import csv
import io
from datetime import datetime
from database import get_connection, row_to_dict


def _get_all_items():
    conn  = get_connection()
    rows  = conn.execute("SELECT * FROM items ORDER BY category, name").fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


# ── CSV ────────────────────────────────────────────────────────────────────────
def export_csv():
    """Return (csv_bytes, filename)."""
    items   = _get_all_items()
    buf     = io.StringIO()
    writer  = csv.writer(buf)

    writer.writerow(["Name", "Category", "Barcode", "Quantity",
                     "Price (Rs)", "Threshold", "Status", "Value (Rs)"])
    for i in items:
        writer.writerow([
            i["name"], i["category"], i.get("barcode") or "",
            i["qty"], i["price"], i["threshold"],
            i["stock_status"], i["total_value"],
        ])

    fname = f"stockflow_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
    return buf.getvalue().encode("utf-8"), fname


# ── Text report ────────────────────────────────────────────────────────────────
def export_report():
    """Return (report_bytes, filename)."""
    items    = _get_all_items()
    low      = [i for i in items if i["stock_status"] == "Low Stock"]
    out      = [i for i in items if i["stock_status"] == "Out of Stock"]
    tot_val  = round(sum(i["total_value"] for i in items), 2)

    lines = [
        "STOCKFLOW INVENTORY REPORT",
        f"Generated : {datetime.now().strftime('%d %b %Y, %I:%M %p')}",
        "─" * 60, "",
        "SUMMARY",
        f"  Total Items   : {len(items)}",
        f"  Low Stock     : {len(low)}",
        f"  Out of Stock  : {len(out)}",
        f"  Total Value   : Rs {tot_val:,.2f}",
        "", "─" * 60,
        "ITEM DETAILS", "",
    ]

    for i in items:
        lines += [
            f"  {i['name']}",
            f"    Category : {i['category']}  |  Barcode : {i.get('barcode') or 'N/A'}",
            f"    Qty      : {i['qty']}  |  Price : Rs {i['price']:.2f}  |  Threshold : {i['threshold']}",
            f"    Status   : {i['stock_status']}",
            "",
        ]

    fname = f"stockflow_report_{datetime.now().strftime('%Y%m%d_%H%M')}.txt"
    return "\n".join(lines).encode("utf-8"), fname
