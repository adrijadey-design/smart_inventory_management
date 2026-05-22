# backend/handlers/employees.py
# Employee management — stores full employee details

import sqlite3
from database import get_connection
from handlers.auth import hash_password


# ── Create employees table ────────────────────────────────────────────────────
def init_employees():
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS employees (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            emp_number    TEXT    NOT NULL UNIQUE,
            full_name     TEXT    NOT NULL,
            gender        TEXT    NOT NULL CHECK(gender IN ('Male','Female','Other')),
            dob           TEXT    NOT NULL,
            phone         TEXT    NOT NULL,
            email         TEXT    NOT NULL UNIQUE,
            address       TEXT    NOT NULL DEFAULT '',
            doj           TEXT    NOT NULL,
            user_type     TEXT    NOT NULL CHECK(user_type IN ('admin','staff','owner')),
            salary        REAL    NOT NULL DEFAULT 0.0,
            username      TEXT    NOT NULL UNIQUE,
            password      TEXT    NOT NULL,
            status        TEXT    NOT NULL DEFAULT 'active'
                          CHECK(status IN ('active','inactive')),
            created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TRIGGER IF NOT EXISTS trg_emp_updated_at
        AFTER UPDATE ON employees FOR EACH ROW
        BEGIN
            UPDATE employees SET updated_at = datetime('now') WHERE id = OLD.id;
        END;

        CREATE INDEX IF NOT EXISTS idx_emp_number   ON employees(emp_number);
        CREATE INDEX IF NOT EXISTS idx_emp_username ON employees(username);
        CREATE INDEX IF NOT EXISTS idx_emp_usertype ON employees(user_type);
    """)
    conn.commit()

    # Seed default admin employee if none exist
    count = conn.execute("SELECT COUNT(*) FROM employees").fetchone()[0]
    if count == 0:
        conn.execute("""
            INSERT INTO employees
              (emp_number, full_name, gender, dob, phone, email,
               address, doj, user_type, salary, username, password)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            'EMP001', 'Disha Pandey', 'Female', '2000-03-11',
            '9638527410', 'admin@stockflow.com',
            'Delhi', '2024-01-01', 'admin','30,000',
            'admin', hash_password('admin123'),
        ))
        conn.commit()
        print("[Employees] Default admin employee created — EMP001 / admin / admin123")

    conn.close()


def emp_to_dict(row):
    d = dict(row)
    d.pop('password', None)   # never send password to frontend
    return d


# ── GET ALL ───────────────────────────────────────────────────────────────────
def get_all_employees(query_params=None):
    if query_params is None:
        query_params = {}

    search    = query_params.get('search',    '').strip()
    user_type = query_params.get('user_type', '').strip()
    status    = query_params.get('status',    '').strip()

    sql    = "SELECT * FROM employees WHERE 1=1"
    params = []

    if search:
        like    = f"%{search.lower()}%"
        sql    += " AND (LOWER(full_name) LIKE ? OR LOWER(emp_number) LIKE ? OR LOWER(email) LIKE ?)"
        params += [like, like, like]

    if user_type:
        sql    += " AND user_type = ?"
        params += [user_type]

    if status:
        sql    += " AND status = ?"
        params += [status]

    sql += " ORDER BY emp_number ASC"

    conn = get_connection()
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [emp_to_dict(r) for r in rows]


# ── GET ONE ───────────────────────────────────────────────────────────────────
def get_employee(emp_id):
    conn = get_connection()
    row  = conn.execute(
        "SELECT * FROM employees WHERE id = ?", (emp_id,)
    ).fetchone()
    conn.close()
    return emp_to_dict(row) if row else None


