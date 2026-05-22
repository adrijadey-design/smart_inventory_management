# backend/server.py
import json, sys, os
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.dirname(__file__))

from router import match_route, PUBLIC_ROUTES, ROUTE_PERMISSIONS
from handlers import items     as items_handler
from handlers import stats     as stats_handler
from handlers import export    as export_handler
from handlers import employees as emp_handler
from handlers import analytics as analytics_handler
from handlers import suppliers as sup_handler
from handlers import sales     as sales_handler
from handlers import purchases as pur_handler
from handlers import expiry    as expiry_handler
from handlers.auth import (
    login, logout, verify_token, extract_token, has_permission,
    change_password, setup_security, get_security_question,
    reset_with_answer, admin_reset_password
)

HOST = "0.0.0.0"
PORT = 5000
ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]

def send_json(handler, data, status=200):
    body = json.dumps(data, default=str).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    _add_cors(handler); handler.end_headers(); handler.wfile.write(body)

def send_file(handler, data, content_type, filename):
    handler.send_response(200)
    handler.send_header("Content-Type", content_type)
    handler.send_header("Content-Disposition", f'attachment; filename="{filename}"')
    handler.send_header("Content-Length", str(len(data)))
    _add_cors(handler); handler.end_headers(); handler.wfile.write(data)

def send_ok(handler, data=None, message="OK", status=200):
    payload = {"success": True, "message": message}
    if data is not None: payload["data"] = data
    send_json(handler, payload, status)

def send_error(handler, message, status=400):
    send_json(handler, {"success": False, "error": message}, status)

