# backend/router.py
import re

ROUTES = [
    # Auth
    ("POST",   r"^/api/auth/login$",                        "auth_login",        []),
    ("POST",   r"^/api/auth/logout$",                       "auth_logout",       []),
    ("GET",    r"^/api/auth/me$",                           "auth_me",           []),
    ("POST",   r"^/api/auth/change-password$",              "auth_change_pw",    []),
    ("POST",   r"^/api/auth/setup-security$",               "auth_setup_sec",    []),
    ("POST",   r"^/api/auth/get-question$",                 "auth_get_question", []),
    ("POST",   r"^/api/auth/reset-password$",               "auth_reset_pw",     []),
    ("POST",   r"^/api/auth/admin-reset$",                  "auth_admin_reset",  []),

    # Health & Stats
    ("GET",    r"^/api/health$",                            "health",            []),
    ("GET",    r"^/api/stats$",                             "stats",             []),

    # Items — specific before wildcard
    ("GET",    r"^/api/items/barcode/([^/]+)$",             "items_barcode",     ["barcode"]),
    ("GET",    r"^/api/items$",                             "items_list",        []),
    ("POST",   r"^/api/items$",                             "items_create",      []),
    ("GET",    r"^/api/items/(\d+)$",                       "items_get",         ["id"]),
    ("PUT",    r"^/api/items/(\d+)$",                       "items_update",      ["id"]),
    ("PATCH",  r"^/api/items/(\d+)/restock$",               "items_restock",     ["id"]),
    ("DELETE", r"^/api/items/(\d+)$",                       "items_delete",      ["id"]),

    # Employees — stats before (\d+)
    ("GET",    r"^/api/employees/stats$",                   "emp_stats",         []),
    ("GET",    r"^/api/employees$",                         "emp_list",          []),
    ("POST",   r"^/api/employees$",                         "emp_create",        []),
    ("GET",    r"^/api/employees/(\d+)$",                   "emp_get",           ["id"]),
    ("PUT",    r"^/api/employees/(\d+)$",                   "emp_update",        ["id"]),
    ("DELETE", r"^/api/employees/(\d+)$",                   "emp_delete",        ["id"]),

    # Suppliers — stats before (\d+)
    ("GET",    r"^/api/suppliers/stats$",                   "sup_stats",         []),
    ("GET",    r"^/api/suppliers$",                         "sup_list",          []),
    ("POST",   r"^/api/suppliers$",                         "sup_create",        []),
    ("GET",    r"^/api/suppliers/(\d+)$",                   "sup_get",           ["id"]),
    ("PUT",    r"^/api/suppliers/(\d+)$",                   "sup_update",        ["id"]),
    ("DELETE", r"^/api/suppliers/(\d+)$",                   "sup_delete",        ["id"]),

    # Sales — stats before (\d+)
    ("GET",    r"^/api/sales/stats$",                       "sales_stats",       []),
    ("GET",    r"^/api/sales$",                             "sales_list",        []),
    ("POST",   r"^/api/sales$",                             "sales_create",      []),
    ("GET",    r"^/api/sales/(\d+)$",                       "sales_get",         ["id"]),
    ("DELETE", r"^/api/sales/(\d+)$",                       "sales_delete",      ["id"]),

    # Purchases — stats before (\d+)
    ("GET",    r"^/api/purchases/stats$",                   "pur_stats",         []),
    ("GET",    r"^/api/purchases$",                         "pur_list",          []),
    ("POST",   r"^/api/purchases$",                         "pur_create",        []),
    ("GET",    r"^/api/purchases/(\d+)$",                   "pur_get",           ["id"]),
    ("PATCH",  r"^/api/purchases/(\d+)/payment$",           "pur_payment",       ["id"]),
    ("DELETE", r"^/api/purchases/(\d+)$",                   "pur_delete",        ["id"]),

    # Expiry
    ("GET",    r"^/api/expiry$",                            "expiry_overview",   []),
    ("GET",    r"^/api/expiry/items$",                      "expiry_items",      []),
    ("PATCH",  r"^/api/expiry/items/(\d+)$",               "expiry_update",     ["id"]),

    # Analytics
    ("GET",    r"^/api/analytics$",                         "analytics",         []),

    # Export
    ("GET",    r"^/api/export/csv$",                        "export_csv",        []),
    ("GET",    r"^/api/export/report$",                     "export_report",     []),
]

PUBLIC_ROUTES = {
    "health", "auth_login", "auth_get_question",
    "auth_reset_pw", "options"
}

ROUTE_PERMISSIONS = {
    # Items
    "items_list":       "view_inventory",
    "items_get":        "view_inventory",
    "items_barcode":    "view_inventory",
    "items_create":     "add_item",
    "items_update":     "edit_item",
    "items_restock":    "restock_item",
    "items_delete":     "delete_item",
    # Stats & Analytics
    "stats":            "view_stats",
    "analytics":        "view_stats",
    # Export
    "export_csv":       "export_data",
    "export_report":    "export_data",
    # Employees
    "emp_list":         "view_employees",
    "emp_get":          "view_employees",
    "emp_stats":        "view_employees",
    "emp_create":       "manage_employees",
    "emp_update":       "manage_employees",
    "emp_delete":       "manage_employees",
    # Suppliers
    "sup_list":         "view_inventory",
    "sup_get":          "view_inventory",
    "sup_stats":        "view_inventory",
    "sup_create":       "manage_employees",
    "sup_update":       "manage_employees",
    "sup_delete":       "manage_employees",
    # Sales
    "sales_list":       "view_sales",
    "sales_get":        "view_sales",
    "sales_stats":      "view_sales",
    "sales_create":     "create_sale",
    "sales_delete":     "manage_sales",
    # Purchases
    "pur_list":         "view_purchases",
    "pur_get":          "view_purchases",
    "pur_stats":        "view_purchases",
    "pur_create":       "create_purchase",
    "pur_payment":      "create_purchase",
    "pur_delete":       "manage_sales",
    # Expiry
    "expiry_overview":  "view_inventory",
    "expiry_items":     "view_inventory",
    "expiry_update":    "edit_item",
    # Auth
    "auth_admin_reset": "manage_employees",
    "auth_me":          None,
    "auth_logout":      None,
    "auth_change_pw":   None,
    "auth_setup_sec":   None,
}


def match_route(method, path):
    if method == "OPTIONS":
        return "options", {}
    path = path.rstrip('/') or '/'
    for route_method, pattern, key, param_names in ROUTES:
        if route_method != method:
            continue
        m = re.match(pattern, path)
        if m:
            params = dict(zip(param_names, m.groups()))
            return key, params
    return None, None
