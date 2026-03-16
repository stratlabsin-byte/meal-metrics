from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import time
from passlib.context import CryptContext
from jose import jwt, JWTError
import aiofiles
import json
import calendar

import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# File upload security settings
ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
ALLOWED_DOCUMENT_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'doc', 'docx', 'xls', 'xlsx'}
MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

def validate_upload(file: UploadFile, allowed_extensions: set, max_size: int = MAX_UPLOAD_SIZE_BYTES):
    """Validate file extension and size before saving."""
    if not file.filename or '.' not in file.filename:
        raise HTTPException(status_code=400, detail="File must have a valid extension")
    extension = file.filename.rsplit('.', 1)[-1].lower()
    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type '.{extension}' not allowed. Allowed: {', '.join(sorted(allowed_extensions))}"
        )
    return extension

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY environment variable is required. Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\"")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours (reduced from 7 days)

# Create the main app without a prefix
app = FastAPI()

@app.get("/health")
async def health():
    return {"status": "ok", "service": "MealMetrics API", "docs": "/docs"}

# Mount static files for uploads
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
(UPLOAD_DIR / "employee_photos").mkdir(exist_ok=True)
(UPLOAD_DIR / "restaurant_documents").mkdir(exist_ok=True)

app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Auto-create super admin on first run
@app.on_event("startup")
async def create_default_superadmin():
    """Create default super admin if no users exist"""
    try:
        # Check if any users exist
        user_count = await db.users.count_documents({})
        
        if user_count == 0:
            # No users exist, create default super admin
            default_superadmin = {
                "id": str(uuid.uuid4()),
                "username": "suadmin",
                "password": pwd_context.hash("suadmin"),
                "role": "superuser",
                "status": "active",
                "assigned_restaurant_ids": [],
                "permissions": {
                    "dashboard": "full",
                    "restaurants": "full",
                    "revenue": "full",
                    "revenue_categories": "full",
                    "employees": "full",
                    "documents": "full",
                    "users": "full",
                    "royalty": "full",
                    "expenses": "full",
                    "targets": "full",
                    "brands": "full"
                },
                "name": "Super Administrator",
                "mobile": "",
                "email": "",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.users.insert_one(default_superadmin)
            print("=" * 60)
            print("DEFAULT SUPER ADMIN CREATED!")
            print("=" * 60)
            print("Username: suadmin")
            print("Password: suadmin")
            print("Role: Superuser")
            print("=" * 60)
            print("IMPORTANT: Please change the password after first login!")
            print("=" * 60)
        else:
            print(f"[OK] Database already has {user_count} user(s). Skipping default admin creation.")

        # Ensure business config exists
        config_count = await db.business_config.count_documents({})
        if config_count == 0:
            default_config = BusinessConfig()
            config_doc = default_config.model_dump()
            config_doc['created_at'] = config_doc['created_at'].isoformat()
            config_doc['updated_at'] = config_doc['updated_at'].isoformat()
            await db.business_config.insert_one(config_doc)
            print("[OK] Default business configuration created.")

        # Migrate existing restaurants: copy legacy fields into custom_fields
        restaurants_to_migrate = await db.restaurants.find(
            {"custom_fields": {"$exists": False}}
        ).to_list(10000)
        if restaurants_to_migrate:
            for restaurant in restaurants_to_migrate:
                custom_fields = {}
                for key in ["gst_number", "phone", "address", "msme_number"]:
                    if restaurant.get(key):
                        custom_fields[key] = restaurant[key]
                await db.restaurants.update_one(
                    {"_id": restaurant["_id"]},
                    {"$set": {"custom_fields": custom_fields}}
                )
            print(f"[OK] Migrated {len(restaurants_to_migrate)} restaurants to custom_fields format.")

    except Exception as e:
        print(f"[ERROR] Error in startup: {e}")

# Helper functions
MIN_PASSWORD_LENGTH = 8

def validate_password_strength(password: str):
    """Enforce minimum password requirements."""
    if len(password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=400, detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters long")
    if not re.search(r'[A-Z]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    if not re.search(r'[a-z]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter")
    if not re.search(r'[0-9]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one digit")

# Simple in-memory rate limiter for login attempts
class LoginRateLimiter:
    def __init__(self, max_attempts: int = 5, window_seconds: int = 300):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str):
        now = time.time()
        # Remove expired attempts
        self._attempts[key] = [t for t in self._attempts[key] if now - t < self.window_seconds]
        if len(self._attempts[key]) >= self.max_attempts:
            raise HTTPException(
                status_code=429,
                detail=f"Too many login attempts. Try again in {self.window_seconds // 60} minutes."
            )

    def record(self, key: str):
        self._attempts[key].append(time.time())

    def clear(self, key: str):
        self._attempts.pop(key, None)

login_limiter = LoginRateLimiter(max_attempts=5, window_seconds=300)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Models
class UserRegister(BaseModel):
    username: str
    password: str
    role: str = "manager"  # admin, manager, or superuser

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    role: str  # admin, manager, or superuser
    status: str = "active"  # active or suspended
    assigned_restaurant_ids: List[str] = []  # For managers - which restaurants they can access
    permissions: dict = {}  # Permission levels: {"dashboard": "full", "restaurants": "readonly", "revenue": "none"}
    # Possible values: "none", "readonly", "full"
    # Admin default: all "full" unless restricted by superuser
    name: Optional[str] = ""  # Full name
    mobile: Optional[str] = ""  # Mobile number
    email: Optional[str] = ""  # Email address
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    token: str

class UserUpdate(BaseModel):
    password: Optional[str] = None
    status: Optional[str] = None  # active or suspended
    assigned_restaurant_ids: Optional[List[str]] = None  # For manager restaurant assignment
    permissions: Optional[dict] = None  # Permission levels: {"section": "level"}
    name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None

class RestaurantCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    brand: str  # Made mandatory
    gst_number: Optional[str] = ""
    address: Optional[str] = ""
    phone: Optional[str] = ""
    msme_number: Optional[str] = ""
    custom_fields: Optional[dict] = {}

class Restaurant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    brand: str = ""
    gst_number: Optional[str] = ""
    address: Optional[str] = ""
    phone: Optional[str] = ""
    msme_number: Optional[str] = ""
    custom_fields: dict = {}
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RevenueCreate(BaseModel):
    restaurant_id: str
    amounts: dict  # Changed from single amount to amounts dict
    date: str  # YYYY-MM-DD format
    notes: Optional[str] = ""

class Revenue(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    restaurant_name: str = ""
    amounts: dict = {}  # Changed from single amount to amounts dict
    total_amount: float = 0  # Calculated total
    date: str
    notes: str = ""
    submitted_by: str
    submitted_by_username: str = ""
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BrandCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class Brand(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryMasterCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class CategoryMaster(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RevenueCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    is_required: bool = True
    restaurant_id: str  # Added restaurant association

class RevenueCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    is_required: bool = True
    restaurant_id: str
    restaurant_name: str = ""
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RoyaltyPayeeCreate(BaseModel):
    name: str

class RoyaltyPayee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class ExpenseCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PettyCashBalanceCreate(BaseModel):
    restaurant_id: str
    date: str  # YYYY-MM-DD
    opening_balance: float
    notes: Optional[str] = ""

class PettyCashBalance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    restaurant_name: str = ""
    date: str
    opening_balance: float
    notes: str = ""
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseEntryCreate(BaseModel):
    date: str  # YYYY-MM-DD
    manager_name: str
    restaurant_id: str
    category_id: str
    description: str
    vendor_name: str
    amount: float
    payment_method: str
    payment_method_other: Optional[str] = ""
    receipt_url: Optional[str] = ""
    cash_variance: Optional[float] = 0

class ExpenseEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    manager_name: str
    restaurant_id: str
    restaurant_name: str = ""
    category_id: str
    category_name: str = ""
    description: str
    vendor_name: str
    amount: float
    payment_method: str
    payment_method_other: str = ""
    receipt_url: str = ""

class BalanceAdditionCreate(BaseModel):
    restaurant_id: str
    amount: float
    notes: Optional[str] = ""

class BalanceAddition(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    restaurant_name: str = ""
    amount: float
    notes: str = ""
    added_by: str = ""
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RestaurantTargetCreate(BaseModel):
    restaurant_id: str
    fiscal_year: int  # Starting year of fiscal year (e.g., 2024 for FY 2024-25)
    period_type: str  # "monthly", "quarterly", "half_yearly", "yearly"
    period_value: Optional[int] = None  # Month (1-12), Quarter (1-4), Half (1-2), null for yearly
    target_amount: float

class RestaurantTarget(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    restaurant_name: str = ""
    fiscal_year: int
    period_type: str
    period_value: Optional[int] = None
    target_amount: float
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RoyaltyEntryCreate(BaseModel):
    month: int  # 1-12
    year: int
    payee_id: str
    royalty_type: str
    amount: float
    restaurant_id: Optional[str] = None
    notes: Optional[str] = ""

class RoyaltyEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    month: int
    year: int
    payee_id: str
    payee_name: str = ""
    royalty_type: str
    amount: float
    restaurant_id: Optional[str] = None
    restaurant_name: str = ""
    notes: str = ""
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmployeeCreate(BaseModel):
    name: str
    email: str
    phone: str
    position: str
    salary: Optional[float] = None
    join_date: str
    employment_status: str  # active, inactive, terminated
    id_document_number: Optional[str] = None
    restaurant_ids: List[str]  # Can work at multiple restaurants

class Employee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    position: str
    salary: Optional[float] = None
    join_date: str
    employment_status: str
    id_document_number: Optional[str] = None
    restaurant_ids: List[str]
    photo_url: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RestaurantDocumentCreate(BaseModel):
    restaurant_id: str
    document_type: str  # business_license, health_permit, tax_document, contract, other
    document_name: str
    expiry_date: Optional[str] = None
    notes: Optional[str] = ""

class RestaurantDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    restaurant_name: str = ""
    document_type: str
    document_name: str
    file_url: str
    file_type: str
    expiry_date: Optional[str] = None
    notes: Optional[str] = ""
    uploaded_by: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Business Configuration Models
class CustomFieldDefinition(BaseModel):
    field_key: str
    label: str
    field_type: str = "text"  # text, number, date, textarea, select
    placeholder: str = ""
    required: bool = False
    options: List[str] = []
    order: int = 0

class BusinessConfigCreate(BaseModel):
    business_type: str = "Food Court"
    app_name: str = "Food Court Manager"
    entity_label_singular: str = "Restaurant"
    entity_label_plural: str = "Restaurants"
    revenue_label: str = "Revenue"
    brand_label: str = "Brand"
    document_types: List[dict] = []
    custom_fields: List[dict] = []

class BusinessConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    business_type: str = "Food Court"
    app_name: str = "Food Court Manager"
    entity_label_singular: str = "Restaurant"
    entity_label_plural: str = "Restaurants"
    revenue_label: str = "Revenue"
    brand_label: str = "Brand"
    document_types: List[dict] = [
        {"value": "business_license", "label": "Business License"},
        {"value": "health_permit", "label": "Health Permit"},
        {"value": "tax_document", "label": "Tax Document"},
        {"value": "contract", "label": "Contract"},
        {"value": "other", "label": "Other"}
    ]
    custom_fields: List[dict] = [
        {"field_key": "gst_number", "label": "GST Number", "field_type": "text", "placeholder": "e.g., 22AAAAA0000A1Z5", "required": False, "options": [], "order": 1},
        {"field_key": "phone", "label": "Phone Number", "field_type": "text", "placeholder": "e.g., +91 98765 43210", "required": False, "options": [], "order": 2},
        {"field_key": "address", "label": "Address", "field_type": "textarea", "placeholder": "Enter full address", "required": False, "options": [], "order": 3},
        {"field_key": "msme_number", "label": "MSME Number", "field_type": "text", "placeholder": "Enter MSME registration number", "required": False, "options": [], "order": 4}
    ]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DashboardStats(BaseModel):
    total_revenue: float
    total_entries: int
    restaurant_breakdown: List[dict]
    date_wise_revenue: List[dict]

# User management endpoints (Admin only)
@api_router.get("/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    # Admin and superuser can view all users
    if current_user['role'] not in ['admin', 'superuser']:
        raise HTTPException(status_code=403, detail="Admin or Superuser access required")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, user_update: UserUpdate, current_user: dict = Depends(get_current_user)):
    # Admin and superuser can update users
    if current_user['role'] not in ['admin', 'superuser']:
        raise HTTPException(status_code=403, detail="Admin or Superuser access required")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Admin cannot modify superuser
    if current_user['role'] == 'admin' and user['role'] == 'superuser':
        raise HTTPException(status_code=403, detail="Admin cannot modify Superuser accounts")
    
    update_data = {"updated_at": datetime.now(timezone.utc)}
    
    # Update password if provided
    if user_update.password:
        validate_password_strength(user_update.password)
        update_data['password'] = hash_password(user_update.password)
    
    # Update status if provided
    if user_update.status:
        # Prevent suspending yourself
        if user_id == current_user['id'] and user_update.status == 'suspended':
            raise HTTPException(status_code=400, detail="Cannot suspend your own account")
        update_data['status'] = user_update.status
    
    # Update restaurant assignments if provided
    if user_update.assigned_restaurant_ids is not None:
        update_data['assigned_restaurant_ids'] = user_update.assigned_restaurant_ids
    
    # Update permissions if provided
    if user_update.permissions is not None:
        update_data['permissions'] = user_update.permissions
    
    # Update user details if provided
    if user_update.name is not None:
        update_data['name'] = user_update.name
    if user_update.mobile is not None:
        update_data['mobile'] = user_update.mobile
    if user_update.email is not None:
        update_data['email'] = user_update.email
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return updated_user

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    # Only admin and superuser can delete users
    if current_user['role'] not in ['admin', 'superuser']:
        raise HTTPException(status_code=403, detail="Admin or Superuser access required")
    
    # Prevent deleting yourself
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Admin cannot delete superuser
    if current_user['role'] == 'admin' and user['role'] == 'superuser':
        raise HTTPException(status_code=403, detail="Admin cannot delete Superuser accounts")
    
    await db.users.delete_one({"id": user_id})
    return {"message": "User deleted successfully"}

# User profile management
class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

@api_router.put("/profile")
async def update_own_profile(profile_update: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Allow any user to update their own profile information"""
    update_data = {"updated_at": datetime.now(timezone.utc)}
    
    if profile_update.name is not None:
        update_data['name'] = profile_update.name
    if profile_update.mobile is not None:
        update_data['mobile'] = profile_update.mobile
    if profile_update.email is not None:
        update_data['email'] = profile_update.email
    if profile_update.password:
        validate_password_strength(profile_update.password)
        update_data['password'] = hash_password(profile_update.password)
    
    await db.users.update_one({"id": current_user['id']}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": current_user['id']}, {"_id": 0, "password": 0})
    return updated_user

# Protected user creation endpoint
@api_router.post("/users", response_model=dict)
async def create_user(user_data: UserRegister, current_user: dict = Depends(get_current_user)):
    """Create a new user with role-based restrictions"""
    
    # Check permissions based on current user's role
    if current_user['role'] == 'manager':
        # Manager can only create managers if they have "users" permission with "full" access
        user_permissions = current_user.get('permissions', {})
        if user_permissions.get('users') != 'full':
            raise HTTPException(status_code=403, detail="Manager requires 'users' full permission to create users")
        if user_data.role != 'manager':
            raise HTTPException(status_code=403, detail="Managers can only create Manager accounts")
    
    elif current_user['role'] == 'admin':
        # Admin can create admin and manager, but NOT superuser
        if user_data.role == 'superuser':
            raise HTTPException(status_code=403, detail="Admin cannot create Superuser accounts")
    
    # Superuser can create any role (no restrictions)
    
    # Check if username exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Validate password strength
    validate_password_strength(user_data.password)

    # Create user with default permissions
    hashed_password = hash_password(user_data.password)
    
    # Set default permissions based on role
    default_permissions = {}
    sections = ['dashboard', 'restaurants', 'revenue', 'revenue_categories', 'employees', 'documents', 'users', 'royalty', 'expenses', 'targets', 'brands']
    
    # Sections where managers should only have readonly access
    readonly_sections_for_manager = ['royalty', 'expenses', 'targets', 'brands']
    
    if user_data.role == 'admin':
        for section in sections:
            default_permissions[section] = 'full'
    elif user_data.role == 'manager':
        for section in sections:
            if section == 'users':
                default_permissions[section] = 'none'
            elif section in readonly_sections_for_manager:
                default_permissions[section] = 'readonly'
            else:
                default_permissions[section] = 'full'
    
    user = User(
        username=user_data.username,
        role=user_data.role,
        permissions=default_permissions
    )
    
    user_doc = user.model_dump()
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    user_doc['updated_at'] = user_doc['updated_at'].isoformat()
    user_doc['password'] = hashed_password

    await db.users.insert_one(user_doc)

    return {"message": "User created successfully", "user_id": user.id}

# Check if database is empty (for first-time setup info)
@api_router.get("/auth/check-setup")
async def check_setup():
    """Check if any users exist in the database (only reveals boolean, not count)"""
    user_count = await db.users.count_documents({})
    return {"has_users": user_count > 0}

# Business Configuration endpoints
@api_router.get("/business-config")
async def get_business_config():
    """Public endpoint - returns business config for app branding (no auth required)."""
    config = await db.business_config.find_one({}, {"_id": 0})
    if not config:
        default = BusinessConfig()
        return default.model_dump()
    return config

@api_router.put("/business-config")
async def update_business_config(config_data: BusinessConfigCreate, current_user: dict = Depends(get_current_user)):
    """Update business configuration - admin/superuser only."""
    require_admin_or_superuser(current_user)

    existing = await db.business_config.find_one({})
    update_dict = config_data.model_dump()
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()

    if existing:
        await db.business_config.update_one(
            {"id": existing["id"]},
            {"$set": update_dict}
        )
    else:
        new_config = BusinessConfig(**config_data.model_dump())
        doc = new_config.model_dump()
        doc['created_at'] = datetime.now(timezone.utc).isoformat()
        doc['updated_at'] = doc['created_at']
        await db.business_config.insert_one(doc)

    return await db.business_config.find_one({}, {"_id": 0})

# Auth endpoints
# NOTE: Public /auth/register endpoint removed - use authenticated POST /users instead

@api_router.post("/auth/login", response_model=UserResponse)
async def login(user_data: UserLogin):
    # Rate limit by username
    login_limiter.check(user_data.username)

    user = await db.users.find_one({"username": user_data.username}, {"_id": 0})
    if not user:
        login_limiter.record(user_data.username)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(user_data.password, user['password']):
        login_limiter.record(user_data.username)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Check if user is suspended
    if user.get('status') == 'suspended':
        raise HTTPException(status_code=403, detail="Account suspended. Contact administrator.")

    # Successful login - clear rate limit counter
    login_limiter.clear(user_data.username)

    # Generate token
    token = create_access_token({"sub": user['id'], "username": user['username'], "role": user['role']})

    return UserResponse(
        id=user['id'],
        username=user['username'],
        role=user['role'],
        token=token
    )

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(**current_user)

# Restaurant endpoints
@api_router.post("/restaurants", response_model=Restaurant)
async def create_restaurant(restaurant_data: RestaurantCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can create restaurants")
    
    restaurant = Restaurant(
        name=restaurant_data.name,
        description=restaurant_data.description,
        brand=restaurant_data.brand,
        gst_number=restaurant_data.gst_number,
        address=restaurant_data.address,
        phone=restaurant_data.phone,
        msme_number=restaurant_data.msme_number,
        custom_fields=restaurant_data.custom_fields or {},
        created_by=current_user['id']
    )
    
    restaurant_doc = restaurant.model_dump()
    restaurant_doc['created_at'] = restaurant_doc['created_at'].isoformat()
    
    await db.restaurants.insert_one(restaurant_doc)
    
    return restaurant

@api_router.get("/restaurants", response_model=List[Restaurant])
async def get_restaurants(current_user: dict = Depends(get_current_user)):
    # Admins and superusers see all restaurants
    if current_user['role'] in ['admin', 'superuser']:
        restaurants = await db.restaurants.find({}, {"_id": 0}).to_list(1000)
    else:
        # Managers only see their assigned restaurants
        user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
        assigned_restaurant_ids = user.get('assigned_restaurant_ids', [])
        
        if not assigned_restaurant_ids:
            # If no restaurants assigned, return empty list
            return []
        
        restaurants = await db.restaurants.find(
            {"id": {"$in": assigned_restaurant_ids}},
            {"_id": 0}
        ).to_list(1000)
    
    for restaurant in restaurants:
        if isinstance(restaurant['created_at'], str):
            restaurant['created_at'] = datetime.fromisoformat(restaurant['created_at'])
    
    return restaurants

@api_router.put("/restaurants/{restaurant_id}", response_model=Restaurant)
async def update_restaurant(restaurant_id: str, restaurant_data: RestaurantCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can update restaurants")
    
    result = await db.restaurants.update_one(
        {"id": restaurant_id},
        {"$set": {
            "name": restaurant_data.name,
            "description": restaurant_data.description,
            "brand": restaurant_data.brand,
            "gst_number": restaurant_data.gst_number,
            "address": restaurant_data.address,
            "phone": restaurant_data.phone,
            "msme_number": restaurant_data.msme_number,
            "custom_fields": restaurant_data.custom_fields or {}
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    restaurant = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
    if isinstance(restaurant['created_at'], str):
        restaurant['created_at'] = datetime.fromisoformat(restaurant['created_at'])
    
    return Restaurant(**restaurant)

@api_router.delete("/restaurants/{restaurant_id}")
async def delete_restaurant(restaurant_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can delete restaurants")
    
    result = await db.restaurants.delete_one({"id": restaurant_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Also delete all revenue entries for this restaurant
    await db.revenues.delete_many({"restaurant_id": restaurant_id})
    
    return {"message": "Restaurant deleted successfully"}

# Revenue Categories endpoints
@api_router.post("/revenue-categories", response_model=RevenueCategory)
async def create_revenue_category(category_data: RevenueCategoryCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can create revenue categories")
    
    # Check if restaurant exists
    restaurant = await db.restaurants.find_one({"id": category_data.restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    category = RevenueCategory(
        name=category_data.name,
        description=category_data.description,
        is_required=category_data.is_required,
        restaurant_id=category_data.restaurant_id,
        restaurant_name=restaurant['name'],
        created_by=current_user['id']
    )
    
    category_doc = category.model_dump()
    category_doc['created_at'] = category_doc['created_at'].isoformat()
    
    await db.revenue_categories.insert_one(category_doc)
    
    return category

@api_router.get("/revenue-categories", response_model=List[RevenueCategory])
async def get_revenue_categories(current_user: dict = Depends(get_current_user), restaurant_id: Optional[str] = None):
    query = {}
    if restaurant_id:
        query['restaurant_id'] = restaurant_id
    
    categories = await db.revenue_categories.find(query, {"_id": 0}).to_list(1000)
    
    for category in categories:
        if isinstance(category['created_at'], str):
            category['created_at'] = datetime.fromisoformat(category['created_at'])
    
    return categories

@api_router.get("/revenue-categories/restaurant/{restaurant_id}", response_model=List[RevenueCategory])
async def get_categories_by_restaurant(restaurant_id: str, current_user: dict = Depends(get_current_user)):
    # Check if restaurant exists
    restaurant = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    categories = await db.revenue_categories.find({"restaurant_id": restaurant_id}, {"_id": 0}).to_list(1000)
    
    for category in categories:
        if isinstance(category['created_at'], str):
            category['created_at'] = datetime.fromisoformat(category['created_at'])
    
    return categories

@api_router.put("/revenue-categories/{category_id}", response_model=RevenueCategory)
async def update_revenue_category(category_id: str, category_data: RevenueCategoryCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can update revenue categories")
    
    # Check if restaurant exists
    restaurant = await db.restaurants.find_one({"id": category_data.restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    result = await db.revenue_categories.update_one(
        {"id": category_id},
        {"$set": {
            "name": category_data.name, 
            "description": category_data.description,
            "is_required": category_data.is_required,
            "restaurant_id": category_data.restaurant_id,
            "restaurant_name": restaurant['name']
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Revenue category not found")
    
    category = await db.revenue_categories.find_one({"id": category_id}, {"_id": 0})
    if isinstance(category['created_at'], str):
        category['created_at'] = datetime.fromisoformat(category['created_at'])
    
    return RevenueCategory(**category)

@api_router.delete("/revenue-categories/{category_id}")
async def delete_revenue_category(category_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can delete revenue categories")
    
    result = await db.revenue_categories.delete_one({"id": category_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Revenue category not found")
    
    return {"message": "Revenue category deleted successfully"}

# Brand Management Endpoints
@api_router.post("/brands", response_model=Brand)
async def create_brand(brand: BrandCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'superuser']:
        raise HTTPException(status_code=403, detail="Only admins can create brands")
    
    # Check if brand already exists
    existing = await db.brands.find_one({"name": brand.name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Brand with this name already exists")
    
    brand_dict = brand.model_dump()
    brand_dict["id"] = str(uuid.uuid4())
    brand_dict["created_at"] = datetime.now(timezone.utc)
    
    await db.brands.insert_one(brand_dict)
    
    return await db.brands.find_one({"id": brand_dict["id"]}, {"_id": 0})

@api_router.get("/brands", response_model=List[Brand])
async def get_brands(current_user: dict = Depends(get_current_user)):
    brands = await db.brands.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return brands

@api_router.put("/brands/{brand_id}", response_model=Brand)
async def update_brand(brand_id: str, brand: BrandCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'superuser']:
        raise HTTPException(status_code=403, detail="Only admins can update brands")
    
    # Check if another brand with same name exists
    existing = await db.brands.find_one({"name": brand.name, "id": {"$ne": brand_id}}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Brand with this name already exists")
    
    update_data = brand.model_dump()
    
    result = await db.brands.update_one(
        {"id": brand_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    return await db.brands.find_one({"id": brand_id}, {"_id": 0})

@api_router.delete("/brands/{brand_id}")
async def delete_brand(brand_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'superuser']:
        raise HTTPException(status_code=403, detail="Only admins can delete brands")
    
    # Check if any restaurants use this brand
    restaurants_using_brand = await db.restaurants.find_one({"brand": brand_id}, {"_id": 0})
    if restaurants_using_brand:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete brand as it is being used by restaurants. Please update restaurants first."
        )
    
    result = await db.brands.delete_one({"id": brand_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    return {"message": "Brand deleted successfully"}

# Category Master Management Endpoints
@api_router.post("/category-master", response_model=CategoryMaster)
async def create_category_master(category: CategoryMasterCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'superuser']:
        raise HTTPException(status_code=403, detail="Only admins can create category masters")
    
    # Check if category already exists
    existing = await db.category_master.find_one({"name": category.name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    category_dict = category.model_dump()
    category_dict["id"] = str(uuid.uuid4())
    category_dict["created_at"] = datetime.now(timezone.utc)
    
    await db.category_master.insert_one(category_dict)
    
    return await db.category_master.find_one({"id": category_dict["id"]}, {"_id": 0})

@api_router.get("/category-master", response_model=List[CategoryMaster])
async def get_category_master(current_user: dict = Depends(get_current_user)):
    categories = await db.category_master.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return categories

@api_router.put("/category-master/{category_id}", response_model=CategoryMaster)
async def update_category_master(category_id: str, category: CategoryMasterCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'superuser']:
        raise HTTPException(status_code=403, detail="Only admins can update category masters")
    
    # Check if another category with same name exists
    existing = await db.category_master.find_one({"name": category.name, "id": {"$ne": category_id}}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    update_data = category.model_dump()
    
    result = await db.category_master.update_one(
        {"id": category_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return await db.category_master.find_one({"id": category_id}, {"_id": 0})

@api_router.delete("/category-master/{category_id}")
async def delete_category_master(category_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'superuser']:
        raise HTTPException(status_code=403, detail="Only admins can delete category masters")
    
    # Check if any revenue categories use this master category
    categories_using = await db.revenue_categories.find_one({"name": category_id}, {"_id": 0})
    if categories_using:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete category as it is being used by revenue categories. Please update revenue categories first."
        )
    
    result = await db.category_master.delete_one({"id": category_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category master deleted successfully"}

# Royalty Payee Management Endpoints
@api_router.post("/royalty-payees", response_model=RoyaltyPayee)
async def create_royalty_payee(payee: RoyaltyPayeeCreate, current_user: dict = Depends(get_current_user)):
    require_admin_or_superuser(current_user)
    # Check if payee already exists
    existing = await db.royalty_payees.find_one({"name": payee.name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Payee with this name already exists")
    
    payee_dict = payee.model_dump()
    payee_dict["id"] = str(uuid.uuid4())
    payee_dict["created_at"] = datetime.now(timezone.utc)
    
    await db.royalty_payees.insert_one(payee_dict)
    
    return await db.royalty_payees.find_one({"id": payee_dict["id"]}, {"_id": 0})

@api_router.get("/royalty-payees", response_model=List[RoyaltyPayee])
async def get_royalty_payees(current_user: dict = Depends(get_current_user)):
    payees = await db.royalty_payees.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return payees

@api_router.put("/royalty-payees/{payee_id}", response_model=RoyaltyPayee)
async def update_royalty_payee(payee_id: str, payee: RoyaltyPayeeCreate, current_user: dict = Depends(get_current_user)):
    require_admin_or_superuser(current_user)
    # Check if another payee with same name exists
    existing = await db.royalty_payees.find_one({"name": payee.name, "id": {"$ne": payee_id}}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Payee with this name already exists")
    
    result = await db.royalty_payees.update_one(
        {"id": payee_id},
        {"$set": {"name": payee.name}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payee not found")
    
    # Update payee_name in all royalty entries
    await db.royalty_entries.update_many(
        {"payee_id": payee_id},
        {"$set": {"payee_name": payee.name}}
    )
    
    return await db.royalty_payees.find_one({"id": payee_id}, {"_id": 0})

@api_router.delete("/royalty-payees/{payee_id}")
async def delete_royalty_payee(payee_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'superuser']:
        raise HTTPException(status_code=403, detail="Only admins can delete payees")
    
    result = await db.royalty_payees.delete_one({"id": payee_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payee not found")
    
    return {"message": "Payee deleted successfully"}

# Royalty Entry Management Endpoints
@api_router.post("/royalty-entries", response_model=RoyaltyEntry)
async def create_royalty_entry(entry: RoyaltyEntryCreate, current_user: dict = Depends(get_current_user)):
    # Validate month
    if entry.month < 1 or entry.month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")
    
    # Validate year
    if entry.year < 2000 or entry.year > 2100:
        raise HTTPException(status_code=400, detail="Invalid year")
    
    # Validate amount
    if entry.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    # Get payee name
    payee = await db.royalty_payees.find_one({"id": entry.payee_id}, {"_id": 0})
    if not payee:
        raise HTTPException(status_code=404, detail="Payee not found")
    
    entry_dict = entry.model_dump()
    entry_dict["id"] = str(uuid.uuid4())
    entry_dict["payee_name"] = payee["name"]
    entry_dict["created_by"] = current_user["id"]
    entry_dict["created_at"] = datetime.now(timezone.utc)
    
    # Get restaurant name if restaurant_id is provided
    if entry.restaurant_id:
        restaurant = await db.restaurants.find_one({"id": entry.restaurant_id}, {"_id": 0})
        if restaurant:
            entry_dict["restaurant_name"] = restaurant["name"]
    
    await db.royalty_entries.insert_one(entry_dict)
    
    return await db.royalty_entries.find_one({"id": entry_dict["id"]}, {"_id": 0})

@api_router.get("/royalty-entries", response_model=List[RoyaltyEntry])
async def get_royalty_entries(current_user: dict = Depends(get_current_user)):
    entries = await db.royalty_entries.find({}, {"_id": 0}).sort([("year", -1), ("month", -1)]).to_list(10000)
    return entries

@api_router.get("/royalty-entries/{entry_id}", response_model=RoyaltyEntry)
async def get_royalty_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    entry = await db.royalty_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@api_router.put("/royalty-entries/{entry_id}", response_model=RoyaltyEntry)
async def update_royalty_entry(entry_id: str, entry: RoyaltyEntryCreate, current_user: dict = Depends(get_current_user)):
    # Validate month
    if entry.month < 1 or entry.month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")
    
    # Validate amount
    if entry.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    # Get payee name
    payee = await db.royalty_payees.find_one({"id": entry.payee_id}, {"_id": 0})
    if not payee:
        raise HTTPException(status_code=404, detail="Payee not found")
    
    update_data = entry.model_dump()
    update_data["payee_name"] = payee["name"]
    
    result = await db.royalty_entries.update_one(
        {"id": entry_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    return await db.royalty_entries.find_one({"id": entry_id}, {"_id": 0})

@api_router.delete("/royalty-entries/{entry_id}")
async def delete_royalty_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    require_admin_or_superuser(current_user)
    result = await db.royalty_entries.delete_one({"id": entry_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    return {"message": "Entry deleted successfully"}

# Restaurant Target Management Endpoints
@api_router.post("/restaurant-targets", response_model=RestaurantTarget)
async def create_restaurant_target(target: RestaurantTargetCreate, current_user: dict = Depends(get_current_user)):
    require_admin_or_superuser(current_user)
    # Get restaurant name
    restaurant = await db.restaurants.find_one({"id": target.restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Check if target already exists for this combination
    existing = await db.restaurant_targets.find_one({
        "restaurant_id": target.restaurant_id,
        "fiscal_year": target.fiscal_year,
        "period_type": target.period_type,
        "period_value": target.period_value
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Target already exists for this period. Please update instead.")
    
    target_dict = target.model_dump()
    target_dict["id"] = str(uuid.uuid4())
    target_dict["restaurant_name"] = restaurant["name"]
    target_dict["created_by"] = current_user["id"]
    target_dict["created_at"] = datetime.now(timezone.utc)
    target_dict["updated_at"] = datetime.now(timezone.utc)
    
    await db.restaurant_targets.insert_one(target_dict)
    
    return await db.restaurant_targets.find_one({"id": target_dict["id"]}, {"_id": 0})

@api_router.get("/restaurant-targets", response_model=List[RestaurantTarget])
async def get_restaurant_targets(
    restaurant_id: Optional[str] = None,
    fiscal_year: Optional[int] = None,
    period_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if restaurant_id:
        query["restaurant_id"] = restaurant_id
    if fiscal_year:
        query["fiscal_year"] = fiscal_year
    if period_type:
        query["period_type"] = period_type
    
    targets = await db.restaurant_targets.find(query, {"_id": 0}).sort([("fiscal_year", -1), ("period_type", 1)]).to_list(1000)
    return targets

@api_router.get("/restaurant-targets/{target_id}", response_model=RestaurantTarget)
async def get_restaurant_target(target_id: str, current_user: dict = Depends(get_current_user)):
    target = await db.restaurant_targets.find_one({"id": target_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    return target

@api_router.put("/restaurant-targets/{target_id}", response_model=RestaurantTarget)
async def update_restaurant_target(target_id: str, target: RestaurantTargetCreate, current_user: dict = Depends(get_current_user)):
    require_admin_or_superuser(current_user)
    # Get restaurant name
    restaurant = await db.restaurants.find_one({"id": target.restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    update_data = target.model_dump()
    update_data["restaurant_name"] = restaurant["name"]
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.restaurant_targets.update_one(
        {"id": target_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Target not found")
    
    return await db.restaurant_targets.find_one({"id": target_id}, {"_id": 0})

@api_router.delete("/restaurant-targets/{target_id}")
async def delete_restaurant_target(target_id: str, current_user: dict = Depends(get_current_user)):
    require_admin_or_superuser(current_user)
    result = await db.restaurant_targets.delete_one({"id": target_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Target not found")
    
    return {"message": "Target deleted successfully"}

# Expense Category Management
@api_router.post("/expense-categories", response_model=ExpenseCategory)
async def create_expense_category(category: ExpenseCategoryCreate, current_user: dict = Depends(get_current_user)):
    require_admin_or_superuser(current_user)
    existing = await db.expense_categories.find_one({"name": category.name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    category_dict = category.model_dump()
    category_dict["id"] = str(uuid.uuid4())
    category_dict["created_at"] = datetime.now(timezone.utc)
    
    await db.expense_categories.insert_one(category_dict)
    return await db.expense_categories.find_one({"id": category_dict["id"]}, {"_id": 0})

@api_router.get("/expense-categories", response_model=List[ExpenseCategory])
async def get_expense_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.expense_categories.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return categories

@api_router.put("/expense-categories/{category_id}", response_model=ExpenseCategory)
async def update_expense_category(category_id: str, category: ExpenseCategoryCreate, current_user: dict = Depends(get_current_user)):
    require_admin_or_superuser(current_user)
    result = await db.expense_categories.update_one(
        {"id": category_id},
        {"$set": category.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return await db.expense_categories.find_one({"id": category_id}, {"_id": 0})

@api_router.delete("/expense-categories/{category_id}")
async def delete_expense_category(category_id: str, current_user: dict = Depends(get_current_user)):
    require_admin_or_superuser(current_user)
    result = await db.expense_categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# Petty Cash Balance Management
@api_router.post("/petty-cash-balances", response_model=PettyCashBalance)
async def create_petty_cash_balance(balance: PettyCashBalanceCreate, current_user: dict = Depends(get_current_user)):
    restaurant = await db.restaurants.find_one({"id": balance.restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    balance_dict = balance.model_dump()
    balance_dict["id"] = str(uuid.uuid4())
    balance_dict["restaurant_name"] = restaurant["name"]
    balance_dict["created_by"] = current_user["id"]
    balance_dict["created_at"] = datetime.now(timezone.utc)
    
    await db.petty_cash_balances.insert_one(balance_dict)
    return await db.petty_cash_balances.find_one({"id": balance_dict["id"]}, {"_id": 0})

@api_router.get("/petty-cash-balances")
async def get_petty_cash_balances(
    restaurant_id: Optional[str] = None,
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if restaurant_id:
        query["restaurant_id"] = restaurant_id
    if date:
        query["date"] = date
    
    balances = await db.petty_cash_balances.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return balances

# Expense Entry Management
@api_router.post("/expense-entries", response_model=ExpenseEntry)
async def create_expense_entry(entry: ExpenseEntryCreate, current_user: dict = Depends(get_current_user)):
    restaurant = await db.restaurants.find_one({"id": entry.restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    category = await db.expense_categories.find_one({"id": entry.category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    entry_dict = entry.model_dump()
    entry_dict["id"] = str(uuid.uuid4())
    entry_dict["restaurant_name"] = restaurant["name"]
    entry_dict["category_name"] = category["name"]
    entry_dict["created_by"] = current_user["id"]
    entry_dict["created_at"] = datetime.now(timezone.utc)
    
    await db.expense_entries.insert_one(entry_dict)
    return await db.expense_entries.find_one({"id": entry_dict["id"]}, {"_id": 0})

@api_router.get("/expense-entries", response_model=List[ExpenseEntry])
async def get_expense_entries(
    restaurant_id: Optional[str] = None,
    date: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if restaurant_id:
        query["restaurant_id"] = restaurant_id
    if date:
        query["date"] = date
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    entries = await db.expense_entries.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    return entries

@api_router.get("/expense-entries/{entry_id}", response_model=ExpenseEntry)
async def get_expense_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    entry = await db.expense_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@api_router.put("/expense-entries/{entry_id}", response_model=ExpenseEntry)
async def update_expense_entry(entry_id: str, entry: ExpenseEntryCreate, current_user: dict = Depends(get_current_user)):
    restaurant = await db.restaurants.find_one({"id": entry.restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    category = await db.expense_categories.find_one({"id": entry.category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = entry.model_dump()
    update_data["restaurant_name"] = restaurant["name"]
    update_data["category_name"] = category["name"]
    
    result = await db.expense_entries.update_one(
        {"id": entry_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    return await db.expense_entries.find_one({"id": entry_id}, {"_id": 0})

@api_router.delete("/expense-entries/{entry_id}")
async def delete_expense_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.expense_entries.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry deleted successfully"}

# Balance Addition Endpoints
@api_router.post("/balance-additions", response_model=BalanceAddition)
async def add_balance(balance: BalanceAdditionCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'superuser']:
        raise HTTPException(status_code=403, detail="Only admins can add balance")
    
    # Get restaurant name
    restaurant = await db.restaurants.find_one({"id": balance.restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    balance_dict = balance.model_dump()
    balance_dict["id"] = str(uuid.uuid4())
    balance_dict["restaurant_name"] = restaurant["name"]
    balance_dict["added_by"] = current_user["username"]
    balance_dict["added_at"] = datetime.now(timezone.utc)
    
    await db.balance_additions.insert_one(balance_dict)
    
    return await db.balance_additions.find_one({"id": balance_dict["id"]}, {"_id": 0})

@api_router.get("/balance-additions", response_model=List[BalanceAddition])
async def get_balance_additions(
    restaurant_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if restaurant_id:
        query["restaurant_id"] = restaurant_id
    
    additions = await db.balance_additions.find(query, {"_id": 0}).sort("added_at", -1).to_list(1000)
    return additions

@api_router.get("/balance-additions/total/{restaurant_id}")
async def get_opening_balance(restaurant_id: str, current_user: dict = Depends(get_current_user)):
    """Get total opening balance for a restaurant by summing all balance additions"""
    additions = await db.balance_additions.find({"restaurant_id": restaurant_id}, {"_id": 0}).to_list(1000)
    total = sum(addition.get("amount", 0) for addition in additions)
    return {"restaurant_id": restaurant_id, "opening_balance": total}

@api_router.get("/restaurant-targets/calculate/{restaurant_id}")
async def calculate_restaurant_target_achievement(
    restaurant_id: str,
    fiscal_year: int,
    period_type: str,
    period_value: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Calculate actual revenue vs target for a restaurant"""
    
    # Get target
    query = {
        "restaurant_id": restaurant_id,
        "fiscal_year": fiscal_year,
        "period_type": period_type
    }
    if period_value is not None:
        query["period_value"] = period_value
    
    target = await db.restaurant_targets.find_one(query, {"_id": 0})
    
    if not target:
        return {
            "target_amount": 0,
            "actual_amount": 0,
            "achievement_percentage": 0,
            "message": "No target set for this period"
        }
    
    # Calculate date range based on fiscal year and period
    # Fiscal year: April to March
    start_year = fiscal_year
    end_year = fiscal_year + 1
    
    if period_type == "monthly" and period_value:
        # Convert fiscal month (1=April, 12=March) to calendar month
        # fiscal 1 -> April(4), fiscal 9 -> December(12), fiscal 10 -> January(1), fiscal 12 -> March(3)
        actual_month = ((period_value - 1 + 3) % 12) + 1
        actual_year = start_year if period_value <= 9 else end_year
        start_date = f"{actual_year}-{actual_month:02d}-01"
        last_day = calendar.monthrange(actual_year, actual_month)[1]
        end_date = f"{actual_year}-{actual_month:02d}-{last_day}"
    
    elif period_type == "quarterly" and period_value:
        # Q1: Apr-Jun, Q2: Jul-Sep, Q3: Oct-Dec, Q4: Jan-Mar
        quarters = {
            1: ("04-01", "06-30", start_year),
            2: ("07-01", "09-30", start_year),
            3: ("10-01", "12-31", start_year),
            4: ("01-01", "03-31", end_year)
        }
        month_start, month_end, year = quarters[period_value]
        start_date = f"{year}-{month_start}"
        end_date = f"{year}-{month_end}"
    
    elif period_type == "half_yearly" and period_value:
        # H1: Apr-Sep, H2: Oct-Mar
        if period_value == 1:
            start_date = f"{start_year}-04-01"
            end_date = f"{start_year}-09-30"
        else:
            start_date = f"{start_year}-10-01"
            end_date = f"{end_year}-03-31"
    
    else:  # yearly
        start_date = f"{start_year}-04-01"
        end_date = f"{end_year}-03-31"
    
    # Get actual revenue for the period
    revenues = await db.revenues.find({
        "restaurant_id": restaurant_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(10000)
    
    actual_amount = sum(r.get("total_amount", 0) for r in revenues)
    
    achievement_percentage = (actual_amount / target["target_amount"] * 100) if target["target_amount"] > 0 else 0
    
    return {
        "target_amount": target["target_amount"],
        "actual_amount": actual_amount,
        "achievement_percentage": round(achievement_percentage, 2),
        "period_start": start_date,
        "period_end": end_date,
        "restaurant_name": target.get("restaurant_name", "")
    }

# Helper: require admin or superuser role
def require_admin_or_superuser(current_user: dict):
    if current_user['role'] not in ['admin', 'superuser']:
        raise HTTPException(status_code=403, detail="Admin or Superuser access required")

# Helper function to check restaurant access
async def check_restaurant_access(user_id: str, restaurant_id: str, role: str):
    if role in ['admin', 'superuser']:
        return True
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    assigned_restaurant_ids = user.get('assigned_restaurant_ids', [])
    
    return restaurant_id in assigned_restaurant_ids

# Revenue endpoints
@api_router.post("/revenues", response_model=Revenue)
async def create_revenue(revenue_data: RevenueCreate, current_user: dict = Depends(get_current_user)):
    # Check if restaurant exists
    restaurant = await db.restaurants.find_one({"id": revenue_data.restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Check if user has access to this restaurant
    has_access = await check_restaurant_access(current_user['id'], revenue_data.restaurant_id, current_user['role'])
    if not has_access:
        raise HTTPException(status_code=403, detail="You don't have access to this restaurant")
    
    # Calculate total amount
    total_amount = sum(float(amount) for amount in revenue_data.amounts.values() if amount)
    
    revenue = Revenue(
        restaurant_id=revenue_data.restaurant_id,
        restaurant_name=restaurant['name'],
        amounts=revenue_data.amounts,
        total_amount=total_amount,
        date=revenue_data.date,
        notes=revenue_data.notes,
        submitted_by=current_user['id'],
        submitted_by_username=current_user['username']
    )
    
    revenue_doc = revenue.model_dump()
    revenue_doc['submitted_at'] = revenue_doc['submitted_at'].isoformat()
    
    await db.revenues.insert_one(revenue_doc)
    
    return revenue

@api_router.get("/revenues", response_model=List[Revenue])
async def get_revenues(current_user: dict = Depends(get_current_user), restaurant_id: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None):
    query = {}

    # Managers can only see revenues for their assigned restaurants
    if current_user['role'] == 'manager':
        user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
        assigned_restaurant_ids = user.get('assigned_restaurant_ids', [])

        if not assigned_restaurant_ids:
            return []

        if restaurant_id:
            # Verify manager has access to the requested restaurant
            if restaurant_id not in assigned_restaurant_ids:
                raise HTTPException(status_code=403, detail="You don't have access to this restaurant")
            query['restaurant_id'] = restaurant_id
        else:
            query['restaurant_id'] = {"$in": assigned_restaurant_ids}
    elif restaurant_id:
        query['restaurant_id'] = restaurant_id

    if start_date:
        query['date'] = query.get('date', {})
        query['date']['$gte'] = start_date

    if end_date:
        query['date'] = query.get('date', {})
        query['date']['$lte'] = end_date
    
    revenues = await db.revenues.find(query, {"_id": 0}).to_list(1000)
    
    for revenue in revenues:
        if 'submitted_at' in revenue and isinstance(revenue['submitted_at'], str):
            revenue['submitted_at'] = datetime.fromisoformat(revenue['submitted_at'])
    
    return revenues

@api_router.put("/revenues/{revenue_id}", response_model=Revenue)
async def update_revenue(revenue_id: str, revenue_data: RevenueCreate, current_user: dict = Depends(get_current_user)):
    # Check if revenue exists
    existing_revenue = await db.revenues.find_one({"id": revenue_id}, {"_id": 0})
    if not existing_revenue:
        raise HTTPException(status_code=404, detail="Revenue entry not found")
    
    # Check if user can edit this revenue
    if current_user['role'] == 'manager':
        # Managers can edit revenue for their assigned restaurants
        if existing_revenue['restaurant_id'] not in current_user.get('assigned_restaurant_ids', []):
            raise HTTPException(status_code=403, detail="You can only edit revenue entries for your assigned restaurants")
    
    # Check if restaurant exists
    restaurant = await db.restaurants.find_one({"id": revenue_data.restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Calculate total amount
    total_amount = sum(float(amount) for amount in revenue_data.amounts.values() if amount)
    
    # Update the revenue
    update_data = {
        "restaurant_id": revenue_data.restaurant_id,
        "restaurant_name": restaurant['name'],
        "amounts": revenue_data.amounts,
        "total_amount": total_amount,
        "date": revenue_data.date,
        "notes": revenue_data.notes,
    }
    
    result = await db.revenues.update_one({"id": revenue_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Revenue entry not found")
    
    # Return updated revenue
    updated_revenue = await db.revenues.find_one({"id": revenue_id}, {"_id": 0})
    if isinstance(updated_revenue['submitted_at'], str):
        updated_revenue['submitted_at'] = datetime.fromisoformat(updated_revenue['submitted_at'])
    
    return Revenue(**updated_revenue)

@api_router.delete("/revenues/{revenue_id}")
async def delete_revenue(revenue_id: str, current_user: dict = Depends(get_current_user)):
    # Check if revenue exists
    existing_revenue = await db.revenues.find_one({"id": revenue_id}, {"_id": 0})
    if not existing_revenue:
        raise HTTPException(status_code=404, detail="Revenue entry not found")
    
    # Check if user can delete this revenue
    if current_user['role'] == 'manager' and existing_revenue['submitted_by'] != current_user['id']:
        raise HTTPException(status_code=403, detail="You can only delete your own revenue entries")
    
    result = await db.revenues.delete_one({"id": revenue_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Revenue entry not found")
    
    return {"message": "Revenue entry deleted successfully"}

# Dashboard endpoint
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user), start_date: Optional[str] = None, end_date: Optional[str] = None, group_by: Optional[str] = "restaurant"):
    query = {}
    
    if start_date:
        query['date'] = query.get('date', {})
        query['date']['$gte'] = start_date
    
    if end_date:
        query['date'] = query.get('date', {})
        query['date']['$lte'] = end_date
    
    # Get all revenues based on role
    if current_user['role'] == 'manager':
        user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
        assigned_restaurant_ids = user.get('assigned_restaurant_ids', [])
        
        if not assigned_restaurant_ids:
            return DashboardStats(
                total_revenue=0,
                total_entries=0,
                restaurant_breakdown=[],
                date_wise_revenue=[]
            )
        
        query['restaurant_id'] = {"$in": assigned_restaurant_ids}
    
    revenues = await db.revenues.find(query, {"_id": 0}).to_list(10000)
    
    # Calculate total revenue
    total_revenue = sum(r.get('total_amount', r.get('amount', 0)) for r in revenues)
    total_entries = len(revenues)
    
    # Restaurant breakdown
    restaurant_breakdown = {}
    for r in revenues:
        if r['restaurant_id'] not in restaurant_breakdown:
            restaurant_breakdown[r['restaurant_id']] = {
                'restaurant_id': r['restaurant_id'],
                'restaurant_name': r['restaurant_name'],
                'total': 0,
                'count': 0
            }
        restaurant_breakdown[r['restaurant_id']]['total'] += r.get('total_amount', r.get('amount', 0))
        restaurant_breakdown[r['restaurant_id']]['count'] += 1
    
    # Date-wise revenue (grouped by date, month, or day)
    date_wise = {}
    for r in revenues:
        date_key = r['date']
        
        # Group by month if requested
        if group_by == "month":
            date_parts = r['date'].split('-')
            if len(date_parts) >= 2:
                date_key = f"{date_parts[0]}-{date_parts[1]}"  # YYYY-MM
        
        if date_key not in date_wise:
            date_wise[date_key] = 0
        date_wise[date_key] += r.get('total_amount', r.get('amount', 0))
    
    date_wise_revenue = [{'date': k, 'total': v} for k, v in sorted(date_wise.items())]
    
    return DashboardStats(
        total_revenue=total_revenue,
        total_entries=total_entries,
        restaurant_breakdown=list(restaurant_breakdown.values()),
        date_wise_revenue=date_wise_revenue
    )

# Employee endpoints
@api_router.post("/employees", response_model=Employee)
async def create_employee(
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    position: str = Form(...),
    salary: Optional[float] = Form(None),
    join_date: str = Form(...),
    employment_status: str = Form(...),
    id_document_number: Optional[str] = Form(None),
    restaurant_ids: str = Form(...),
    photo: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    # Parse restaurant_ids from JSON string
    restaurant_ids_list = json.loads(restaurant_ids)

    # Check if user has access to the restaurants
    if current_user['role'] == 'manager':
        # Manager can only add employees to their assigned restaurants
        user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
        user_restaurant_ids = user.get('assigned_restaurant_ids', [])
        
        for rest_id in restaurant_ids_list:
            if rest_id not in user_restaurant_ids:
                raise HTTPException(status_code=403, detail="Cannot add employee to restaurant you don't manage")
    
    photo_url = None
    if photo:
        # Validate and save photo
        file_extension = validate_upload(photo, ALLOWED_IMAGE_EXTENSIONS)
        photo_filename = f"{uuid.uuid4()}.{file_extension}"
        photo_path = UPLOAD_DIR / "employee_photos" / photo_filename

        content = await photo.read()
        if len(content) > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB")
        async with aiofiles.open(photo_path, 'wb') as f:
            await f.write(content)

        photo_url = f"/api/uploads/employee_photos/{photo_filename}"

    employee = Employee(
        name=name,
        email=email,
        phone=phone,
        position=position,
        salary=salary,
        join_date=join_date,
        employment_status=employment_status,
        id_document_number=id_document_number,
        restaurant_ids=restaurant_ids_list,
        photo_url=photo_url,
        created_by=current_user['id']
    )
    
    await db.employees.insert_one(employee.model_dump())
    return employee

@api_router.get("/employees")
async def get_employees(current_user: dict = Depends(get_current_user)):
    if current_user['role'] == 'admin':
        # Admin can see all employees
        employees = await db.employees.find({}, {"_id": 0}).to_list(1000)
    else:
        # Manager can only see employees from their assigned restaurants
        user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
        user_restaurant_ids = user.get('assigned_restaurant_ids', [])
        
        employees = await db.employees.find(
            {"restaurant_ids": {"$in": user_restaurant_ids}},
            {"_id": 0}
        ).to_list(1000)
    
    # Add restaurant names to each employee
    for emp in employees:
        restaurants = await db.restaurants.find(
            {"id": {"$in": emp.get('restaurant_ids', [])}},
            {"_id": 0, "name": 1}
        ).to_list(100)
        emp['restaurant_names'] = [r['name'] for r in restaurants]
    
    return employees

@api_router.get("/employees/stats")
async def get_employee_stats(current_user: dict = Depends(get_current_user)):
    query = {}
    
    if current_user['role'] == 'manager':
        user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
        user_restaurant_ids = user.get('assigned_restaurant_ids', [])
        
        if not user_restaurant_ids:
            return {
                "total_employees": 0,
                "active_employees": 0,
                "restaurant_breakdown": [],
                "position_breakdown": []
            }
        
        query['restaurant_ids'] = {"$in": user_restaurant_ids}
    
    employees = await db.employees.find(query, {"_id": 0}).to_list(10000)
    
    total_employees = len(employees)
    active_employees = len([e for e in employees if e.get('employment_status') == 'active'])
    
    # Restaurant breakdown
    restaurant_counts = {}
    for emp in employees:
        for rest_id in emp.get('restaurant_ids', []):
            restaurant_counts[rest_id] = restaurant_counts.get(rest_id, 0) + 1
    
    # Get restaurant names
    restaurant_breakdown = []
    for rest_id, count in restaurant_counts.items():
        restaurant = await db.restaurants.find_one({"id": rest_id}, {"_id": 0, "name": 1})
        if restaurant:
            restaurant_breakdown.append({
                "restaurant_id": rest_id,
                "restaurant_name": restaurant['name'],
                "employee_count": count
            })
    
    # Position breakdown
    position_counts = {}
    for emp in employees:
        position = emp.get('position', 'Unknown')
        position_counts[position] = position_counts.get(position, 0) + 1
    
    position_breakdown = [
        {"position": position, "count": count}
        for position, count in position_counts.items()
    ]
    
    return {
        "total_employees": total_employees,
        "active_employees": active_employees,
        "restaurant_breakdown": restaurant_breakdown,
        "position_breakdown": position_breakdown
    }

@api_router.get("/employees/{employee_id}")
async def get_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check access
    if current_user['role'] == 'manager':
        user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
        user_restaurant_ids = user.get('assigned_restaurant_ids', [])
        
        # Check if any of employee's restaurants belong to this manager
        has_access = any(rest_id in user_restaurant_ids for rest_id in employee.get('restaurant_ids', []))
        if not has_access:
            raise HTTPException(status_code=403, detail="Cannot access this employee")
    
    return employee

@api_router.put("/employees/{employee_id}")
async def update_employee(
    employee_id: str,
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    position: str = Form(...),
    salary: Optional[float] = Form(None),
    join_date: str = Form(...),
    employment_status: str = Form(...),
    id_document_number: Optional[str] = Form(None),
    restaurant_ids: str = Form(...),
    photo: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    restaurant_ids_list = json.loads(restaurant_ids)

    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check access
    if current_user['role'] == 'manager':
        user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
        user_restaurant_ids = user.get('assigned_restaurant_ids', [])
        
        has_access = any(rest_id in user_restaurant_ids for rest_id in employee.get('restaurant_ids', []))
        if not has_access:
            raise HTTPException(status_code=403, detail="Cannot update this employee")
    
    photo_url = employee.get('photo_url')
    if photo:
        # Validate new photo
        file_extension = validate_upload(photo, ALLOWED_IMAGE_EXTENSIONS)

        # Delete old photo if exists
        if photo_url:
            old_photo_path = UPLOAD_DIR / photo_url.lstrip("/api/uploads/")
            if old_photo_path.exists():
                old_photo_path.unlink()

        # Save new photo
        photo_filename = f"{uuid.uuid4()}.{file_extension}"
        photo_path = UPLOAD_DIR / "employee_photos" / photo_filename

        content = await photo.read()
        if len(content) > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB")
        async with aiofiles.open(photo_path, 'wb') as f:
            await f.write(content)

        photo_url = f"/api/uploads/employee_photos/{photo_filename}"
    
    update_data = {
        "name": name,
        "email": email,
        "phone": phone,
        "position": position,
        "salary": salary,
        "join_date": join_date,
        "employment_status": employment_status,
        "id_document_number": id_document_number,
        "restaurant_ids": restaurant_ids_list,
        "photo_url": photo_url,
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.employees.update_one({"id": employee_id}, {"$set": update_data})
    
    updated_employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    return updated_employee

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check access
    if current_user['role'] == 'manager':
        user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
        user_restaurant_ids = user.get('assigned_restaurant_ids', [])
        
        has_access = any(rest_id in user_restaurant_ids for rest_id in employee.get('restaurant_ids', []))
        if not has_access:
            raise HTTPException(status_code=403, detail="Cannot delete this employee")
    
    # Delete photo if exists
    if employee.get('photo_url'):
        photo_path = UPLOAD_DIR / employee['photo_url'].lstrip("/api/uploads/")
        if photo_path.exists():
            photo_path.unlink()
    
    await db.employees.delete_one({"id": employee_id})
    return {"message": "Employee deleted successfully"}

# Restaurant Document endpoints
@api_router.post("/restaurant-documents", response_model=RestaurantDocument)
async def upload_restaurant_document(
    restaurant_id: str = Form(...),
    document_type: str = Form(...),
    document_name: str = Form(...),
    expiry_date: Optional[str] = Form(None),
    notes: Optional[str] = Form(""),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Check if restaurant exists
    restaurant = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Check access
    if current_user['role'] == 'manager':
        user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
        user_restaurant_ids = user.get('assigned_restaurant_ids', [])
        if restaurant_id not in user_restaurant_ids:
            raise HTTPException(status_code=403, detail="Cannot upload document to this restaurant")
    
    # Validate and save document
    file_extension = validate_upload(file, ALLOWED_DOCUMENT_EXTENSIONS)
    doc_filename = f"{uuid.uuid4()}.{file_extension}"
    doc_path = UPLOAD_DIR / "restaurant_documents" / doc_filename

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB")
    async with aiofiles.open(doc_path, 'wb') as f:
        await f.write(content)

    file_url = f"/api/uploads/restaurant_documents/{doc_filename}"
    
    document = RestaurantDocument(
        restaurant_id=restaurant_id,
        restaurant_name=restaurant['name'],
        document_type=document_type,
        document_name=document_name,
        file_url=file_url,
        file_type=file_extension,
        expiry_date=expiry_date,
        notes=notes,
        uploaded_by=current_user['id']
    )
    
    await db.restaurant_documents.insert_one(document.model_dump())
    return document

@api_router.get("/restaurant-documents")
async def get_restaurant_documents(
    restaurant_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if current_user['role'] == 'manager':
        # Manager can only see documents from their assigned restaurants
        user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
        user_restaurant_ids = user.get('assigned_restaurant_ids', [])
        query["restaurant_id"] = {"$in": user_restaurant_ids}
    
    if restaurant_id:
        if current_user['role'] == 'manager':
            # Verify manager has access to this restaurant
            user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
            user_restaurant_ids = user.get('assigned_restaurant_ids', [])
            if restaurant_id not in user_restaurant_ids:
                raise HTTPException(status_code=403, detail="Cannot access documents for this restaurant")
        query["restaurant_id"] = restaurant_id
    
    documents = await db.restaurant_documents.find(query, {"_id": 0}).to_list(1000)
    return documents

@api_router.get("/restaurant-documents/{document_id}")
async def get_restaurant_document(document_id: str, current_user: dict = Depends(get_current_user)):
    document = await db.restaurant_documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check access
    if current_user['role'] == 'manager':
        user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
        user_restaurant_ids = user.get('assigned_restaurant_ids', [])
        if document['restaurant_id'] not in user_restaurant_ids:
            raise HTTPException(status_code=403, detail="Cannot access this document")
    
    return document

class RestaurantDocumentUpdate(BaseModel):
    document_type: str
    document_name: str
    expiry_date: Optional[str] = None
    notes: Optional[str] = ""
    custom_document_type: Optional[str] = None

@api_router.put("/restaurant-documents/{document_id}")
async def update_restaurant_document(
    document_id: str,
    update_data: RestaurantDocumentUpdate,
    current_user: dict = Depends(get_current_user)
):
    document = await db.restaurant_documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check access
    if current_user['role'] == 'manager':
        user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
        user_restaurant_ids = user.get('assigned_restaurant_ids', [])
        if document['restaurant_id'] not in user_restaurant_ids:
            raise HTTPException(status_code=403, detail="Cannot edit this document")
    
    # Prepare update dict
    update_dict = {
        "document_type": update_data.document_type,
        "document_name": update_data.document_name,
        "notes": update_data.notes,
    }
    
    if update_data.expiry_date:
        update_dict["expiry_date"] = update_data.expiry_date
    else:
        update_dict["expiry_date"] = None
    
    if update_data.document_type == "other" and update_data.custom_document_type:
        update_dict["custom_document_type"] = update_data.custom_document_type
    
    await db.restaurant_documents.update_one(
        {"id": document_id},
        {"$set": update_dict}
    )
    
    updated_document = await db.restaurant_documents.find_one({"id": document_id}, {"_id": 0})
    if isinstance(updated_document.get('uploaded_at'), str):
        updated_document['uploaded_at'] = datetime.fromisoformat(updated_document['uploaded_at'])
    
    return RestaurantDocument(**updated_document)

@api_router.delete("/restaurant-documents/{document_id}")
async def delete_restaurant_document(document_id: str, current_user: dict = Depends(get_current_user)):
    document = await db.restaurant_documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check access
    if current_user['role'] == 'manager':
        user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
        user_restaurant_ids = user.get('assigned_restaurant_ids', [])
        if document['restaurant_id'] not in user_restaurant_ids:
            raise HTTPException(status_code=403, detail="Cannot delete this document")
    
    # Delete file
    file_path = UPLOAD_DIR / document['file_url'].lstrip("/api/uploads/")
    if file_path.exists():
        file_path.unlink()
    
    await db.restaurant_documents.delete_one({"id": document_id})
    return {"message": "Document deleted successfully"}

# Include the router in the main app
app.include_router(api_router)

# CORS: require explicit origins when using credentials
_cors_origins_raw = os.environ.get('CORS_ORIGINS', '')
if not _cors_origins_raw or _cors_origins_raw.strip() == '*':
    logger.warning("CORS_ORIGINS not set or set to '*'. Set CORS_ORIGINS to your frontend URL (e.g. 'http://localhost:3000'). Defaulting to localhost.")
    _cors_origins = ["http://localhost:3000"]
else:
    _cors_origins = [origin.strip() for origin in _cors_origins_raw.split(',') if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Serve React frontend build (for single-service deployment)
FRONTEND_BUILD = Path(__file__).parent.parent / "frontend" / "build"
if FRONTEND_BUILD.exists():
    from starlette.responses import FileResponse

    # Serve static assets (js, css, images)
    app.mount("/static", StaticFiles(directory=str(FRONTEND_BUILD / "static")), name="frontend-static")

    # Serve other root-level build files (manifest, icons, etc.)
    @app.get("/manifest.json")
    @app.get("/favicon.ico")
    @app.get("/logo192.png")
    @app.get("/logo512.png")
    @app.get("/robots.txt")
    async def serve_root_files():
        # Extract the path from the request
        pass

    # Catch-all: serve index.html for any non-API route (SPA routing)
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Don't serve frontend for API routes or upload routes
        if full_path.startswith("api/") or full_path.startswith("uploads/"):
            raise HTTPException(status_code=404)
        file_path = FRONTEND_BUILD / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_BUILD / "index.html"))

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()