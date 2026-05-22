# backend/handlers/suppliers.py

from database import get_connection


def init_suppliers():
    """Create suppliers table if it doesn't exist."""
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS suppliers (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_number  TEXT    NOT NULL UNIQUE,
            company_name     TEXT    NOT NULL,
            contact_person   TEXT    DEFAULT '',
            phone            TEXT    NOT NULL,
            gst_number       TEXT    DEFAULT '',
            category         TEXT    DEFAULT 'General',
            payment_terms    TEXT    DEFAULT 'Net 30',
            status           TEXT    NOT NULL DEFAULT 'active',
            created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TRIGGER IF NOT EXISTS suppliers_updated
        AFTER UPDATE ON suppliers
        BEGIN
            UPDATE suppliers SET updated_at = datetime('now') WHERE id = NEW.id;
        END;
    """)
    conn.commit()
    conn.close()
    print("[Setup] Suppliers table ready.")


def get_all_suppliers(query=None):
    conn   = get_connection()
    sql    = "SELECT * FROM suppliers WHERE 1=1"
    params = []

    if query:
        if query.get('status'):
            sql += " AND status = ?"
            params.append(query['status'])
        if query.get('search'):
            s = f"%{query['search']}%"
            sql += " AND (company_name LIKE ? OR supplier_number LIKE ? OR phone LIKE ? OR gst_number LIKE ?)"
            params.extend([s, s, s, s])

    sql += " ORDER BY company_name ASC"
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_supplier(supplier_id):
    conn = get_connection()
    row  = conn.execute("SELECT * FROM suppliers WHERE id = ?", (supplier_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_supplier_stats():
    conn  = get_connection()
    stats = conn.execute("""
        SELECT
            COUNT(*)                                       AS total,
            COUNT(CASE WHEN status='active'   THEN 1 END) AS active,
            COUNT(CASE WHEN status='inactive' THEN 1 END) AS inactive,
            COUNT(DISTINCT category)                       AS categories
        FROM suppliers
    """).fetchone()
    conn.close()
    return dict(stats) if stats else {}


def create_supplier(data):
    required = ['supplier_number', 'company_name', 'phone']
    for f in required:
        if not str(data.get(f, '')).strip():
            return None, f"'{f}' is required"

    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO suppliers
                (supplier_number, company_name, contact_person, phone,
                 gst_number, category, payment_terms, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data['supplier_number'].strip(),
            data['company_name'].strip(),
            data.get('contact_person', '').strip(),
            data['phone'].strip(),
            data.get('gst_number', '').strip(),
            data.get('category', 'General').strip(),
            data.get('payment_terms', 'Net 30').strip(),
            data.get('status', 'active').strip(),
        ))
        conn.commit()
        row = conn.execute("SELECT * FROM suppliers WHERE id = ?", (cur.lastrowid,)).fetchone()
        conn.close()
        return dict(row), None
    except Exception as e:
        conn.close()
        if 'UNIQUE' in str(e):
            return None, f"Supplier number '{data['supplier_number']}' already exists"
        return None, str(e)


def update_supplier(supplier_id, data):
    conn = get_connection()
    row  = conn.execute("SELECT * FROM suppliers WHERE id = ?", (supplier_id,)).fetchone()
    if not row:
        conn.close()
        return None, "Supplier not found"
    try:
        conn.execute("""
            UPDATE suppliers SET
                company_name   = ?,
                contact_person = ?,
                phone          = ?,
                gst_number     = ?,
                category       = ?,
                payment_terms  = ?,
                status         = ?
            WHERE id = ?
        """, (
            data.get('company_name',   row['company_name']),
            data.get('contact_person', row['contact_person']),
            data.get('phone',          row['phone']),
            data.get('gst_number',     row['gst_number']),
            data.get('category',       row['category']),
            data.get('payment_terms',  row['payment_terms']),
            data.get('status',         row['status']),
            supplier_id,
        ))
        conn.commit()
        updated = conn.execute("SELECT * FROM suppliers WHERE id = ?", (supplier_id,)).fetchone()
        conn.close()
        return dict(updated), None
    except Exception as e:
        conn.close()
        return None, str(e)


def delete_supplier(supplier_id):
    conn = get_connection()
    row  = conn.execute("SELECT company_name FROM suppliers WHERE id = ?", (supplier_id,)).fetchone()
    if not row:
        conn.close()
        return None, "Supplier not found"
    conn.execute("DELETE FROM suppliers WHERE id = ?", (supplier_id,))
    conn.commit()
    conn.close()
    return row['company_name'], None
