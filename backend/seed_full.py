"""Comprehensive seed script - drops and recreates ALL data for testing."""
import asyncio
import os
from pathlib import Path
from datetime import datetime, timezone, timedelta
import random
import uuid

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / '.env')

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

NOW = datetime.now(timezone.utc)


async def seed():
    print("=" * 60)
    print("  MealMetrics - Full Database Seed")
    print("=" * 60)

    # Drop all collections
    collections = [
        'users', 'restaurants', 'revenues', 'brands', 'revenue_categories',
        'category_master', 'employees', 'expense_categories', 'expense_entries',
        'royalty_payees', 'royalty_entries', 'restaurant_targets',
        'petty_cash_balances', 'balance_additions', 'restaurant_documents',
        'business_config'
    ]
    print("\n[1/14] Clearing existing data...")
    for c in collections:
        await db[c].drop()
    print("  All collections dropped.")

    # ───────────────────────────────────────────
    # 1. BUSINESS CONFIG
    # ───────────────────────────────────────────
    print("\n[2/14] Business Config...")
    business_config = {
        "id": str(uuid.uuid4()),
        "business_type": "Food Court",
        "app_name": "MealMetrics",
        "entity_label_singular": "Restaurant",
        "entity_label_plural": "Restaurants",
        "revenue_label": "Revenue",
        "brand_label": "Brand",
        "document_types": [
            {"key": "license", "label": "Food License (FSSAI)"},
            {"key": "gst", "label": "GST Certificate"},
            {"key": "fire_safety", "label": "Fire Safety Certificate"},
            {"key": "health", "label": "Health Inspection Report"},
            {"key": "lease", "label": "Lease Agreement"},
            {"key": "insurance", "label": "Insurance Policy"},
        ],
        "custom_fields": [
            {"field_key": "gst_number", "label": "GST Number", "field_type": "text", "placeholder": "e.g. 22AAAAA0000A1Z5", "required": True, "options": [], "order": 1},
            {"field_key": "phone", "label": "Phone", "field_type": "text", "placeholder": "+91 XXXXX XXXXX", "required": True, "options": [], "order": 2},
            {"field_key": "address", "label": "Address", "field_type": "text", "placeholder": "Full address", "required": True, "options": [], "order": 3},
            {"field_key": "msme_number", "label": "MSME Number", "field_type": "text", "placeholder": "UDYAM-XX-XX-XXXXXXX", "required": False, "options": [], "order": 4},
            {"field_key": "seating_capacity", "label": "Seating Capacity", "field_type": "text", "placeholder": "e.g. 50", "required": False, "options": [], "order": 5},
        ],
        "created_at": NOW,
        "updated_at": NOW,
    }
    await db.business_config.insert_one(business_config)
    print("  Business config created.")

    # ───────────────────────────────────────────
    # 2. BRANDS
    # ───────────────────────────────────────────
    print("\n[3/14] Brands...")
    brands_data = [
        {"name": "Spice Garden", "description": "Authentic North Indian cuisine chain with signature tandoor dishes"},
        {"name": "Dragon Wok", "description": "Chinese & Asian fusion restaurant with live teppanyaki counter"},
        {"name": "Pizza Planet", "description": "Italian pizza & pasta outlets with wood-fired ovens"},
        {"name": "Burger Barn", "description": "Gourmet burgers and shakes with locally-sourced ingredients"},
        {"name": "Chai Chronicles", "description": "Premium tea lounge with snacks and light bites"},
    ]
    brand_ids = []
    for b in brands_data:
        doc = {"id": str(uuid.uuid4()), "name": b["name"], "description": b["description"], "created_at": NOW}
        await db.brands.insert_one(doc)
        brand_ids.append({"id": doc["id"], "name": b["name"]})
        print(f"  Brand: {b['name']}")

    # ───────────────────────────────────────────
    # 3. CATEGORY MASTER (global revenue category templates)
    # ───────────────────────────────────────────
    print("\n[4/14] Category Master...")
    category_master_data = ["Dine-in", "Takeaway", "Delivery", "Catering", "Online Orders", "Counter Sales"]
    cat_master_ids = []
    for cm in category_master_data:
        doc = {"id": str(uuid.uuid4()), "name": cm, "description": f"{cm} revenue stream", "created_at": NOW}
        await db.category_master.insert_one(doc)
        cat_master_ids.append({"id": doc["id"], "name": cm})
        print(f"  Category: {cm}")

    # ───────────────────────────────────────────
    # 4. RESTAURANTS (8 outlets across 5 brands)
    # ───────────────────────────────────────────
    print("\n[5/14] Restaurants...")
    restaurants_data = [
        {"name": "Spice Garden - Mall Road", "brand": "Spice Garden", "gst": "22ABCDE1234F1Z5", "phone": "+91 98765 43210", "address": "Shop 12, Mall Road, New Delhi 110001", "msme": "UDYAM-DL-01-0001234", "seating": "60"},
        {"name": "Spice Garden - Connaught Place", "brand": "Spice Garden", "gst": "22ABCDE1234F2Z6", "phone": "+91 98765 43211", "address": "Block B-14, Connaught Place, New Delhi 110001", "msme": "UDYAM-DL-01-0001235", "seating": "80"},
        {"name": "Dragon Wok - Cyber Hub", "brand": "Dragon Wok", "gst": "06FGHIJ5678K1Z7", "phone": "+91 87654 32109", "address": "Unit 5, Cyber Hub, DLF Phase 2, Gurugram 122002", "msme": "UDYAM-HR-02-0002345", "seating": "45"},
        {"name": "Dragon Wok - Sector 29", "brand": "Dragon Wok", "gst": "06FGHIJ5678K2Z8", "phone": "+91 87654 32110", "address": "Plot 18, Leisure Valley Rd, Sector 29, Gurugram 122001", "msme": "", "seating": "55"},
        {"name": "Pizza Planet - Hauz Khas", "brand": "Pizza Planet", "gst": "07KLMNO9012L1Z9", "phone": "+91 76543 21098", "address": "2nd Floor, Hauz Khas Village, New Delhi 110016", "msme": "UDYAM-DL-03-0003456", "seating": "40"},
        {"name": "Pizza Planet - Saket", "brand": "Pizza Planet", "gst": "07KLMNO9012L2Z0", "phone": "+91 76543 21099", "address": "DLF Place Mall, District Centre, Saket, New Delhi 110017", "msme": "", "seating": "50"},
        {"name": "Burger Barn - Khan Market", "brand": "Burger Barn", "gst": "07PQRST3456M1Z1", "phone": "+91 65432 10987", "address": "Shop 22, Khan Market, New Delhi 110003", "msme": "UDYAM-DL-04-0004567", "seating": "35"},
        {"name": "Chai Chronicles - GK-II", "brand": "Chai Chronicles", "gst": "07UVWXY7890N1Z2", "phone": "+91 54321 09876", "address": "M Block Market, GK-II, New Delhi 110048", "msme": "", "seating": "30"},
    ]
    restaurant_ids = []
    for r in restaurants_data:
        doc = {
            "id": str(uuid.uuid4()),
            "name": r["name"],
            "description": "",
            "brand": r["brand"],
            "gst_number": r["gst"],
            "phone": r["phone"],
            "address": r["address"],
            "msme_number": r["msme"],
            "custom_fields": {
                "gst_number": r["gst"], "phone": r["phone"],
                "address": r["address"], "msme_number": r["msme"],
                "seating_capacity": r["seating"],
            },
            "created_by": "suadmin",
            "created_at": NOW,
        }
        await db.restaurants.insert_one(doc)
        restaurant_ids.append({"id": doc["id"], "name": r["name"], "brand": r["brand"]})
        print(f"  Restaurant: {r['name']}")

    # ───────────────────────────────────────────
    # 5. REVENUE CATEGORIES (per-restaurant)
    # ───────────────────────────────────────────
    print("\n[6/14] Revenue Categories (per restaurant)...")
    rev_cat_count = 0
    rev_cat_map = {}  # restaurant_id -> [{id, name}]
    for rest in restaurant_ids:
        cats = random.sample(category_master_data, random.randint(3, 5))
        rev_cat_map[rest["id"]] = []
        for cat_name in cats:
            doc = {
                "id": str(uuid.uuid4()),
                "name": cat_name,
                "description": f"{cat_name} for {rest['name']}",
                "is_required": cat_name in ["Dine-in", "Delivery"],
                "restaurant_id": rest["id"],
                "restaurant_name": rest["name"],
                "created_by": "suadmin",
                "created_at": NOW,
            }
            await db.revenue_categories.insert_one(doc)
            rev_cat_map[rest["id"]].append({"id": doc["id"], "name": cat_name})
            rev_cat_count += 1
    print(f"  Created {rev_cat_count} revenue categories across {len(restaurant_ids)} restaurants")

    # ───────────────────────────────────────────
    # 6. REVENUE ENTRIES (last 120 days, realistic amounts)
    # ───────────────────────────────────────────
    print("\n[7/14] Revenue Entries (120 days)...")
    revenue_count = 0
    for day_offset in range(120):
        date = NOW - timedelta(days=day_offset)
        date_str = date.strftime("%Y-%m-%d")
        is_weekend = date.weekday() >= 5
        for rest in restaurant_ids:
            cats = rev_cat_map.get(rest["id"], [])
            if not cats:
                continue
            # Build amounts dict
            amounts = {}
            for cat in cats:
                base = random.uniform(8000, 45000)
                if is_weekend:
                    base *= random.uniform(1.2, 1.6)
                # Some categories smaller
                if cat["name"] in ["Catering", "Counter Sales"]:
                    base *= 0.3
                amounts[cat["name"]] = round(base, 2)

            total_amount = round(sum(amounts.values()), 2)
            doc = {
                "id": str(uuid.uuid4()),
                "restaurant_id": rest["id"],
                "restaurant_name": rest["name"],
                "amounts": amounts,
                "total_amount": total_amount,
                "date": date_str,
                "notes": "",
                "submitted_by": "suadmin",
                "submitted_by_username": "suadmin",
                "submitted_at": date,
            }
            await db.revenues.insert_one(doc)
            revenue_count += 1
    print(f"  Created {revenue_count} revenue entries")

    # ───────────────────────────────────────────
    # 7. EMPLOYEES (15 employees)
    # ───────────────────────────────────────────
    print("\n[8/14] Employees...")
    employees_data = [
        {"name": "Rahul Kumar", "position": "Head Chef", "phone": "+91 99887 76655", "salary": 45000, "rids": [0, 1]},
        {"name": "Priya Sharma", "position": "Restaurant Manager", "phone": "+91 99887 76656", "salary": 55000, "rids": [0]},
        {"name": "Amit Singh", "position": "Sous Chef", "phone": "+91 99887 76657", "salary": 32000, "rids": [2, 3]},
        {"name": "Neha Gupta", "position": "Cashier", "phone": "+91 99887 76658", "salary": 22000, "rids": [4, 5]},
        {"name": "Vikram Patel", "position": "Line Cook", "phone": "+91 99887 76659", "salary": 28000, "rids": [2]},
        {"name": "Sneha Reddy", "position": "Floor Supervisor", "phone": "+91 99887 76660", "salary": 35000, "rids": [4]},
        {"name": "Deepak Joshi", "position": "Delivery Executive", "phone": "+91 99887 76661", "salary": 18000, "rids": [0, 1, 2]},
        {"name": "Anita Verma", "position": "Pastry Chef", "phone": "+91 99887 76662", "salary": 38000, "rids": [5, 6]},
        {"name": "Karan Mehta", "position": "Bartender", "phone": "+91 99887 76663", "salary": 25000, "rids": [6]},
        {"name": "Simran Kaur", "position": "Hostess", "phone": "+91 99887 76664", "salary": 20000, "rids": [1, 4]},
        {"name": "Arjun Nair", "position": "Kitchen Helper", "phone": "+91 99887 76665", "salary": 15000, "rids": [3, 7]},
        {"name": "Meera Das", "position": "Store Manager", "phone": "+91 99887 76666", "salary": 42000, "rids": [7]},
        {"name": "Rohit Bhatia", "position": "Head Waiter", "phone": "+91 99887 76667", "salary": 24000, "rids": [6, 7]},
        {"name": "Pooja Tiwari", "position": "Accounts Executive", "phone": "+91 99887 76668", "salary": 30000, "rids": [0, 1, 2, 3]},
        {"name": "Sanjay Rao", "position": "Maintenance", "phone": "+91 99887 76669", "salary": 16000, "rids": [4, 5, 6, 7]},
    ]
    employee_ids = []
    statuses = ["active"] * 12 + ["on_leave"] * 2 + ["inactive"]
    for i, e in enumerate(employees_data):
        doc = {
            "id": str(uuid.uuid4()),
            "name": e["name"],
            "email": f"{e['name'].lower().replace(' ', '.')}@mealmetrics.in",
            "phone": e["phone"],
            "position": e["position"],
            "salary": e["salary"],
            "join_date": (NOW - timedelta(days=random.randint(60, 800))).strftime("%Y-%m-%d"),
            "employment_status": statuses[i],
            "id_document_number": f"AADHAAR-{random.randint(1000,9999)}-{random.randint(1000,9999)}-{random.randint(1000,9999)}",
            "restaurant_ids": [restaurant_ids[r]["id"] for r in e["rids"]],
            "photo_url": None,
            "created_by": "suadmin",
            "created_at": NOW,
            "updated_at": NOW,
        }
        await db.employees.insert_one(doc)
        employee_ids.append(doc["id"])
        print(f"  Employee: {e['name']} ({e['position']}) - {statuses[i]}")

    # ───────────────────────────────────────────
    # 8. EXPENSE CATEGORIES
    # ───────────────────────────────────────────
    print("\n[9/14] Expense Categories...")
    expense_cats = [
        {"name": "Rent", "description": "Monthly rent payments"},
        {"name": "Utilities", "description": "Electricity, water, gas bills"},
        {"name": "Raw Materials", "description": "Ingredients and food supplies"},
        {"name": "Maintenance", "description": "Equipment repair and maintenance"},
        {"name": "Marketing", "description": "Advertising, social media, promotions"},
        {"name": "Staff Welfare", "description": "Staff meals, uniforms, training"},
        {"name": "Packaging", "description": "Delivery boxes, bags, containers"},
        {"name": "Miscellaneous", "description": "Other operational expenses"},
    ]
    expense_cat_ids = []
    for ec in expense_cats:
        doc = {"id": str(uuid.uuid4()), "name": ec["name"], "description": ec["description"], "created_at": NOW}
        await db.expense_categories.insert_one(doc)
        expense_cat_ids.append({"id": doc["id"], "name": ec["name"]})
        print(f"  Expense Category: {ec['name']}")

    # ───────────────────────────────────────────
    # 9. PETTY CASH BALANCES + BALANCE ADDITIONS
    # ───────────────────────────────────────────
    print("\n[10/14] Petty Cash Balances & Additions...")
    for rest in restaurant_ids:
        opening = round(random.uniform(20000, 80000), 2)
        doc = {
            "id": str(uuid.uuid4()),
            "restaurant_id": rest["id"],
            "restaurant_name": rest["name"],
            "date": (NOW - timedelta(days=30)).strftime("%Y-%m-%d"),
            "opening_balance": opening,
            "notes": "Monthly opening balance",
            "created_by": "suadmin",
            "created_at": NOW,
        }
        await db.petty_cash_balances.insert_one(doc)

        # Add a balance addition
        addition = round(random.uniform(10000, 30000), 2)
        add_doc = {
            "id": str(uuid.uuid4()),
            "restaurant_id": rest["id"],
            "restaurant_name": rest["name"],
            "amount": addition,
            "notes": "Cash replenishment from HQ",
            "added_by": "suadmin",
            "added_at": NOW - timedelta(days=15),
            "created_by": "suadmin",
            "created_at": NOW - timedelta(days=15),
        }
        await db.balance_additions.insert_one(add_doc)
        print(f"  Petty Cash: {rest['name']} - Opening: {opening:.0f}, Added: {addition:.0f}")

    # ───────────────────────────────────────────
    # 10. EXPENSE ENTRIES (last 60 days)
    # ───────────────────────────────────────────
    print("\n[11/14] Expense Entries (60 days)...")
    vendors = ["Metro Cash & Carry", "Big Basket", "Local Supplier", "Amazon Business", "IndiaMART", "D-Mart", "Reliance Fresh", "Direct Purchase"]
    payment_methods = ["cash", "upi", "bank_transfer", "card"]
    expense_count = 0
    for day_offset in range(60):
        date = NOW - timedelta(days=day_offset)
        date_str = date.strftime("%Y-%m-%d")
        # 3-5 restaurants have expenses each day
        for rest in random.sample(restaurant_ids, random.randint(3, min(6, len(restaurant_ids)))):
            # 1-3 expense entries per restaurant per day
            for _ in range(random.randint(1, 3)):
                cat = random.choice(expense_cat_ids)
                amount = round(random.uniform(200, 25000), 2)
                if cat["name"] == "Rent":
                    amount = round(random.uniform(50000, 150000), 2)
                elif cat["name"] in ["Raw Materials"]:
                    amount = round(random.uniform(5000, 30000), 2)
                doc = {
                    "id": str(uuid.uuid4()),
                    "date": date_str,
                    "manager_name": random.choice(["Priya Sharma", "Meera Das", "Sneha Reddy"]),
                    "restaurant_id": rest["id"],
                    "restaurant_name": rest["name"],
                    "category_id": cat["id"],
                    "category_name": cat["name"],
                    "description": f"{cat['name']} - {random.choice(['Monthly', 'Weekly', 'Ad-hoc', 'Emergency', 'Scheduled'])} payment",
                    "vendor_name": random.choice(vendors),
                    "amount": amount,
                    "payment_method": random.choice(payment_methods),
                    "payment_method_other": "",
                    "receipt_url": "",
                    "cash_variance": round(random.uniform(-500, 500), 2) if random.random() < 0.2 else 0,
                    "created_by": "suadmin",
                    "created_at": date,
                }
                await db.expense_entries.insert_one(doc)
                expense_count += 1
    print(f"  Created {expense_count} expense entries")

    # ───────────────────────────────────────────
    # 11. ROYALTY PAYEES
    # ───────────────────────────────────────────
    print("\n[12/14] Royalty Payees & Entries...")
    payees_data = [
        {"name": "HQ Royalties Ltd"},
        {"name": "Franchise Corp India"},
        {"name": "Brand Licensing Co"},
    ]
    payee_ids = []
    for p in payees_data:
        doc = {"id": str(uuid.uuid4()), "name": p["name"], "created_at": NOW}
        await db.royalty_payees.insert_one(doc)
        payee_ids.append({"id": doc["id"], "name": p["name"]})
        print(f"  Payee: {p['name']}")

    # Royalty Entries (last 6 months)
    royalty_types = ["percentage", "fixed", "percentage"]
    royalty_count = 0
    for month_offset in range(6):
        date = NOW - timedelta(days=month_offset * 30)
        month_val = date.month
        year_val = date.year
        for rest in restaurant_ids:
            payee = random.choice(payee_ids)
            rtype = random.choice(royalty_types)
            amount = round(random.uniform(8000, 45000), 2) if rtype == "fixed" else round(random.uniform(3, 12), 2)
            doc = {
                "id": str(uuid.uuid4()),
                "month": month_val,
                "year": year_val,
                "payee_id": payee["id"],
                "payee_name": payee["name"],
                "royalty_type": rtype,
                "amount": amount,
                "restaurant_id": rest["id"],
                "restaurant_name": rest["name"],
                "notes": f"{'Percentage' if rtype == 'percentage' else 'Fixed'} royalty for {date.strftime('%B %Y')}",
                "created_by": "suadmin",
                "created_at": date,
            }
            await db.royalty_entries.insert_one(doc)
            royalty_count += 1
    print(f"  Created {royalty_count} royalty entries")

    # ───────────────────────────────────────────
    # 12. RESTAURANT TARGETS
    # ───────────────────────────────────────────
    print("\n[13/14] Restaurant Targets...")
    target_count = 0
    current_fy = NOW.year if NOW.month >= 4 else NOW.year - 1
    for rest in restaurant_ids:
        # Monthly targets for current FY (12 months)
        for month in range(1, 13):
            base_target = random.uniform(300000, 900000)
            # Higher targets for weekends/festive months
            if month in [10, 11, 12, 3]:  # festive & year-end
                base_target *= 1.3
            doc = {
                "id": str(uuid.uuid4()),
                "restaurant_id": rest["id"],
                "restaurant_name": rest["name"],
                "fiscal_year": current_fy,
                "period_type": "monthly",
                "period_value": month,
                "target_amount": round(base_target, 2),
                "created_by": "suadmin",
                "created_at": NOW,
                "updated_at": NOW,
            }
            await db.restaurant_targets.insert_one(doc)
            target_count += 1
        # Quarterly targets
        for q in range(1, 5):
            doc = {
                "id": str(uuid.uuid4()),
                "restaurant_id": rest["id"],
                "restaurant_name": rest["name"],
                "fiscal_year": current_fy,
                "period_type": "quarterly",
                "period_value": q,
                "target_amount": round(random.uniform(1200000, 3000000), 2),
                "created_by": "suadmin",
                "created_at": NOW,
                "updated_at": NOW,
            }
            await db.restaurant_targets.insert_one(doc)
            target_count += 1
        # Yearly target
        doc = {
            "id": str(uuid.uuid4()),
            "restaurant_id": rest["id"],
            "restaurant_name": rest["name"],
            "fiscal_year": current_fy,
            "period_type": "yearly",
            "period_value": None,
            "target_amount": round(random.uniform(5000000, 12000000), 2),
            "created_by": "suadmin",
            "created_at": NOW,
            "updated_at": NOW,
        }
        await db.restaurant_targets.insert_one(doc)
        target_count += 1
    print(f"  Created {target_count} targets ({len(restaurant_ids)} restaurants x 17 periods)")

    # ───────────────────────────────────────────
    # 13. USERS
    # ───────────────────────────────────────────
    print("\n[14/14] Users...")

    # Super admin (default)
    suadmin = {
        "id": str(uuid.uuid4()),
        "username": "suadmin",
        "password": pwd_context.hash("suadmin"),
        "role": "superuser",
        "name": "Super Admin",
        "email": "superadmin@mealmetrics.in",
        "mobile": "+91 99999 00000",
        "assigned_restaurant_ids": [],
        "permissions": {},
        "created_at": NOW,
        "updated_at": NOW,
    }
    await db.users.insert_one(suadmin)
    print(f"  User: suadmin (superuser)")

    users_data = [
        {
            "username": "admin1", "password": "Admin@1234", "role": "admin",
            "name": "Ritu Raj", "email": "ritu@mealmetrics.in", "mobile": "+91 99999 00001",
        },
        {
            "username": "admin2", "password": "Admin@1234", "role": "admin",
            "name": "Aisha Khan", "email": "aisha@mealmetrics.in", "mobile": "+91 99999 00004",
        },
        {
            "username": "manager1", "password": "Manager@1234", "role": "manager",
            "name": "Raj Manager", "email": "raj@mealmetrics.in", "mobile": "+91 99999 00002",
            "assigned_restaurant_ids": [restaurant_ids[0]["id"], restaurant_ids[1]["id"]],
            "permissions": {
                "revenue": "full", "restaurants": "readonly", "reports": "full",
                "employees": "full", "documents": "readonly", "users": "none",
                "expenses": "full", "royalty": "readonly", "targets": "readonly",
                "brands": "none",
            },
        },
        {
            "username": "manager2", "password": "Manager@1234", "role": "manager",
            "name": "Priya Manager", "email": "priya.mgr@mealmetrics.in", "mobile": "+91 99999 00003",
            "assigned_restaurant_ids": [restaurant_ids[2]["id"], restaurant_ids[3]["id"]],
            "permissions": {
                "revenue": "full", "restaurants": "readonly", "reports": "full",
                "employees": "readonly", "documents": "readonly", "users": "none",
                "expenses": "readonly", "royalty": "none", "targets": "readonly",
                "brands": "none",
            },
        },
        {
            "username": "manager3", "password": "Manager@1234", "role": "manager",
            "name": "Vikram Lead", "email": "vikram.lead@mealmetrics.in", "mobile": "+91 99999 00005",
            "assigned_restaurant_ids": [restaurant_ids[4]["id"], restaurant_ids[5]["id"], restaurant_ids[6]["id"], restaurant_ids[7]["id"]],
            "permissions": {
                "revenue": "full", "restaurants": "readonly", "reports": "full",
                "employees": "full", "documents": "full", "users": "readonly",
                "expenses": "full", "royalty": "readonly", "targets": "readonly",
                "brands": "none",
            },
        },
    ]
    for u in users_data:
        doc = {
            "id": str(uuid.uuid4()),
            "username": u["username"],
            "password": pwd_context.hash(u["password"]),
            "role": u["role"],
            "name": u["name"],
            "email": u["email"],
            "mobile": u["mobile"],
            "assigned_restaurant_ids": u.get("assigned_restaurant_ids", []),
            "permissions": u.get("permissions", {}),
            "created_at": NOW,
            "updated_at": NOW,
        }
        await db.users.insert_one(doc)
        print(f"  User: {u['username']} ({u['role']})")

    # ───────────────────────────────────────────
    # SUMMARY
    # ───────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  SEED COMPLETE - Summary")
    print("=" * 60)
    print(f"  Business Config : 1")
    print(f"  Brands          : {len(brands_data)}")
    print(f"  Category Master : {len(category_master_data)}")
    print(f"  Restaurants     : {len(restaurants_data)}")
    print(f"  Revenue Cats    : {rev_cat_count}")
    print(f"  Revenue Entries : {revenue_count}")
    print(f"  Employees       : {len(employees_data)}")
    print(f"  Expense Cats    : {len(expense_cats)}")
    print(f"  Expense Entries : {expense_count}")
    print(f"  Petty Cash Bal  : {len(restaurant_ids)}")
    print(f"  Balance Adds    : {len(restaurant_ids)}")
    print(f"  Royalty Payees  : {len(payees_data)}")
    print(f"  Royalty Entries : {royalty_count}")
    print(f"  Targets         : {target_count}")
    print(f"  Users           : {len(users_data) + 1}")
    print()
    print("  LOGIN CREDENTIALS:")
    print("  ─────────────────────────────────────")
    print("  suadmin   / suadmin       (superuser)")
    print("  admin1    / Admin@1234    (admin)")
    print("  admin2    / Admin@1234    (admin)")
    print("  manager1  / Manager@1234  (manager - Spice Garden)")
    print("  manager2  / Manager@1234  (manager - Dragon Wok)")
    print("  manager3  / Manager@1234  (manager - Pizza/Burger/Chai)")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