# ── CREATE ────────────────────────────────────────────────────────────────────
def create_employee(body):
    required = ['emp_number','full_name','gender','dob','phone',
                'email','doj','user_type','username','password']
    for f in required:
        if not (body.get(f) or '').strip():
            return None, f'"{f}" is required'

    conn = get_connection()

    # Check duplicates
    if conn.execute("SELECT id FROM employees WHERE emp_number = ?",
                    (body['emp_number'],)).fetchone():
        conn.close(); return None, f'Employee number "{body["emp_number"]}" already exists'

    if conn.execute("SELECT id FROM employees WHERE username = ?",
                    (body['username'],)).fetchone():
        conn.close(); return None, f'Username "{body["username"]}" already taken'

    if conn.execute("SELECT id FROM employees WHERE email = ?",
                    (body['email'],)).fetchone():
        conn.close(); return None, f'Email "{body["email"]}" already registered'

    try:
        cur = conn.execute("""
            INSERT INTO employees
              (emp_number, full_name, gender, dob, phone, email,
               address, doj, user_type, salary, username, password, status)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            body['emp_number'].strip(),
            body['full_name'].strip(),
            body['gender'].strip(),
            body['dob'].strip(),
            body['phone'].strip(),
            body['email'].strip(),
            (body.get('address') or '').strip(),
            body['doj'].strip(),
            body['user_type'].strip(),
            float(body.get('salary') or 0),
            body['username'].strip(),
            hash_password(body['password'].strip()),
            body.get('status', 'active'),
        ))
        conn.commit()
        row = conn.execute(
            "SELECT * FROM employees WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
        conn.close()
        return emp_to_dict(row), None
    except Exception as e:
        conn.close()
        return None, str(e)


# ── UPDATE ────────────────────────────────────────────────────────────────────
def update_employee(emp_id, body):
    conn = get_connection()
    row  = conn.execute(
        "SELECT * FROM employees WHERE id = ?", (emp_id,)
    ).fetchone()
    if not row:
        conn.close(); return None, "Employee not found"

    fields, params = [], []

    simple = ['full_name','gender','dob','phone','email',
              'address','doj','user_type','status']
    for f in simple:
        if f in body:
            fields.append(f"{f} = ?"); params.append((body[f] or '').strip())

    if 'salary' in body:
        fields.append("salary = ?"); params.append(float(body['salary'] or 0))

    if 'username' in body:
        new_u = (body['username'] or '').strip()
        if new_u and new_u != row['username']:
            dup = conn.execute(
                "SELECT id FROM employees WHERE username = ? AND id != ?",
                (new_u, emp_id)
            ).fetchone()
            if dup:
                conn.close(); return None, f'Username "{new_u}" already taken'
        fields.append("username = ?"); params.append(new_u)

    if 'password' in body and (body['password'] or '').strip():
        fields.append("password = ?")
        params.append(hash_password(body['password'].strip()))

    if not fields:
        conn.close(); return emp_to_dict(row), None

    params.append(emp_id)
    conn.execute(f"UPDATE employees SET {', '.join(fields)} WHERE id = ?", params)
    conn.commit()
    updated = conn.execute(
        "SELECT * FROM employees WHERE id = ?", (emp_id,)
    ).fetchone()
    conn.close()
    return emp_to_dict(updated), None


# ── DELETE ────────────────────────────────────────────────────────────────────
def delete_employee(emp_id):
    conn = get_connection()
    row  = conn.execute(
        "SELECT * FROM employees WHERE id = ?", (emp_id,)
    ).fetchone()
    if not row:
        conn.close(); return None, "Employee not found"
    name = row['full_name']
    conn.execute("DELETE FROM employees WHERE id = ?", (emp_id,))
    conn.commit()
    conn.close()
    return name, None


# ── STATS ─────────────────────────────────────────────────────────────────────
def get_employee_stats():
    conn = get_connection()
    total  = conn.execute("SELECT COUNT(*) FROM employees").fetchone()[0]
    active = conn.execute("SELECT COUNT(*) FROM employees WHERE status='active'").fetchone()[0]
    by_role = {
        r[0]: r[1] for r in conn.execute(
            "SELECT user_type, COUNT(*) FROM employees GROUP BY user_type"
        ).fetchall()
    }
    conn.close()
    return {
        'total': total, 'active': active,
        'inactive': total - active, 'by_role': by_role,
    }
