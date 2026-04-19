from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import logging
import jwt
import bcrypt
import qrcode
import openpyxl
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging early so any code (including startup handlers) can use it
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT config
JWT_SECRET = os.environ.get('JWT_SECRET', 'simply-bhartiya-secret-key-change-in-prod')
JWT_ALGO = "HS256"
JWT_EXPIRY_HOURS = 24

# Seed prefix mapping
SEED_PREFIX = {
    "Black Mustard": "BM",
    "White Sesame": "WS",
    "Groundnut": "GN",
    "Coconut": "CO",
    "Almond": "AL",
}

app = FastAPI(title="Simply Bhartiya Inventory & Traceability")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)


# ============ MODELS ============
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    role: str
    username: str


class ProcurementCreate(BaseModel):
    vendor_name: str
    area_pin: str
    seed_type: str  # Black Mustard | White Sesame | Groundnut | Coconut | Almond
    price_per_kg: float
    number_of_bags: int
    size_per_bag: float  # kg per bag


class Stage2Update(BaseModel):
    machine_number: str
    worker_name: str


class Stage3Update(BaseModel):
    worker_name: str
    packaging_capacity: str  # 250ml, 500ml, 1L, 5L


# ============ HELPERS ============
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(username: str, role: str) -> str:
    payload = {
        "sub": username,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    if not creds:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        return {"username": payload["sub"], "role": payload["role"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def gen_batch_id(seed_type: str, pin: str) -> str:
    prefix = SEED_PREFIX.get(seed_type, "XX")
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"{prefix}{ts}-{pin}"


def filter_batch_for_role(batch: dict, role: str) -> dict:
    """Staff sees only Seed Type, PIN, Batch Number + operational fields. No prices/vendors."""
    if role == "admin":
        return batch
    # Strip sensitive fields for staff
    restricted = batch.copy()
    for k in ["vendor_name", "price_per_kg", "total_amount"]:
        restricted.pop(k, None)
    return restricted


# ============ AUTH ============
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    user = await db.users.find_one({"username": req.username}, {"_id": 0})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["username"], user["role"])
    return LoginResponse(token=token, role=user["role"], username=user["username"])


@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return user


# ============ BATCHES ============
@api_router.post("/batches")
async def create_batch(data: ProcurementCreate, user=Depends(require_admin)):
    if data.seed_type not in SEED_PREFIX:
        raise HTTPException(status_code=400, detail="Invalid seed type")

    total_quantity_kg = data.number_of_bags * data.size_per_bag
    total_amount = total_quantity_kg * data.price_per_kg
    batch_id = gen_batch_id(data.seed_type, data.area_pin)
    now_iso = datetime.now(timezone.utc).isoformat()

    doc = {
        "batch_id": batch_id,
        "vendor_name": data.vendor_name,
        "area_pin": data.area_pin,
        "seed_type": data.seed_type,
        "price_per_kg": data.price_per_kg,
        "number_of_bags": data.number_of_bags,
        "size_per_bag": data.size_per_bag,
        "total_quantity_kg": total_quantity_kg,
        "total_amount": total_amount,
        "procurement_date": now_iso,
        "stage": 1,
        "stage2": None,
        "stage3": None,
        "created_by": user["username"],
        "created_at": now_iso,
    }
    await db.batches.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/batches")
async def list_batches(
    user=Depends(get_current_user),
    seed_type: Optional[str] = None,
    stage: Optional[int] = None,
    search: Optional[str] = None,
):
    query = {}
    if seed_type:
        query["seed_type"] = seed_type
    if stage is not None:
        query["stage"] = stage
    if search:
        query["batch_id"] = {"$regex": search, "$options": "i"}

    cursor = db.batches.find(query, {"_id": 0}).sort("created_at", -1).limit(500)
    items = await cursor.to_list(500)
    return [filter_batch_for_role(b, user["role"]) for b in items]


@api_router.get("/batches/{batch_id}")
async def get_batch(batch_id: str, user=Depends(get_current_user)):
    batch = await db.batches.find_one({"batch_id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return filter_batch_for_role(batch, user["role"])


@api_router.patch("/batches/{batch_id}/stage2")
async def update_stage2(batch_id: str, data: Stage2Update, user=Depends(get_current_user)):
    batch = await db.batches.find_one({"batch_id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch.get("stage", 1) >= 2:
        raise HTTPException(status_code=400, detail="Stage 2 already completed")

    now_iso = datetime.now(timezone.utc).isoformat()
    stage2 = {
        "machine_number": data.machine_number,
        "worker_name": data.worker_name,
        "extraction_date": now_iso,
        "completed_by": user["username"],
    }
    await db.batches.update_one(
        {"batch_id": batch_id},
        {"$set": {"stage2": stage2, "stage": 2}},
    )
    updated = await db.batches.find_one({"batch_id": batch_id}, {"_id": 0})
    return filter_batch_for_role(updated, user["role"])


@api_router.patch("/batches/{batch_id}/stage3")
async def update_stage3(batch_id: str, data: Stage3Update, user=Depends(get_current_user)):
    batch = await db.batches.find_one({"batch_id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch.get("stage", 1) < 2:
        raise HTTPException(status_code=400, detail="Complete Stage 2 first")
    if batch.get("stage", 1) >= 3:
        raise HTTPException(status_code=400, detail="Stage 3 already completed")

    now_iso = datetime.now(timezone.utc).isoformat()
    stage3 = {
        "worker_name": data.worker_name,
        "packaging_capacity": data.packaging_capacity,
        "packaging_date": now_iso,
        "completed_by": user["username"],
    }
    await db.batches.update_one(
        {"batch_id": batch_id},
        {"$set": {"stage3": stage3, "stage": 3}},
    )
    updated = await db.batches.find_one({"batch_id": batch_id}, {"_id": 0})
    return filter_batch_for_role(updated, user["role"])


@api_router.get("/batches/{batch_id}/qr/{stage}")
async def get_qr_png(batch_id: str, stage: int, user=Depends(get_current_user)):
    batch = await db.batches.find_one({"batch_id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if stage not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="Invalid stage")

    # QR payload: internal scanning uses batch_id + stage marker; public uses URL
    if stage == 3:
        public_url = os.environ.get("PUBLIC_TRACE_URL", "") or ""
        # If not configured, frontend URL is typically derived from the origin.
        # We pass a relative trace path as fallback that the client must prepend origin.
        payload = public_url.rstrip("/") + f"/trace/{batch_id}" if public_url else f"/trace/{batch_id}"
    else:
        payload = f"SB|{batch_id}|S{stage}"

    img = qrcode.make(payload)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Response(content=buf.getvalue(), media_type="image/png")


# ============ PUBLIC TRACE ============
@api_router.get("/trace/{batch_id}")
async def public_trace(batch_id: str):
    batch = await db.batches.find_one({"batch_id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    public_view = {
        "batch_id": batch["batch_id"],
        "seed_type": batch["seed_type"],
        "origin_pin": batch["area_pin"],
        "procurement_date": batch.get("procurement_date"),
        "extraction_date": batch.get("stage2", {}).get("extraction_date") if batch.get("stage2") else None,
        "packaging_date": batch.get("stage3", {}).get("packaging_date") if batch.get("stage3") else None,
        "packaging_capacity": batch.get("stage3", {}).get("packaging_capacity") if batch.get("stage3") else None,
        "current_stage": batch.get("stage", 1),
        "completed": batch.get("stage", 1) >= 3,
    }
    return public_view


# ============ ANALYTICS ============
@api_router.get("/analytics")
async def analytics(period: Literal["week", "month", "year"] = "month", user=Depends(require_admin)):
    now = datetime.now(timezone.utc)
    if period == "week":
        since = now - timedelta(days=7)
    elif period == "month":
        since = now - timedelta(days=30)
    else:
        since = now - timedelta(days=365)

    cursor = db.batches.find({"created_at": {"$gte": since.isoformat()}}, {"_id": 0})
    batches = await cursor.to_list(5000)

    total_batches = len(batches)
    total_quantity = sum(b.get("total_quantity_kg", 0) for b in batches)
    total_revenue = sum(b.get("total_amount", 0) for b in batches)
    by_seed = {}
    by_stage = {1: 0, 2: 0, 3: 0}
    timeline = {}

    for b in batches:
        st = b.get("seed_type", "Unknown")
        by_seed[st] = by_seed.get(st, 0) + 1
        by_stage[b.get("stage", 1)] = by_stage.get(b.get("stage", 1), 0) + 1
        date_key = (b.get("created_at") or "")[:10]
        if date_key:
            timeline[date_key] = timeline.get(date_key, 0) + 1

    timeline_sorted = sorted([{"date": k, "count": v} for k, v in timeline.items()], key=lambda x: x["date"])

    return {
        "period": period,
        "total_batches": total_batches,
        "total_quantity_kg": total_quantity,
        "total_revenue": total_revenue,
        "by_seed_type": by_seed,
        "by_stage": by_stage,
        "timeline": timeline_sorted,
    }


# ============ EXCEL EXPORT ============
@api_router.get("/export/excel")
async def export_excel(user=Depends(require_admin)):
    cursor = db.batches.find({}, {"_id": 0}).sort("created_at", -1)
    batches = await cursor.to_list(10000)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Batches"
    headers = [
        "Batch ID", "Seed Type", "Vendor", "Area PIN",
        "Price/KG", "Bags", "Size/Bag(kg)", "Total Qty(kg)", "Total Amount",
        "Procurement Date", "Stage",
        "Machine #", "Extraction Worker", "Extraction Date",
        "Packer", "Packaging Capacity", "Packaging Date",
    ]
    ws.append(headers)
    for b in batches:
        s2 = b.get("stage2") or {}
        s3 = b.get("stage3") or {}
        ws.append([
            b.get("batch_id"),
            b.get("seed_type"),
            b.get("vendor_name"),
            b.get("area_pin"),
            b.get("price_per_kg"),
            b.get("number_of_bags"),
            b.get("size_per_bag"),
            b.get("total_quantity_kg"),
            b.get("total_amount"),
            b.get("procurement_date"),
            b.get("stage"),
            s2.get("machine_number"),
            s2.get("worker_name"),
            s2.get("extraction_date"),
            s3.get("worker_name"),
            s3.get("packaging_capacity"),
            s3.get("packaging_date"),
        ])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    fname = f"simply_bhartiya_batches_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


# ============ SEED / STARTUP ============
@app.on_event("startup")
async def seed_users():
    # Idempotent: only create if missing
    existing = await db.users.count_documents({})
    if existing == 0:
        await db.users.insert_many([
            {
                "username": "Admin",
                "password_hash": hash_password("Administrator@321"),
                "role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            {
                "username": "Staff",
                "password_hash": hash_password("SimplyBhartiya@321"),
                "role": "staff",
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
        ])
        logger.info("Seeded Admin and Staff users")


@api_router.get("/")
async def root():
    return {"message": "Simply Bhartiya API", "status": "ok"}


@api_router.get("/seed-config")
async def seed_config():
    return {"seed_types": list(SEED_PREFIX.keys()), "prefixes": SEED_PREFIX}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
