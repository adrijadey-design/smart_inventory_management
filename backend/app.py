import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import init_db, seed_db
from handlers.auth      import init_auth
from handlers.employees import init_employees
from handlers.suppliers import init_suppliers
from handlers.sales     import init_sales
from handlers.purchases import init_purchases
from handlers.expiry    import init_expiry
from server import StockFlowHandler, HTTPServer, HOST, PORT


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT

    print("=" * 50)
    print("  StockFlow Inventory API")
    print("  Pure Python — no external dependencies")
    print("=" * 50)

    print("\n[Setup] Initialising database...")
    init_db()
    seed_db()
    init_auth()

    print("[Setup] Initialising employees...")
    init_employees()

    print("[Setup] Initialising suppliers...")
    init_suppliers()

    print("[Setup] Initialising sales & purchases...")
    init_sales()
    init_purchases()

    print("[Setup] Initialising expiry tracking...")
    init_expiry()

    httpd = HTTPServer((HOST, port), StockFlowHandler)
    print(f"\n[Server] Running at http://localhost:{port}")
    print("[Server] Press Ctrl+C to stop.\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Server] Stopped.")
        httpd.server_close()


if __name__ == "__main__":
    main()
