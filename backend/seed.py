"""Seed script to populate the database with test data."""
import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
import random
import uuid

# Load env
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / '.env')

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

async def seed():
    print("Seeding database...")

    # 1. Brands
    brands_data = [
        {"name": "Spice Garden", "description": "Indian cuisine chain"},
        {"name": "Dragon Wok", "description": "Chinese and Asian fusion"},
        {"name": "Pizza Planet", "description": "Italian and pizza outlets"},
    ]
    brand_ids = []
    for b in brands_data:
        doc = {
            "id": str(uuid.uuid4()),
            "name": b["name"],
            "description": b["description"],
            "created_at": datetime.now(timezone.utc),
        }
        await db.brands.insert_one(doc)
        brand_ids.append({"id": doc["id"], "name": b["name"]})
        print(f"  Brand: {b['name']}")

    # 2. Revenue Categories
    categories_data = [
        {"name": "Dine-in", "description": "Walk-in customers dining at the outlet"},
        {"name": "Takeaway", "description": "Orders packed for takeaway"},
        {"name": "Delivery", "description": "Online delivery orders (Swiggy, Zomato, etc.)"},
        {"name": "Catering", "description": "Bulk catering orders"},
    ]
    category_ids = []
    for c in categories_data:
        doc = {
            "id": str(uuid.uuid4()),
            "name": c["name"],
            "description": c["description"],
            "created_at": datetime.now(timezone.utc),
        }
        await db.revenue_categories.insert_one(doc)
        category_ids.append({"id": doc["id"], "name": c["name"]})
        print(f"  Revenue Category: {c['name']}")

    # 3. Restaurants
    restaurants_data = [
        {"name": "Spice Garden - Mall Road", "brand": "Spice Garden", "custom_fields": {"gst_number": "22ABCDE1234F1Z5", "phone": "+91 98765 43210", "address": "Shop 12, Mall Road, New Delhi", "msme_number": "UDYAM-DL-01-0001234"}},
        {"name": "Spice Garden - Connaught Place", "brand": "Spice Garden", "custom_fields": {"gst_number": "22ABCDE1234F2Z6", "phone": "+91 98765 43211", "address": "Block B, Connaught Place, New Delhi", "msme_number": "UDYAM-DL-01-0001235"}},
        {"name": "Dragon Wok - Cyber Hub", "brand": "Dragon Wok", "custom_fields": {"gst_number": "06FGHIJ5678K1Z7", "phone": "+91 87654 32109", "address": "Unit 5, Cyber Hub, Gurugram", "msme_number": "UDYAM-HR-02-0002345"}},
        {"name": "Dragon Wok - Sector 29", "brand": "Dragon Wok", "custom_fields": {"gst_number": "06FGHIJ5678K2Z8", "phone": "+91 87654 32110", "address": "Plot 18, Sector 29, Gurugram", "msme_number": ""}},
        {"name": "Pizza Planet - Hauz Khas", "brand": "Pizza Planet", "custom_fields": {"gst_number": "07KLMNO9012L1Z9", "phone": "+91 76543 21098", "address": "2nd Floor, Hauz Khas Village, New Delhi", "msme_number": "UDYAM-DL-03-0003456"}},
        {"name": "Pizza Planet - Saket", "brand": "Pizza Planet", "custom_fields": {"gst_number": "07KLMNO9012L2Z0", "phone": "+91 76543 21099", "address": "DLF Place Mall, Saket, New Delhi", "msme_number": ""}},
    ]
    restaurant_ids = []
    for r in restaurants_data:
        doc = {
            "id": str(uuid.uuid4()),
            "name": r["name"],
            "brand": r["brand"],
            "custom_fields": r["custom_fields"],
            # Legacy fields for backward compat
            "gst_number": r["custom_fields"].get("gst_number", ""),
            "phone": r["custom_fields"].get("phone", ""),
            "address": r["custom_fields"].get("address", ""),
            "msme_number": r["custom_fields"].get("msme_number", ""),
            "created_at": datetime.now(timezone.utc),
        }
        await db.restaurants.insert_one(doc)
        restaurant_ids.append({"id": doc["id"], "name": r["name"], "brand": r["brand"]})
        print(f"  Restaurant: {r['name']}")

    # 4. Revenue entries (last 90 days)
    print("  Generating revenue entries (90 days)...")
    revenue_count = 0
    for day_offset in range(90):
        date = datetime.now(timezone.utc) - timedelta(days=day_offset)
        date_str = date.strftime("%Y-%m-%d")
        for rest in restaurant_ids:
            # 1-3 category entries per restaurant per day
            num_entries = random.randint(1, 3)
            chosen_cats = random.sample(category_ids, min(num_entries, len(category_ids)))
            for cat in chosen_cats:
                amount = round(random.uniform(5000, 50000), 2)
                doc = {
                    "id": str(uuid.uuid4()),
                    "restaurant_id": rest["id"],
                    "restaurant_name": rest["name"],
                    "date": date_str,
                    "amount": amount,
                    "category_id": cat["id"],
                    "category_name": cat["name"],
                    "notes": "",
                    "created_by": "suadmin",
                    "created_at": date,
                }
                await db.revenues.insert_one(doc)
                revenue_count += 1
    print(f"  Created {revenue_count} revenue entries")

    # 5. Employees
    employees_data = [
        {"name": "Rahul Kumar", "role": "Chef", "phone": "+91 99887 76655", "salary": 25000, "restaurant_ids": [restaurant_ids[0]["id"], restaurant_ids[1]["id"]]},
        {"name": "Priya Sharma", "role": "Manager", "phone": "+91 99887 76656", "salary": 35000, "restaurant_ids": [restaurant_ids[0]["id"]]},
        {"name": "Amit Singh", "role": "Waiter", "phone": "+91 99887 76657", "salary": 15000, "restaurant_ids": [restaurant_ids[2]["id"], restaurant_ids[3]["id"]]},
        {"name": "Neha Gupta", "role": "Cashier", "phone": "+91 99887 76658", "salary": 18000, "restaurant_ids": [restaurant_ids[4]["id"], restaurant_ids[5]["id"]]},
        {"name": "Vikram Patel", "role": "Chef", "phone": "+91 99887 76659", "salary": 28000, "restaurant_ids": [restaurant_ids[2]["id"]]},
        {"name": "Sneha Reddy", "role": "Supervisor", "phone": "+91 99887 76660", "salary": 30000, "restaurant_ids": [restaurant_ids[4]["id"]]},
        {"name": "Deepak Joshi", "role": "Delivery", "phone": "+91 99887 76661", "salary": 12000, "restaurant_ids": [restaurant_ids[0]["id"], restaurant_ids[1]["id"], restaurant_ids[2]["id"]]},
        {"name": "Anita Verma", "role": "Chef", "phone": "+91 99887 76662", "salary": 26000, "restaurant_ids": [restaurant_ids[3]["id"], restaurant_ids[5]["id"]]},
    ]
    for e in employees_data:
        doc = {
            "id": str(uuid.uuid4()),
            "name": e["name"],
            "role": e["role"],
            "phone": e["phone"],
            "email": f"{e['name'].lower().replace(' ', '.')}@example.com",
            "salary": e["salary"],
            "joining_date": (datetime.now(timezone.utc) - timedelta(days=random.randint(30, 365))).strftime("%Y-%m-%d"),
            "status": "active",
            "restaurant_ids": e["restaurant_ids"],
            "created_at": datetime.now(timezone.utc),
        }
        await db.employees.insert_one(doc)
        print(f"  Employee: {e['name']} ({e['role']})")

    # 6. Expense Categories
    expense_cats_data = ["Rent", "Utilities", "Supplies", "Maintenance", "Marketing", "Miscellaneous"]
    expense_cat_ids = []
    for ec in expense_cats_data:
        doc = {
            "id": str(uuid.uuid4()),
            "name": ec,
            "created_at": datetime.now(timezone.utc),
        }
        await db.expense_categories.insert_one(doc)
        expense_cat_ids.append({"id": doc["id"], "name": ec})
        print(f"  Expense Category: {ec}")

    # 7. Petty Cash Balances
    for rest in restaurant_ids:
        doc = {
            "id": str(uuid.uuid4()),
            "restaurant_id": rest["id"],
            "restaurant_name": rest["name"],
            "balance": round(random.uniform(10000, 50000), 2),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.petty_cash_balances.insert_one(doc)
        print(f"  Petty Cash Balance: {rest['name']}")

    # 8. Expense Entries (last 30 days)
    print("  Generating expense entries (30 days)...")
    expense_count = 0
    for day_offset in range(30):
        date = datetime.now(timezone.utc) - timedelta(days=day_offset)
        date_str = date.strftime("%Y-%m-%d")
        for rest in random.sample(restaurant_ids, random.randint(2, 4)):
            cat = random.choice(expense_cat_ids)
            amount = round(random.uniform(500, 10000), 2)
            doc = {
                "id": str(uuid.uuid4()),
                "restaurant_id": rest["id"],
                "restaurant_name": rest["name"],
                "category_id": cat["id"],
                "category_name": cat["name"],
                "amount": amount,
                "date": date_str,
                "description": f"{cat['name']} expense for {rest['name']}",
                "payment_mode": random.choice(["cash", "upi", "bank_transfer"]),
                "created_by": "suadmin",
                "created_at": date,
            }
            await db.expense_entries.insert_one(doc)
            expense_count += 1
    print(f"  Created {expense_count} expense entries")

    # 9. Royalty Payees
    payees_data = [
        {"name": "HQ Royalties Ltd", "contact": "royalties@hq.com"},
        {"name": "Franchise Corp", "contact": "accounts@franchise.com"},
    ]
    payee_ids = []
    for p in payees_data:
        doc = {
            "id": str(uuid.uuid4()),
            "name": p["name"],
            "contact": p["contact"],
            "created_at": datetime.now(timezone.utc),
        }
        await db.royalty_payees.insert_one(doc)
        payee_ids.append({"id": doc["id"], "name": p["name"]})
        print(f"  Royalty Payee: {p['name']}")

    # 10. Royalty Entries (last 3 months)
    print("  Generating royalty entries...")
    for month_offset in range(3):
        date = datetime.now(timezone.utc) - timedelta(days=month_offset * 30)
        month_str = date.strftime("%Y-%m")
        for rest in restaurant_ids:
            payee = random.choice(payee_ids)
            doc = {
                "id": str(uuid.uuid4()),
                "restaurant_id": rest["id"],
                "restaurant_name": rest["name"],
                "payee_id": payee["id"],
                "payee_name": payee["name"],
                "amount": round(random.uniform(5000, 25000), 2),
                "month": month_str,
                "status": random.choice(["paid", "pending", "paid"]),
                "notes": "",
                "created_by": "suadmin",
                "created_at": date,
            }
            await db.royalty_entries.insert_one(doc)
    print(f"  Created {3 * len(restaurant_ids)} royalty entries")

    # 11. Restaurant Targets
    print("  Generating restaurant targets...")
    for rest in restaurant_ids:
        for month_offset in range(3):
            date = datetime.now(timezone.utc) - timedelta(days=month_offset * 30)
            month_str = date.strftime("%Y-%m")
            doc = {
                "id": str(uuid.uuid4()),
                "restaurant_id": rest["id"],
                "restaurant_name": rest["name"],
                "month": month_str,
                "target_amount": round(random.uniform(200000, 800000), 2),
                "created_by": "suadmin",
                "created_at": datetime.now(timezone.utc),
            }
            await db.restaurant_targets.insert_one(doc)
    print(f"  Created {3 * len(restaurant_ids)} targets")

    # 12. Additional Users
    users_data = [
        {"username": "admin1", "password": "Admin@1234", "role": "admin", "name": "Admin User", "email": "admin@example.com", "mobile": "+91 99999 00001"},
        {"username": "manager1", "password": "Manager@1234", "role": "manager", "name": "Raj Manager", "email": "raj@example.com", "mobile": "+91 99999 00002",
         "assigned_restaurant_ids": [restaurant_ids[0]["id"], restaurant_ids[1]["id"]],
         "permissions": {"revenue": "edit", "restaurants": "view", "reports": "view", "employees": "edit", "documents": "view", "users": "none", "expenses": "edit", "royalty": "view", "targets": "view"}},
        {"username": "manager2", "password": "Manager@1234", "role": "manager", "name": "Priya Manager", "email": "priya.mgr@example.com", "mobile": "+91 99999 00003",
         "assigned_restaurant_ids": [restaurant_ids[2]["id"], restaurant_ids[3]["id"]],
         "permissions": {"revenue": "edit", "restaurants": "view", "reports": "view", "employees": "view", "documents": "view", "users": "none", "expenses": "view", "royalty": "none", "targets": "view"}},
    ]
    for u in users_data:
        doc = {
            "id": str(uuid.uuid4()),
            "username": u["username"],
            "hashed_password": pwd_context.hash(u["password"]),
            "role": u["role"],
            "name": u["name"],
            "email": u["email"],
            "mobile": u["mobile"],
            "assigned_restaurant_ids": u.get("assigned_restaurant_ids", []),
            "permissions": u.get("permissions", {}),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(doc)
        print(f"  User: {u['username']} ({u['role']})")

    print("\n--- Seed Complete ---")
    print(f"  Brands: {len(brands_data)}")
    print(f"  Restaurants: {len(restaurants_data)}")
    print(f"  Revenue Categories: {len(categories_data)}")
    print(f"  Revenue Entries: {revenue_count}")
    print(f"  Employees: {len(employees_data)}")
    print(f"  Expense Categories: {len(expense_cats_data)}")
    print(f"  Expense Entries: {expense_count}")
    print(f"  Royalty Payees: {len(payees_data)}")
    print(f"  Royalty Entries: {3 * len(restaurant_ids)}")
    print(f"  Restaurant Targets: {3 * len(restaurant_ids)}")
    print(f"  Users: {len(users_data)} (+ suadmin)")
    print("\nLogin credentials:")
    print("  suadmin / suadmin (superuser)")
    print("  admin1 / Admin@1234 (admin)")
    print("  manager1 / Manager@1234 (manager - Spice Garden outlets)")
    print("  manager2 / Manager@1234 (manager - Dragon Wok outlets)")

if __name__ == "__main__":
    asyncio.run(seed())
