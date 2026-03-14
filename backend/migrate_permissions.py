#!/usr/bin/env python3
"""
Migration script to add new permission sections to existing users.
Adds: royalty, expenses, targets, brands permissions to all existing users.
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def migrate_permissions():
    """Add new permission sections to existing users"""
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 60)
    print("Permission Migration Script")
    print("=" * 60)
    print()
    
    # New sections to add
    new_sections = ['royalty', 'expenses', 'targets', 'brands']
    
    # Get all users
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    print(f"Found {len(users)} users")
    print()
    
    updated_count = 0
    
    for user in users:
        username = user.get('username', 'unknown')
        role = user.get('role', 'unknown')
        permissions = user.get('permissions', {})
        
        # Check if user already has new sections
        has_new_sections = all(section in permissions for section in new_sections)
        
        if has_new_sections:
            print(f"✓ {username} ({role}): Already has new sections")
            continue
        
        # Add new sections based on role
        # Handle case where permissions might be a list (incorrect format)
        if isinstance(permissions, list):
            print(f"⚠ {username} ({role}): Permissions is a list, converting to dict")
            updated_permissions = {}
        else:
            updated_permissions = permissions.copy()
        
        if role == 'admin' or role == 'superuser':
            # Admin and superuser get full access
            for section in new_sections:
                if section not in updated_permissions:
                    updated_permissions[section] = 'full'
            access_type = "full"
        elif role == 'manager':
            # Manager gets readonly access
            for section in new_sections:
                if section not in updated_permissions:
                    updated_permissions[section] = 'readonly'
            access_type = "readonly"
        else:
            # Unknown role, skip
            print(f"⚠ {username} ({role}): Unknown role, skipping")
            continue
        
        # Update user in database
        result = await db.users.update_one(
            {"id": user['id']},
            {"$set": {"permissions": updated_permissions}}
        )
        
        if result.modified_count > 0:
            print(f"✅ {username} ({role}): Added new sections with {access_type} access")
            updated_count += 1
        else:
            print(f"⚠ {username} ({role}): Update failed")
    
    print()
    print("=" * 60)
    print(f"Migration Complete: {updated_count} users updated")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_permissions())
