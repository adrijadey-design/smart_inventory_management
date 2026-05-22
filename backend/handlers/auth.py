import secrets
import hashlib
import time
from database import get_connection

ACTIVE_TOKENS = {}
TOKEN_EXPIRY_SECONDS = 60 * 60 * 8

def hash_password(password):
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def generate_token():
    return secrets.token_hex(32)

def init_auth():
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            username   TEXT    NOT NULL UNIQUE,
            password   TEXT    NOT NULL,
            role       TEXT    NOT NULL DEFAULT 'staff',
            full_name  TEXT    NOT NULL DEFAULT '',
            created_at TEXT    NOT NULL DEFAULT (datetime('now'))
        );
    """)
    conn.commit()
    conn.close()
    print("[Auth] Auth system ready.")

def login(body):
    username = (body.get('username') or '').strip()
    password = (body.get('password') or '').strip()
    
    if not username or not password:
        return None, 'Username and password are required'

    conn = get_connection()
    user_row = None
    
    try:
        user_row = conn.execute(
            "SELECT id, username, password, user_type as role, full_name FROM employees WHERE username = ? AND status = 'active'",
            (username,)
        ).fetchone()
        
        if not user_row:
            user_row = conn.execute(
                "SELECT id, username, password, role, full_name FROM users WHERE username = ?",
                (username,)
            ).fetchone()
            
    except Exception as e:
        print(f"[Auth Error] Query failed: {e}")
    finally:
        conn.close()

    if not user_row:
        return None, 'Invalid username or password'

    u = dict(user_row)
    
    if u['password'] != hash_password(password):
        return None, 'Invalid username or password'

    token = generate_token()
    expires = time.time() + TOKEN_EXPIRY_SECONDS
    
    ACTIVE_TOKENS[token] = {
        'user_id':   u['id'],
        'username':  u['username'],
        'role':      u['role'],
        'full_name': u['full_name'],
        'expires_at': expires,
    }
    
    print(f"[Auth] '{username}' logged in. Role: {u['role']}")
    
    return {
        'token':      token,
        'username':   u['username'],
        'role':       u['role'],
        'full_name':  u['full_name'],
        'expires_at': int(expires),
    }, None

def logout(token):
    if token in ACTIVE_TOKENS:
        del ACTIVE_TOKENS[token]
        return True
    return False

def verify_token(token):
    if not token or token not in ACTIVE_TOKENS:
        return None
    data = ACTIVE_TOKENS[token]
    if time.time() > data['expires_at']:
        del ACTIVE_TOKENS[token]
        return None
    return data

def extract_token(headers):
    auth = headers.get('Authorization', '') or headers.get('authorization', '')
    if auth.startswith('Bearer '):
        return auth[7:].strip()
    return ''

# ── Permission mapping ─────────────────────────────────────────────────────
# THIS was the bug: sales/purchases permissions were completely missing,
# causing 403 Forbidden on every /api/sales and /api/purchases request.
PERMISSIONS = {
    'admin': [
        # Dashboard & Inventory
        'view_dashboard', 'view_inventory', 'view_alerts', 'view_stats',
        'add_item', 'edit_item', 'delete_item', 'restock_item',
        'export_data',
        # Employees & Suppliers
        'view_employees', 'manage_employees',
        'view_suppliers', 'manage_suppliers',
        # Sales
        'view_sales', 'create_sale', 'manage_sales',
        # Purchases
        'view_purchases', 'create_purchase', 'manage_purchases',
    ],
    'staff': [
        # Dashboard & Inventory
        'view_dashboard', 'view_inventory', 'view_alerts', 'view_stats',
        'restock_item',
        'export_data',
        # Suppliers (read-only)
        'view_suppliers',
        # Sales
        'view_sales', 'create_sale',
        # Purchases
        'view_purchases', 'create_purchase',
    ],
    'owner': [
        # Dashboard & Inventory
        'view_dashboard', 'view_inventory', 'view_alerts', 'view_stats',
        'export_data',
        # Employees & Suppliers (read-only)
        'view_employees',
        'view_suppliers',
        # Sales (read-only)
        'view_sales',
        # Purchases (read-only)
        'view_purchases',
    ],
}

def has_permission(role, action):
    return action in PERMISSIONS.get(role, [])

def change_password(user_id, body):
    old_pw = (body.get('old_password') or '').strip()
    new_pw = (body.get('new_password') or '').strip()
    
    if not old_pw or not new_pw:
        return None, 'Both old and new password are required'
    if len(new_pw) < 6:
        return None, 'New password must be at least 6 characters'
        
    conn = get_connection()
    emp = conn.execute("SELECT password FROM employees WHERE id = ?", (user_id,)).fetchone()
    
    if not emp or dict(emp)['password'] != hash_password(old_pw):
        conn.close()
        return None, 'Old password is incorrect'
        
    conn.execute("UPDATE employees SET password = ? WHERE id = ?", (hash_password(new_pw), user_id))
    conn.commit()
    conn.close()
    return {'message': 'Password changed successfully'}, None

# ── Forgot Password ────────────────────────────────────────────────────────

def setup_security(user_id, body):
    question = (body.get('question') or '').strip()
    answer   = (body.get('answer')   or '').strip().lower()
    
    if not question or not answer:
        return None, 'Question and answer are required'

    conn = get_connection()
    try:
        conn.execute(
            "UPDATE employees SET security_question = ?, security_answer = ? WHERE id = ?",
            (question, hash_password(answer), user_id)
        )
        conn.commit()
    finally:
        conn.close()
    return {'message': 'Security question saved'}, None

def get_security_question(body):
    username = (body.get('username') or '').strip()
    if not username:
        return None, 'Username is required'

    conn = get_connection()
    row = conn.execute(
        "SELECT security_question FROM employees WHERE username = ? AND status = 'active'",
        (username,)
    ).fetchone()
    conn.close()

    if not row or not row['security_question']:
        return None, 'Security question not set. Contact admin.'
    return {'question': row['security_question']}, None

def reset_with_answer(body):
    username     = (body.get('username')     or '').strip()
    answer       = (body.get('answer')       or '').strip().lower()
    new_password = (body.get('new_password') or '').strip()

    if not username or not answer or not new_password:
        return None, 'All fields are required'

    conn = get_connection()
    row = conn.execute(
        "SELECT id, security_answer FROM employees WHERE username = ? AND status = 'active'",
        (username,)
    ).fetchone()

    if not row or dict(row)['security_answer'] != hash_password(answer):
        conn.close()
        return None, 'Incorrect answer or username'

    conn.execute(
        "UPDATE employees SET password = ? WHERE id = ?",
        (hash_password(new_password), row['id'])
    )
    conn.commit()
    conn.close()
    return {'message': 'Password reset successfully'}, None

def admin_reset_password(body):
    emp_number   = (body.get('emp_number')   or '').strip()
    new_password = (body.get('new_password') or '').strip()
    
    if not emp_number or not new_password:
        return None, 'Employee number and new password are required'

    conn = get_connection()
    row = conn.execute(
        "SELECT id, full_name FROM employees WHERE emp_number = ?",
        (emp_number,)
    ).fetchone()
    
    if not row:
        conn.close()
        return None, f'No employee found with number "{emp_number}"'

    conn.execute(
        "UPDATE employees SET password = ? WHERE id = ?",
        (hash_password(new_password), row['id'])
    )
    conn.commit()
    conn.close()
    return {'message': f'Password reset for {row["full_name"]}'}, None
