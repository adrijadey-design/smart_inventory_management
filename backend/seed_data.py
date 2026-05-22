#!/usr/bin/env python3
"""
StockFlow — Realistic Grocery Shop Seed Data (100 items)
Run from the backend/ directory:  python seed_data.py

Auto-detects your actual DB column names so it works regardless of
which version of the schema you have.
"""
import sys, os, random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))
from database import get_connection

def run():
    conn = get_connection()
    now  = datetime.now()

    def da(n):  return (now - timedelta(days=n)).strftime('%Y-%m-%d %H:%M:%S')
    def ah(n):  return (now + timedelta(days=n)).strftime('%Y-%m-%d')

    # ── Auto-detect actual column names ──────────────────────────────
    def cols(table):
        return {r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()}

    sup_cols  = cols('suppliers')
    item_cols = cols('items')

    print(f"[Seed] suppliers columns: {sorted(sup_cols)}")
    print(f"[Seed] items columns    : {sorted(item_cols)}")

    # ── Wipe existing data ────────────────────────────────────────────
    conn.executescript("""
        DELETE FROM sale_items;
        DELETE FROM sales;
        DELETE FROM purchase_items;
        DELETE FROM purchases;
        DELETE FROM items;
        DELETE FROM suppliers;
    """)
    conn.commit()
    print("[Seed] Cleared old data.")

    # ══════════════════════════════════════════════════════════════════
    # 1. SUPPLIERS (10)
    # ══════════════════════════════════════════════════════════════════
    suppliers_raw = [
        ("Agro Fresh Distributors",  "Ramesh Gupta",   "9831001001", "ramesh@agrofresh.in",    "12 Market Lane, Kolkata",    "GSTIN24AB001", "Net 30",    "Grocery"),
        ("Metro Wholesale Hub",      "Sunita Sharma",  "9831002002", "sunita@metrowholesale.in","45 Trade Road, Delhi",       "GSTIN24AB002", "Net 15",    "Grocery"),
        ("Patil General Supplies",   "Vijay Patil",    "9831003003", "vijay@patilsupplies.in",  "7 Industrial Area, Pune",    "GSTIN24AB003", "Immediate", "Grocery"),
        ("Bengal Provisions Co.",    "Anita Das",      "9831004004", "anita@bengalprov.in",     "88 Strand Road, Kolkata",    "GSTIN24AB004", "Net 30",    "Grocery"),
        ("National Food Links",      "Deepak Mehta",   "9831005005", "deepak@nationalfood.in",  "23 NH8 Highway, Ahmedabad",  "GSTIN24AB005", "Net 15",    "Grocery"),
        ("Himalayan Spice House",    "Priya Nair",     "9831006006", "priya@himalayanspice.in", "5 Spice Market, Kochi",      "GSTIN24AB006", "Net 45",    "Grocery"),
        ("Sunrise Dairy Depot",      "Mohit Yadav",    "9831007007", "mohit@sunrisedairy.in",   "12 Milk Colony, Jaipur",     "GSTIN24AB007", "Immediate", "Grocery"),
        ("FastTrack FMCG Ltd.",      "Kavya Reddy",    "9831008008", "kavya@fasttrackfmcg.in",  "67 Ring Road, Hyderabad",    "GSTIN24AB008", "Net 30",    "Grocery"),
        ("Eastern Dry Fruits Hub",   "Salim Khan",     "9831009009", "salim@easterndryfruit.in","14 Chandni Chowk, Delhi",    "GSTIN24AB009", "Net 15",    "Grocery"),
        ("South India Provisions",   "Lakshmi Iyer",   "9831010010", "lakshmi@siprovisions.in", "33 Anna Salai, Chennai",     "GSTIN24AB010", "Net 30",    "Grocery"),
    ]
    # s = (company_name, contact, phone, email, address, gst, payment_terms, category)

    sup_ids = []
    for i, s in enumerate(suppliers_raw):
        sup_num = f"SUP{i+1:03d}"

        # Build INSERT dynamically based on what columns exist
        col_map = {}
        col_map['company_name']   = s[0]
        col_map['payment_terms']  = s[6]
        col_map['status']         = 'active'
        col_map['created_at']     = da(random.randint(60, 180))

        # contact column name varies
        if 'contact_person' in sup_cols:
            col_map['contact_person'] = s[1]
        elif 'contact_name' in sup_cols:
            col_map['contact_name'] = s[1]

        col_map['phone'] = s[2]

        if 'email' in sup_cols:
            col_map['email'] = s[3]
        if 'address' in sup_cols:
            col_map['address'] = s[4]

        # GST column name varies
        if 'gst_number' in sup_cols:
            col_map['gst_number'] = s[5]
        elif 'gstin' in sup_cols:
            col_map['gstin'] = s[5]

        if 'supplier_number' in sup_cols:
            col_map['supplier_number'] = sup_num
        if 'category' in sup_cols:
            col_map['category'] = s[7]

        keys   = list(col_map.keys())
        values = [col_map[k] for k in keys]
        sql    = f"INSERT INTO suppliers ({','.join(keys)}) VALUES ({','.join(['?']*len(keys))})"
        cur    = conn.execute(sql, values)
        sup_ids.append(cur.lastrowid)

    conn.commit()
    print(f"[Seed] {len(sup_ids)} suppliers inserted.")

    # ══════════════════════════════════════════════════════════════════
    # 2. ITEMS (100)
    # (name, barcode, category, price, cost, qty, min_qty, sup_idx)
    # ══════════════════════════════════════════════════════════════════
    raw_items = [
        # ── Staples (12) ──
        ("Basmati Rice 5kg",          "8901234000001","Staples",    320,240, 45,10,0),
        ("Atta Whole Wheat 10kg",     "8901234000002","Staples",    420,310, 30, 8,0),
        ("Toor Dal 1kg",              "8901234000003","Staples",    145,108, 60,15,1),
        ("Moong Dal 500g",            "8901234000004","Staples",     78, 58, 40,10,1),
        ("Chana Dal 1kg",             "8901234000005","Staples",    110, 82, 35,10,0),
        ("Masoor Dal 1kg",            "8901234000006","Staples",    120, 90, 28,10,1),
        ("Urad Dal 500g",             "8901234000007","Staples",     85, 63, 32, 8,1),
        ("Sooji Rava 1kg",            "8901234000008","Staples",     55, 41, 50,12,0),
        ("Refined Sugar 1kg",         "8901234000009","Staples",     48, 36, 80,20,1),
        ("Salt Iodised 1kg",          "8901234000010","Staples",     22, 16, 90,20,3),
        ("Poha Flattened Rice 500g",  "8901234000011","Staples",     42, 31, 45,10,0),
        ("Vermicelli 200g",           "8901234000012","Staples",     28, 21, 38, 8,0),
        # ── Oils & Ghee (8) ──
        ("Mustard Oil 1L",            "8901234000013","Oils",       185,138, 50,12,2),
        ("Sunflower Oil 1L",          "8901234000014","Oils",       155,115, 55,12,2),
        ("Coconut Oil 500ml",         "8901234000015","Oils",       120, 90, 30, 8,5),
        ("Soyabean Oil 1L",           "8901234000016","Oils",       145,108, 40,10,2),
        ("Rice Bran Oil 1L",          "8901234000017","Oils",       160,120, 35,10,2),
        ("Olive Oil 500ml",           "8901234000018","Oils",       380,285, 18, 5,4),
        ("Ghee Pure 1L",              "8901234000019","Oils",       680,510,  3, 8,6),
        ("Vanaspati 1kg",             "8901234000020","Oils",        95, 71, 25, 8,2),
        # ── Spices (12) ──
        ("Turmeric Powder 200g",      "8901234000021","Spices",      55, 40, 70,15,5),
        ("Red Chilli Powder 200g",    "8901234000022","Spices",      65, 48, 65,15,5),
        ("Coriander Powder 200g",     "8901234000023","Spices",      48, 35, 60,15,5),
        ("Garam Masala 100g",         "8901234000024","Spices",      75, 56, 50,10,5),
        ("Cumin Seeds 100g",          "8901234000025","Spices",      60, 44, 55,10,5),
        ("Mustard Seeds 100g",        "8901234000026","Spices",      38, 28, 48,10,5),
        ("Cardamom 50g",              "8901234000027","Spices",     145,109, 20, 5,5),
        ("Cloves 50g",                "8901234000028","Spices",     120, 90, 18, 5,5),
        ("Bay Leaves 50g",            "8901234000029","Spices",      38, 28, 35,10,5),
        ("Black Pepper 100g",         "8901234000030","Spices",      95, 71, 30, 8,5),
        ("Saffron 1g",                "8901234000031","Spices",     180,135,  0, 2,5),
        ("Asafoetida 50g",            "8901234000032","Spices",      65, 49, 28, 8,5),
        # ── Dairy (10) ──
        ("Amul Butter 500g",          "8901234000033","Dairy",      280,220, 25, 8,6),
        ("Amul Cheese Slice 200g",    "8901234000034","Dairy",      145,112, 20, 6,6),
        ("Nestle Milkmaid 400g",      "8901234000035","Dairy",      130, 98, 30, 8,6),
        ("Curd 400g",                 "8901234000036","Dairy",       48, 36, 40,10,6),
        ("Paneer 200g",               "8901234000037","Dairy",       95, 72, 15, 5,6),
        ("Amul Taaza Milk 1L",        "8901234000038","Dairy",       68, 51, 50,15,6),
        ("Condensed Milk 400g",       "8901234000039","Dairy",      125, 94, 22, 6,6),
        ("Cream 200ml",               "8901234000040","Dairy",       85, 64, 18, 5,6),
        ("Skimmed Milk Powder 500g",  "8901234000041","Dairy",      295,221, 12, 4,6),
        ("Lassi 200ml",               "8901234000042","Dairy",       35, 26, 30, 8,6),
        # ── Packaged Food (14) ──
        ("Maggi Noodles 70g",         "8901234000043","Packaged",    15, 11,120,30,7),
        ("Parle-G Biscuits 800g",     "8901234000044","Packaged",    55, 41, 80,20,4),
        ("Hide & Seek 120g",          "8901234000045","Packaged",    35, 26, 60,15,4),
        ("Haldiram Bhujia 200g",      "8901234000046","Packaged",    65, 49, 50,12,4),
        ("Kurkure Masala 90g",        "8901234000047","Packaged",    20, 15,100,25,7),
        ("Lay's Classic 52g",         "8901234000048","Packaged",    20, 15, 90,20,7),
        ("Britannia Marie 600g",      "8901234000049","Packaged",    48, 36, 70,18,4),
        ("Good Day Cashew 200g",      "8901234000050","Packaged",    38, 28, 55,12,4),
        ("Sunfeast Dark Fantasy 300g","8901234000051","Packaged",    65, 49, 40,10,4),
        ("Priya Gold Biscuits 500g",  "8901234000052","Packaged",    42, 31, 48,12,4),
        ("Aashirvaad Pasta 500g",     "8901234000053","Packaged",    75, 56, 30, 8,0),
        ("Yippee Noodles 70g",        "8901234000054","Packaged",    15, 11, 90,25,7),
        ("Top Ramen 70g",             "8901234000055","Packaged",    15, 11, 85,25,7),
        ("Mango Pickle 400g",         "8901234000056","Packaged",    85, 64, 35,10,9),
        # ── Beverages (10) ──
        ("Tata Tea Premium 500g",     "8901234000057","Beverages",  220,165, 35,10,3),
        ("Nescafe Classic 200g",      "8901234000058","Beverages",  460,345, 20, 6,3),
        ("Bournvita 500g",            "8901234000059","Beverages",  295,222, 25, 8,7),
        ("Frooti Mango 200ml",        "8901234000060","Beverages",   20, 15, 72,20,7),
        ("Real Juice Orange 1L",      "8901234000061","Beverages",   99, 74, 30, 8,7),
        ("Horlicks 500g",             "8901234000062","Beverages",  320,240, 18, 6,7),
        ("Red Label Tea 250g",        "8901234000063","Beverages",  120, 90, 40,10,3),
        ("Green Tea 25 bags",         "8901234000064","Beverages",  145,109, 22, 6,3),
        ("Rooh Afza 750ml",           "8901234000065","Beverages",  220,165, 15, 5,9),
        ("Glucon-D 500g",             "8901234000066","Beverages",  185,139, 20, 6,7),
        # ── Personal Care (10) ──
        ("Lifebuoy Soap 100g",        "8901234000067","Personal Care", 38, 28,60,15,7),
        ("Dettol Soap 75g",           "8901234000068","Personal Care", 48, 36,50,12,7),
        ("Colgate Toothpaste 200g",   "8901234000069","Personal Care", 95, 71,45,12,7),
        ("Pepsodent 200g",            "8901234000070","Personal Care", 88, 66,40,10,7),
        ("Head & Shoulders 180ml",    "8901234000071","Personal Care",225,169,20, 6,7),
        ("Dove Soap 100g",            "8901234000072","Personal Care", 58, 43,40,10,7),
        ("Lux Soap 100g",             "8901234000073","Personal Care", 42, 31,55,12,7),
        ("Neem Toothpaste 150g",      "8901234000074","Personal Care", 72, 54,35, 8,7),
        ("Vaseline Lotion 200ml",     "8901234000075","Personal Care",165,124,18, 5,7),
        ("Parachute Hair Oil 200ml",  "8901234000076","Personal Care",125, 94,25, 6,7),
        # ── Cleaning (8) ──
        ("Surf Excel 1kg",            "8901234000077","Cleaning",   195,146, 40,10,7),
        ("Vim Bar 200g",              "8901234000078","Cleaning",    38, 28, 55,15,2),
        ("Harpic 1L",                 "8901234000079","Cleaning",   145,109, 25, 8,2),
        ("Colin 500ml",               "8901234000080","Cleaning",    99, 74, 20, 6,2),
        ("Lizol Floor Cleaner 1L",    "8901234000081","Cleaning",   185,139, 18, 5,2),
        ("Rin Detergent 1kg",         "8901234000082","Cleaning",   105, 79, 35,10,7),
        ("Scotch Brite Scrub",        "8901234000083","Cleaning",    45, 34, 30, 8,2),
        ("Phenyl 1L",                 "8901234000084","Cleaning",    65, 49, 22, 6,2),
        # ── Dry Fruits (8) ──
        ("Almond 250g",               "8901234000085","Dry Fruits", 295,221,  4, 5,8),
        ("Cashew 250g",               "8901234000086","Dry Fruits", 375,281,  0, 5,8),
        ("Raisins 250g",              "8901234000087","Dry Fruits", 155,116, 20, 5,8),
        ("Pistachio 100g",            "8901234000088","Dry Fruits", 280,210,  6, 4,8),
        ("Walnut 250g",               "8901234000089","Dry Fruits", 320,240,  8, 4,8),
        ("Dates 500g",                "8901234000090","Dry Fruits", 180,135, 15, 5,8),
        ("Organic Honey 500g",        "8901234000091","Packaged",   380,285,  2, 5,4),
        ("Peanuts 500g",              "8901234000092","Dry Fruits",  75, 56, 40,10,8),
        # ── Baby & Health (6) ──
        ("Cerelac 400g",              "8901234000093","Baby & Health",395,296,12, 4,7),
        ("Dettol Antiseptic 250ml",   "8901234000094","Baby & Health",195,146,15, 5,7),
        ("Band-Aid Box 20s",          "8901234000095","Baby & Health", 85, 64,20, 5,7),
        ("Vicks Vaporub 25ml",        "8901234000096","Baby & Health", 95, 71,18, 5,7),
        ("ORS Sachet 10s",            "8901234000097","Baby & Health", 55, 41,25, 8,7),
        ("Iodex 30g",                 "8901234000098","Baby & Health", 85, 64,12, 4,7),
        # ── Stationery (2) ──
        ("A4 Notebook 200 pages",     "8901234000099","Stationery",  45, 34, 22, 5,3),
        ("Ballpoint Pen 10pcs",       "8901234000100","Stationery",  55, 41, 18, 5,3),
    ]

    assert len(raw_items) == 100, f"Expected 100, got {len(raw_items)}"

    # Detect which qty threshold column exists
    qty_threshold_col = 'threshold' if 'threshold' in item_cols else 'min_qty'

    item_ids = []
    for name, barcode, category, price, cost, qty, min_qty, sup_idx in raw_items:
        col_map = {
            'name':       name,
            'barcode':    barcode,
            'category':   category,
            'price':      price,
            'qty':        qty,
            'created_at': da(random.randint(30, 120)),
        }
        col_map[qty_threshold_col] = min_qty

        # Only add optional columns if they actually exist in the table
        if 'status'      in item_cols: col_map['status']      = 'active'
        if 'cost_price'  in item_cols: col_map['cost_price']  = cost
        if 'supplier_id' in item_cols: col_map['supplier_id'] = sup_ids[sup_idx]
        if 'unit'        in item_cols: col_map['unit']        = 'pcs'
        if 'updated_at'  in item_cols: col_map['updated_at']  = col_map['created_at']

        keys   = list(col_map.keys())
        values = [col_map[k] for k in keys]
        sql    = f"INSERT INTO items ({','.join(keys)}) VALUES ({','.join(['?']*len(keys))})"
        cur    = conn.execute(sql, values)
        item_ids.append((cur.lastrowid, name, barcode, category, price, cost, qty, sup_idx))

    conn.commit()
    print(f"[Seed] {len(item_ids)} items inserted.")

    # ══════════════════════════════════════════════════════════════════
    # 3. PURCHASES (18 POs with expiry dates)
    # ══════════════════════════════════════════════════════════════════
    expiry_days = {
        0:730, 1:365, 2:548, 3:548, 4:548, 5:548, 6:400, 7:300,
        8:548, 9:1095,10:365,11:300,12:548,13:548,14:365,15:400,
        16:400,17:548,18:180,19:300,20:730,21:730,22:730,23:730,
        24:730,25:730,26:365,27:365,28:548,29:548,30:300,31:548,
        32:90, 33:60, 34:270,35:14, 36:10, 37:21, 38:270,39:45,
        40:270,41:30, 42:365,43:270,44:180,45:180,46:180,47:180,
        48:270,49:270,50:365,51:270,52:365,53:365,54:365,55:365,
        56:730,57:730,58:365,59:60, 60:30, 61:365,62:730,63:365,
        64:365,65:270,66:365,67:365,68:365,69:365,70:270,71:365,
        72:365,73:365,74:270,75:270,76:365,77:300,78:365,79:300,
        80:365,81:365,82:180,83:365,84:365,85:365,86:365,87:365,
        88:365,89:270,90:365,91:365,92:365,93:365,94:365,95:365,
        96:365,97:365,98:365,99:365,
        # Near expiry overrides
        35:8, 36:5, 37:12, 39:20, 41:18, 59:25, 60:22, 33:-5, 37:-2,
    }

    purchases_plan = [
        (50, 0, list(range(0,12)),   'received','Paid',    'Net Banking'),
        (45, 2, list(range(12,20)),  'received','Paid',    'Cash'),
        (42, 5, list(range(20,32)),  'received','Paid',    'UPI'),
        (38, 6, list(range(32,42)),  'received','Partial', 'UPI'),
        (35, 7, list(range(42,56)),  'received','Paid',    'Cash'),
        (30, 3, list(range(56,66)),  'received','Paid',    'Net Banking'),
        (28, 7, list(range(66,76)),  'received','Paid',    'Cash'),
        (25, 2, list(range(76,84)),  'received','Paid',    'UPI'),
        (22, 8, list(range(84,92)),  'received','Partial', 'Net Banking'),
        (18, 7, list(range(92,100)), 'received','Paid',    'Cash'),
        (12, 0, [0,1,8,9,10,11],     'received','Paid',    'Cash'),
        (10, 1, [2,3,4,5,6,7],       'received','Paid',    'UPI'),
        ( 8, 5, [20,21,22,23,24,25], 'received','Paid',    'Net Banking'),
        ( 6, 6, [32,33,35,36,37,38,39,41],'received','Partial','UPI'),
        ( 4, 7, [42,43,44,45,46,47,48,49],'received','Paid',   'Cash'),
        ( 2, 3, [56,57,58,59,60,62,63],   'ordered', 'Pending','Net Banking'),
        ( 1, 7, [66,67,68,69,70,71,72,73],'ordered', 'Pending','UPI'),
        ( 0, 8, [84,85,86,87,88,89,90,91],'draft',   'Pending','Cash'),
    ]

    po_count  = 0
    pur_cols  = cols('purchases')
    pi_cols   = cols('purchase_items')
    for dag, sup_idx, idxs, ord_st, pay_st, pay_meth in purchases_plan:
        created  = da(dag)
        po_num   = f"PO-{now.strftime('%Y%m')}-{po_count+1:04d}"
        inv_no   = f"SI-{po_count+1:04d}"
        sup_id   = sup_ids[sup_idx]
        sup_name = suppliers_raw[sup_idx][0]

        cart = []
        for idx in idxs:
            iid   = item_ids[idx][0]
            iname = item_ids[idx][1]
            ibar  = item_ids[idx][2]
            icost = item_ids[idx][5]
            qty   = random.randint(5, 20)
            cost  = round(icost * random.uniform(0.93, 1.07), 2)
            ed    = ah(expiry_days[idx]) if idx in expiry_days else ''
            batch = f"B{now.strftime('%y%m')}-{random.randint(10,99)}"
            dmg   = random.choices([0,0,0,0,1,2], k=1)[0]
            cart.append((iid, iname, ibar, qty, cost, ed, batch, dmg))

        subtotal = round(sum(r[3]*r[4] for r in cart), 2)
        paid_amt = round(subtotal*0.5,2) if pay_st=='Partial' else (subtotal if pay_st=='Paid' else 0)

        pur_col_map = {
            'purchase_number': po_num,
            'supplier_id':     sup_id,
            'supplier_name':   sup_name,
            'invoice_number':  inv_no,
            'payment_status':  pay_st,
            'notes':           'Seeded purchase order',
            'subtotal':        subtotal,
            'total':           subtotal,
            'status':          'confirmed',
            'created_by':      'admin',
            'created_at':      created,
        }
        if 'payment_method' in pur_cols: pur_col_map['payment_method'] = pay_meth
        if 'paid_amount'    in pur_cols: pur_col_map['paid_amount']    = paid_amt
        if 'order_status'   in pur_cols: pur_col_map['order_status']   = ord_st
        if 'updated_at'     in pur_cols: pur_col_map['updated_at']     = created

        pk = list(pur_col_map.keys())
        pv = [pur_col_map[k] for k in pk]
        cur = conn.execute(
            f"INSERT INTO purchases ({','.join(pk)}) VALUES ({','.join(['?']*len(pk))})",
            pv
        )
        pur_id = cur.lastrowid

        for iid,iname,ibar,qty,cost,ed,batch,dmg in cart:
            pi_map = {
                'purchase_id': pur_id,
                'item_id':     iid,
                'item_name':   iname,
                'barcode':     ibar,
                'qty':         qty,
                'cost_price':  cost,
                'total_price': round(qty*cost, 2),
            }
            if 'expiry_date'     in pi_cols: pi_map['expiry_date']     = ed
            if 'batch_number'    in pi_cols: pi_map['batch_number']    = batch
            if 'damaged_qty'     in pi_cols: pi_map['damaged_qty']     = dmg
            if 'damaged_remarks' in pi_cols: pi_map['damaged_remarks'] = 'Damaged on arrival' if dmg else ''
            if 'unit_price'      in pi_cols: pi_map['unit_price']      = cost

            pik = list(pi_map.keys())
            piv = [pi_map[k] for k in pik]
            conn.execute(
                f"INSERT INTO purchase_items ({','.join(pik)}) VALUES ({','.join(['?']*len(pik))})",
                piv
            )

            usable = qty - dmg
            if ord_st == 'received' and usable > 0:
                conn.execute("UPDATE items SET qty=qty+? WHERE id=?", (usable,iid))

        po_count += 1

    conn.commit()
    print(f"[Seed] {po_count} purchases inserted.")

    # ══════════════════════════════════════════════════════════════════
    # 4. SALES (40 transactions)
    # ══════════════════════════════════════════════════════════════════
    customers = [
        ("Ravi Kumar","9800001111"),    ("Sunita Devi","9800002222"),
        ("Mohan Lal","9800003333"),     ("Priya Singh","9800004444"),
        ("Walk-in",""),                 ("Amit Joshi","9800005555"),
        ("Deepa Nair","9800006666"),    ("Walk-in",""),
        ("Ramesh Babu","9800007777"),   ("Kavitha R.","9800008888"),
        ("Sanjay Tiwari","9800009999"), ("Meena Kumari","9800010000"),
    ]
    pay_meths = ['Cash','UPI','Cash','UPI','Cash','Net Banking','Cash','UPI','Debit Card','Cash','UPI','Cash']

    sales_plan = [
        (35,0,[(42,3),(43,2),(9,1),(20,1)],   0),
        (34,1,[(0,2),(2,1),(8,1),(21,1)],      5),
        (33,4,[(47,2),(46,1),(61,1)],          0),
        (32,2,[(32,1),(33,1),(36,2)],          0),
        (31,3,[(56,1),(57,1),(58,1)],          5),
        (30,4,[(42,5),(43,3),(9,2)],           0),
        (29,5,[(66,2),(67,1),(68,1),(69,1)],   0),
        (28,6,[(76,1),(77,2),(78,1)],          0),
        (27,4,[(0,1),(1,1),(13,1),(21,1)],     0),
        (26,7,[(24,1),(25,1),(9,1),(22,1)],    0),
        (25,8,[(85,1),(86,1),(18,1)],          0),
        (24,9,[(34,1),(36,1),(33,1)],          5),
        (23,0,[(42,4),(47,3),(59,1)],          0),
        (22,1,[(0,2),(8,1),(9,1)],             0),
        (21,4,[(60,6),(61,2)],                 0),
        (20,2,[(66,2),(67,2),(68,1)],          0),
        (19,3,[(56,1),(57,1),(58,1),(59,1)],  10),
        (18,4,[(42,3),(43,2),(44,1)],          0),
        (17,5,[(76,1),(77,1),(78,1),(79,1)],   0),
        (16,6,[(13,2),(14,2),(32,1)],          0),
        (15,7,[(9,2),(21,1),(22,1),(23,1)],    0),
        (14,8,[(0,5),(1,2),(2,2),(3,1)],       5),
        (13,9,[(42,6),(47,4),(46,2)],          0),
        (12,4,[(66,1),(67,1),(68,1),(69,1)],   0),
        (11,0,[(56,1),(57,1),(58,1)],          0),
        (10,1,[(32,1),(35,1),(38,1),(39,1)],   5),
        ( 9,2,[(0,3),(8,2),(9,3),(20,1)],      0),
        ( 8,3,[(42,4),(43,3),(44,2),(45,1)],   0),
        ( 7,10,[(76,2),(77,2),(78,1)],         0),
        ( 6,11,[(13,1),(14,1),(15,1),(56,1)],  0),
        ( 5,4,[(85,1),(87,2),(91,1)],          0),
        ( 4,5,[(92,1),(93,1),(94,1),(95,1)],   0),
        ( 3,6,[(43,2),(42,3),(9,2),(21,1)],    0),
        ( 2,7,[(66,2),(68,1),(69,1),(70,1)],   0),
        ( 1,8,[(56,1),(57,1),(62,1)],          0),
        ( 1,9,[(32,1),(35,1),(36,1)],          5),
        ( 0,4,[(0,2),(1,1),(21,1),(22,1)],     0),
        ( 0,10,[(42,5),(9,2),(43,2)],          0),
        ( 0,11,[(76,2),(77,2),(66,1)],         0),
        ( 0,0,[(13,1),(14,1),(58,1),(59,1)],   0),
    ]

    sale_count = 0
    for dag, ci, sitems, disc in sales_plan:
        created = da(dag) if dag > 0 else now.strftime('%Y-%m-%d %H:%M:%S')
        cname, cphone = customers[ci % len(customers)]
        pmeth   = pay_meths[ci % len(pay_meths)]
        inv_no  = f"INV-{now.strftime('%Y%m')}-{sale_count+1:04d}"

        cart = []
        ok = True
        for idx, qty in sitems:
            row = conn.execute("SELECT id,name,barcode,price,qty FROM items WHERE id=?",
                               (item_ids[idx][0],)).fetchone()
            if not row or row['qty'] < qty:
                ok = False; break
            cart.append((row['id'], row['name'], row['barcode'], qty, row['price']))
        if not ok:
            continue

        sub   = round(sum(r[3]*r[4] for r in cart), 2)
        damt  = round(sub*disc/100, 2)
        total = round(sub - damt, 2)

        cur = conn.execute("""
            INSERT INTO sales
              (invoice_number,customer_name,customer_phone,
               payment_method,payment_status,
               discount,notes,subtotal,discount_amount,total,
               status,created_by,created_at)
            VALUES (?,?,?,?,'Paid',?,'',?,?,?,'confirmed','admin',?)
        """, (inv_no,cname,cphone,pmeth,disc,sub,damt,total,created))
        sid = cur.lastrowid

        for iid,iname,ibar,qty,uprice in cart:
            conn.execute("""
                INSERT INTO sale_items
                  (sale_id,item_id,item_name,barcode,qty,unit_price,total_price)
                VALUES (?,?,?,?,?,?,?)
            """, (sid,iid,iname,ibar,qty,uprice,round(qty*uprice,2)))
            conn.execute("UPDATE items SET qty=qty-? WHERE id=?", (qty,iid))

        sale_count += 1

    conn.commit()
    print(f"[Seed] {sale_count} sales inserted.")

    # ── Summary ───────────────────────────────────────────────────────
    r = conn.execute("""
        SELECT
          (SELECT COUNT(*) FROM items)     AS items,
          (SELECT COUNT(*) FROM suppliers) AS sup,
          (SELECT COUNT(*) FROM purchases) AS pur,
          (SELECT COUNT(*) FROM sales)     AS sal,
          (SELECT COUNT(*) FROM purchase_items WHERE expiry_date != '') AS exp,
          (SELECT ROUND(SUM(qty*price),2) FROM items) AS inv_val
    """).fetchone()
    conn.close()

    print(f"\n✅ Seed complete!")
    print(f"   Items       : {r['items']}")
    print(f"   Suppliers   : {r['sup']}")
    print(f"   Purchases   : {r['pur']}")
    print(f"   Sales       : {r['sal']}")
    print(f"   Expiry rows : {r['exp']}")
    print(f"   Inv. Value  : ₹{r['inv_val']:,.2f}")
    print("\nLogin with your existing admin credentials.")

if __name__ == '__main__':
    run()