def _add_cors(handler):
    origin = handler.headers.get("Origin", "")
    handler.send_header("Access-Control-Allow-Origin",
                        origin if origin in ALLOWED_ORIGINS else ALLOWED_ORIGINS[0])
    handler.send_header("Access-Control-Allow-Methods",
                        "GET, POST, PUT, PATCH, DELETE, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
    handler.send_header("Access-Control-Allow-Credentials", "true")

def read_body(handler):
    length = int(handler.headers.get("Content-Length", 0))
    if length == 0: return {}
    try: return json.loads(handler.rfile.read(length).decode("utf-8"))
    except: return {}

def parse_query(path):
    parsed = urlparse(path)
    return parsed.path, {k: v[0] for k, v in parse_qs(parsed.query).items()}


class StockFlowHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} — {fmt % args}")

    def _dispatch(self, method):
        path, query = parse_query(self.path)
        key, params = match_route(method, path)
        if key is None: send_error(self, "Not found", 404); return

        if key == "options":
            self.send_response(204); _add_cors(self); self.end_headers(); return

        user = None
        if key not in PUBLIC_ROUTES:
            token = extract_token(self.headers)
            user  = verify_token(token)
            if not user: send_error(self, "Unauthorized — please log in", 401); return
            required = ROUTE_PERMISSIONS.get(key)
            if required and not has_permission(user['role'], required):
                send_error(self, "Forbidden — your role cannot do this", 403); return

        try:
            self._route(key, params, query, user)
        except Exception as e:
            import traceback; traceback.print_exc()
            send_error(self, "Internal server error", 500)

    def _route(self, key, params, query, user):
        # ── Health ──────────────────────────────────────────────────────────
        if key == "health": send_ok(self, message="StockFlow API running"); return

        # ── Auth ────────────────────────────────────────────────────────────
        if key == "auth_login":
            body = read_body(self); data, err = login(body)
            if err: send_error(self, err, 401); return
            send_ok(self, data, "Login successful"); return
        if key == "auth_logout":
            logout(extract_token(self.headers)); send_ok(self, message="Logged out"); return
        if key == "auth_me":
            send_ok(self, {'username':user['username'],'role':user['role'],'full_name':user['full_name']}); return
        if key == "auth_change_pw":
            body = read_body(self); data, err = change_password(user['user_id'], body)
            if err: send_error(self, err); return
            send_ok(self, message="Password changed"); return
        if key == "auth_setup_sec":
            body = read_body(self); data, err = setup_security(user['user_id'], body)
            if err: send_error(self, err); return
            send_ok(self, message="Security question saved"); return
        if key == "auth_get_question":
            body = read_body(self); data, err = get_security_question(body)
            if err: send_error(self, err, 404); return
            send_ok(self, data); return
        if key == "auth_reset_pw":
            body = read_body(self); data, err = reset_with_answer(body)
            if err: send_error(self, err); return
            send_ok(self, message="Password reset successfully"); return
        if key == "auth_admin_reset":
            body = read_body(self); data, err = admin_reset_password(body)
            if err: send_error(self, err); return
            send_ok(self, message=data['message']); return

        # ── Stats ───────────────────────────────────────────────────────────
        if key == "stats": send_ok(self, stats_handler.get_stats()); return

        # ── Items ───────────────────────────────────────────────────────────
        if key == "items_list":    send_ok(self, items_handler.get_all_items(query)); return
        if key == "items_get":
            item = items_handler.get_item_by_id(int(params["id"]))
            if not item: send_error(self, "Not found", 404); return
            send_ok(self, item); return
        if key == "items_barcode":
            item = items_handler.get_item_by_barcode(params["barcode"])
            if not item: send_error(self, "Not found", 404); return
            send_ok(self, item); return
        if key == "items_create":
            body = read_body(self); item, err = items_handler.create_item(body)
            if err: send_error(self, err); return
            send_ok(self, item, "Item created", 201); return
        if key == "items_update":
            body = read_body(self); item, err = items_handler.update_item(int(params["id"]), body)
            if err: send_error(self, err, 404 if "not found" in err.lower() else 400); return
            send_ok(self, item, "Item updated"); return
        if key == "items_restock":
            body = read_body(self); item, err = items_handler.restock_item(int(params["id"]), body)
            if err: send_error(self, err, 400); return
            send_ok(self, item, "Stock updated"); return
        if key == "items_delete":
            name, err = items_handler.delete_item(int(params["id"]))
            if err: send_error(self, err, 404); return
            send_ok(self, message=f'"{name}" deleted'); return

        # ── Analytics ───────────────────────────────────────────────────────
        if key == "analytics":
            send_ok(self, analytics_handler.get_analytics()); return

        # ── Employees ───────────────────────────────────────────────────────
        if key == "emp_list":    send_ok(self, emp_handler.get_all_employees(query)); return
        if key == "emp_stats":   send_ok(self, emp_handler.get_employee_stats()); return
        if key == "emp_get":
            emp = emp_handler.get_employee(int(params["id"]))
            if not emp: send_error(self, "Employee not found", 404); return
            send_ok(self, emp); return
        if key == "emp_create":
            body = read_body(self); emp, err = emp_handler.create_employee(body)
            if err: send_error(self, err); return
            send_ok(self, emp, "Employee added", 201); return
        if key == "emp_update":
            body = read_body(self); emp, err = emp_handler.update_employee(int(params["id"]), body)
            if err: send_error(self, err, 404 if "not found" in err.lower() else 400); return
            send_ok(self, emp, "Employee updated"); return
        if key == "emp_delete":
            name, err = emp_handler.delete_employee(int(params["id"]))
            if err: send_error(self, err, 404); return
            send_ok(self, message=f'"{name}" removed'); return

        # ── Suppliers ───────────────────────────────────────────────────────
        if key == "sup_list":    send_ok(self, sup_handler.get_all_suppliers(query)); return
        if key == "sup_stats":   send_ok(self, sup_handler.get_supplier_stats()); return
        if key == "sup_get":
            sup = sup_handler.get_supplier(int(params["id"]))
            if not sup: send_error(self, "Supplier not found", 404); return
            send_ok(self, sup); return
        if key == "sup_create":
            body = read_body(self); sup, err = sup_handler.create_supplier(body)
            if err: send_error(self, err); return
            send_ok(self, sup, "Supplier added", 201); return
        if key == "sup_update":
            body = read_body(self); sup, err = sup_handler.update_supplier(int(params["id"]), body)
            if err: send_error(self, err, 404 if "not found" in err.lower() else 400); return
            send_ok(self, sup, "Supplier updated"); return
        if key == "sup_delete":
            name, err = sup_handler.delete_supplier(int(params["id"]))
            if err: send_error(self, err, 404); return
            send_ok(self, message=f'"{name}" removed'); return

        # ── Sales ───────────────────────────────────────────────────────────
        if key == "sales_list":  send_ok(self, sales_handler.get_all_sales(query)); return
        if key == "sales_stats": send_ok(self, sales_handler.get_sales_stats()); return
        if key == "sales_get":
            sale = sales_handler.get_sale(int(params["id"]))
            if not sale: send_error(self, "Sale not found", 404); return
            send_ok(self, sale); return
        if key == "sales_create":
            body = read_body(self)
            sale, err = sales_handler.create_sale(body, user['username'])
            if err: send_error(self, err); return
            send_ok(self, sale, "Sale recorded", 201); return
        if key == "sales_delete":
            inv, err = sales_handler.delete_sale(int(params["id"]))
            if err: send_error(self, err, 404); return
            send_ok(self, message=f'Sale "{inv}" deleted & stock restored'); return

        # ── Purchases ───────────────────────────────────────────────────────
        if key == "pur_list":    send_ok(self, pur_handler.get_all_purchases(query)); return
        if key == "pur_stats":   send_ok(self, pur_handler.get_purchase_stats()); return
        if key == "pur_get":
            pur = pur_handler.get_purchase(int(params["id"]))
            if not pur: send_error(self, "Purchase not found", 404); return
            send_ok(self, pur); return
        if key == "pur_create":
            body = read_body(self)
            pur, err = pur_handler.create_purchase(body, user['username'])
            if err: send_error(self, err); return
            send_ok(self, pur, "Purchase recorded", 201); return
        if key == "pur_payment":
            body = read_body(self)
            pur, err = pur_handler.update_payment_status(int(params["id"]), body)
            if err: send_error(self, err, 404); return
            send_ok(self, pur, "Payment status updated"); return
        if key == "pur_delete":
            po, err = pur_handler.delete_purchase(int(params["id"]))
            if err: send_error(self, err, 404); return
            send_ok(self, message=f'Purchase "{po}" deleted & stock reversed'); return

        # ── Expiry ──────────────────────────────────────────────────────────
        if key == "expiry_overview":
            days = int(query.get('days', 30))
            send_ok(self, expiry_handler.get_expiry_overview(days)); return
        if key == "expiry_items":
            send_ok(self, expiry_handler.get_all_items_with_expiry()); return
        if key == "expiry_update":
            body = read_body(self)
            item, err = expiry_handler.update_item_expiry(int(params["id"]), body)
            if err: send_error(self, err, 404); return
            send_ok(self, item, "Expiry info updated"); return

        # ── Export ──────────────────────────────────────────────────────────
        if key == "export_csv":
            data, fname = export_handler.export_csv()
            send_file(self, data, "text/csv", fname); return
        if key == "export_report":
            data, fname = export_handler.export_report()
            send_file(self, data, "text/plain", fname); return

        send_error(self, "Unhandled route", 500)

    def do_GET(self):    self._dispatch("GET")
    def do_POST(self):   self._dispatch("POST")
    def do_PUT(self):    self._dispatch("PUT")
    def do_PATCH(self):  self._dispatch("PATCH")
    def do_DELETE(self): self._dispatch("DELETE")
    def do_OPTIONS(self):self._dispatch("OPTIONS")
