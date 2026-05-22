# backend/handlers/items.py


import sqlite3
from database import get_connection, row_to_dict


# ── GET /api/items ─────────────────────────────────────────────────────────────
def get_all_items(query_params):
    """
    Supported query params:
      search   – partial match on name or barcode
      category – exact category match
      status   – low | out | ok
      sort     – name | qty | price | category  (default: name)
      order    – asc | desc  (default: asc)
    """
    search   = query_params.get("search",   "")
    category = query_params.get("category", "")
    status   = query_params.get("status",   "")
    sort     = query_params.get("sort",     "name")
    order    = query_params.get("order",    "asc").lower()

    allowed_sorts  = {"name", "qty", "price", "category"}
    allowed_orders = {"asc", "desc"}
    if sort  not in allowed_sorts:  sort  = "name"
    if order not in allowed_orders: order = "asc"

    sql    = "SELECT * FROM items WHERE 1=1"
    params = []

    if search:
        sql    += " AND (LOWER(name) LIKE ? OR LOWER(barcode) LIKE ?)"
        like    = f"%{search.lower()}%"
        params += [like, like]

    if category:
        sql    += " AND category = ?"
        params += [category]

    if status == "low":
        sql += " AND qty > 0 AND qty <= threshold"
    elif status == "out":
        sql += " AND qty = 0"
    elif status == "ok":
        sql += " AND qty > threshold"

    sql += f" ORDER BY {sort} {order.upper()}"

    conn  = get_connection()
    rows  = conn.execute(sql, params).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


# ── GET /api/items/:id ────────────────────────────────────────────────────────
def get_item_by_id(item_id):
    conn = get_connection()
    row  = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    conn.close()
    if not row:
        return None
    return row_to_dict(row)


# ── GET /api/items/barcode/:barcode ───────────────────────────────────────────
def get_item_by_barcode(barcode):
    conn = get_connection()
    row  = conn.execute("SELECT * FROM items WHERE barcode = ?", (barcode,)).fetchone()
    conn.close()
    if not row:
        return None
    return row_to_dict(row)


# ── POST /api/items ───────────────────────────────────────────────────────────
def create_item(body):
    name = (body.get("name") or "").strip()
    if not name:
        return None, '"name" is required'

    barcode = (body.get("barcode") or "").strip() or None

    if barcode:
        conn = get_connection()
        existing = conn.execute("SELECT id FROM items WHERE barcode = ?", (barcode,)).fetchone()
        conn.close()
        if existing:
            return None, f'Barcode "{barcode}" already exists'

    conn = get_connection()
    try:
        cur = conn.execute(
            """INSERT INTO items (name, category, barcode, qty, price, threshold)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                name,
                (body.get("category") or "General").strip(),
                barcode,
                int(body.get("qty",       0)),
                float(body.get("price",   0.0)),
                int(body.get("threshold", 5)),
            ),
        )
        conn.commit()
        new_id = cur.lastrowid
        row = conn.execute("SELECT * FROM items WHERE id = ?", (new_id,)).fetchone()
        conn.close()
        return row_to_dict(row), None
    except sqlite3.IntegrityError as e:
        conn.close()
        return None, str(e)


# ── PUT /api/items/:id ────────────────────────────────────────────────────────
def update_item(item_id, body):
    conn = get_connection()
    row  = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    if not row:
        conn.close()
        return None, "Item not found"

    current = dict(row)

    # Build update fields dynamically from whatever is provided
    fields = []
    params = []

    if "name" in body:
        name = (body["name"] or "").strip()
        if not name:
            conn.close()
            return None, '"name" cannot be empty'
        fields.append("name = ?");      params.append(name)

    if "category"  in body: fields.append("category = ?");  params.append((body["category"] or "General").strip())
    if "qty"       in body: fields.append("qty = ?");       params.append(int(body["qty"]))
    if "price"     in body: fields.append("price = ?");     params.append(float(body["price"]))
    if "threshold" in body: fields.append("threshold = ?"); params.append(int(body["threshold"]))

    if "barcode" in body:
        new_bc = (body["barcode"] or "").strip() or None
        if new_bc and new_bc != current["barcode"]:
            dup = conn.execute("SELECT id FROM items WHERE barcode = ? AND id != ?", (new_bc, item_id)).fetchone()
            if dup:
                conn.close()
                return None, f'Barcode "{new_bc}" already in use'
        fields.append("barcode = ?"); params.append(new_bc)

    if not fields:
        conn.close()
        return row_to_dict(row), None     # nothing to change

    params.append(item_id)
    conn.execute(f"UPDATE items SET {', '.join(fields)} WHERE id = ?", params)
    conn.commit()
    updated = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    conn.close()
    return row_to_dict(updated), None


# ── PATCH /api/items/:id/restock ─────────────────────────────────────────────
def restock_item(item_id, body):
    if "qty" not in body:
        return None, '"qty" is required'

    conn = get_connection()
    row  = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    if not row:
        conn.close()
        return None, "Item not found"

    conn.execute("UPDATE items SET qty = ? WHERE id = ?", (int(body["qty"]), item_id))
    conn.commit()
    updated = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    conn.close()
    return row_to_dict(updated), None


# ── DELETE /api/items/:id ─────────────────────────────────────────────────────
def delete_item(item_id):
    conn = get_connection()
    row  = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    if not row:
        conn.close()
        return None, "Item not found"

    name = row["name"]
    conn.execute("DELETE FROM items WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return name, None
