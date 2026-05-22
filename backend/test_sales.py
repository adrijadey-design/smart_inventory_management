# backend/test_sales.py

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

print("=" * 50)
print("StockFlow — Sales Diagnostic Test")
print("=" * 50)

# Test 1: Database connection
print("\n[1] Testing database connection...")
try:
    from database import get_connection
    conn = get_connection()
    print("    OK — Database connected")
    conn.close()
except Exception as e:
    print(f"    FAIL — {e}")
    sys.exit(1)

# Test 2: Check if items table exists and has data
print("\n[2] Checking items table...")
try:
    conn = get_connection()
    items = conn.execute("SELECT COUNT(*) AS c FROM items").fetchone()
    print(f"    OK — items table has {items['c']} rows")
    if items['c'] == 0:
        print("    WARNING — No items in inventory! Add items first before recording sales.")
    conn.close()
except Exception as e:
    print(f"    FAIL — {e}")

# Test 3: Init sales tables
print("\n[3] Running init_sales()...")
try:
    from handlers.sales import init_sales
    init_sales()
    print("    OK — init_sales() completed")
except Exception as e:
    print(f"    FAIL — {e}")

# Test 4: Check sales table structure
print("\n[4] Checking sales table columns...")
try:
    conn = get_connection()
    cols = [r[1] for r in conn.execute("PRAGMA table_info(sales)").fetchall()]
    print(f"    Columns: {cols}")
    required = ['id','invoice_number','payment_status','discount_amount','total']
    missing  = [c for c in required if c not in cols]
    if missing:
        print(f"    WARNING — Missing columns: {missing}")
    else:
        print("    OK — All required columns present")
    conn.close()
except Exception as e:
    print(f"    FAIL — {e}")

# Test 5: get_sales_stats()
print("\n[5] Testing get_sales_stats()...")
try:
    from handlers.sales import get_sales_stats
    stats = get_sales_stats()
    print(f"    OK — Stats: {stats}")
except Exception as e:
    print(f"    FAIL — {e}")

# Test 6: get_all_sales()
print("\n[6] Testing get_all_sales()...")
try:
    from handlers.sales import get_all_sales
    sales = get_all_sales()
    print(f"    OK — {len(sales)} sales found")
except Exception as e:
    print(f"    FAIL — {e}")

# Test 7: Init purchases
print("\n[7] Running init_purchases()...")
try:
    from handlers.purchases import init_purchases
    init_purchases()
    print("    OK — init_purchases() completed")
except Exception as e:
    print(f"    FAIL — {e}")

# Test 8: get_purchase_stats()
print("\n[8] Testing get_purchase_stats()...")
try:
    from handlers.purchases import get_purchase_stats
    stats = get_purchase_stats()
    print(f"    OK — Stats: {stats}")
except Exception as e:
    print(f"    FAIL — {e}")

print("\n" + "=" * 50)
print("Diagnostic complete. Share output above if errors persist.")
print("=" * 50)
