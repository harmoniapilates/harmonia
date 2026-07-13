from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# JWT config
JWT_SECRET = os.environ.get("JWT_SECRET", "wellness-app-secret-change-in-production-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 30
ADMIN_CODE = os.environ.get("ADMIN_CODE", "PROPRIETARIO2026")

app = FastAPI(title="Wellness Booking API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()


# ============ Models ============
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    admin_code: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    user: UserPublic


class ClassCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    category: str  # pilates | yoga | massage
    kind: str  # group | private
    starts_at: str  # ISO datetime string
    duration_minutes: int = 60
    capacity: int = 10
    instructor: Optional[str] = ""
    image: Optional[str] = ""


class ClassUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    kind: Optional[str] = None
    starts_at: Optional[str] = None
    duration_minutes: Optional[int] = None
    capacity: Optional[int] = None
    instructor: Optional[str] = None
    image: Optional[str] = None


class ClassPublic(BaseModel):
    id: str
    title: str
    description: str
    category: str
    kind: str
    starts_at: str
    duration_minutes: int
    capacity: int
    instructor: str
    image: str
    booked_count: int = 0


class BookingCreate(BaseModel):
    class_id: str


class BookingPublic(BaseModel):
    id: str
    class_id: str
    user_id: str
    user_name: str
    user_email: str
    status: str  # pending | confirmed | cancelled | attended
    created_at: str
    class_snapshot: Optional[dict] = None


class AppSettings(BaseModel):
    business_name: str = "Harmonia"
    allow_multiple_bookings: bool = True
    cancellation_window_hours: int = 2
    private_requires_confirmation: bool = True


class ForfaitCreate(BaseModel):
    user_id: str
    name: str
    total_classes: int
    category: Optional[str] = None  # yoga | pilates | massage | None (any)
    expires_at: Optional[str] = None


class ForfaitUpdate(BaseModel):
    name: Optional[str] = None
    total_classes: Optional[int] = None
    remaining_classes: Optional[int] = None
    category: Optional[str] = None
    expires_at: Optional[str] = None
    active: Optional[bool] = None


class ForfaitPublic(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    name: str
    total_classes: int
    remaining_classes: int
    category: Optional[str] = None
    expires_at: Optional[str] = None
    active: bool
    created_at: str


# ============ Helpers ============
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Jeton invalide")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur introuvable")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Jeton expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Jeton invalide")


async def require_owner(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Accès réservé au propriétaire")
    return user


async def get_settings_doc() -> dict:
    doc = await db.settings.find_one({"id": "global"}, {"_id": 0})
    if not doc:
        defaults = AppSettings().dict()
        defaults["id"] = "global"
        await db.settings.insert_one(defaults.copy())
        defaults.pop("_id", None)
        return defaults
    return doc


# ============ Auth Routes ============
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(payload: UserRegister):
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà enregistrée")

    role = "client"
    if payload.admin_code:
        if payload.admin_code == ADMIN_CODE:
            role = "owner"
        else:
            raise HTTPException(status_code=403, detail="Code propriétaire invalide")

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": payload.email.lower(),
        "name": payload.name,
        "hashed_password": hash_password(payload.password),
        "role": role,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id, role)
    return TokenResponse(
        access_token=token,
        user=UserPublic(id=user_id, email=user_doc["email"], name=payload.name, role=role),
    )


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    token = create_token(user["id"], user["role"])
    return TokenResponse(
        access_token=token,
        user=UserPublic(id=user["id"], email=user["email"], name=user["name"], role=user["role"]),
    )


@api_router.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return UserPublic(id=user["id"], email=user["email"], name=user["name"], role=user["role"])


# ============ Settings Routes ============
@api_router.get("/settings", response_model=AppSettings)
async def get_settings(user: dict = Depends(get_current_user)):
    doc = await get_settings_doc()
    doc.pop("id", None)
    return AppSettings(**doc)


@api_router.put("/settings", response_model=AppSettings)
async def update_settings(payload: AppSettings, user: dict = Depends(require_owner)):
    data = payload.dict()
    data["id"] = "global"
    await db.settings.update_one({"id": "global"}, {"$set": data}, upsert=True)
    return payload


# ============ Class Routes ============
async def build_class_public(cls: dict) -> ClassPublic:
    booked = await db.bookings.count_documents(
        {"class_id": cls["id"], "status": {"$in": ["confirmed", "pending", "attended"]}}
    )
    return ClassPublic(
        id=cls["id"],
        title=cls["title"],
        description=cls.get("description", ""),
        category=cls["category"],
        kind=cls["kind"],
        starts_at=cls["starts_at"],
        duration_minutes=cls.get("duration_minutes", 60),
        capacity=cls.get("capacity", 10),
        instructor=cls.get("instructor", ""),
        image=cls.get("image", ""),
        booked_count=booked,
    )


@api_router.get("/classes", response_model=List[ClassPublic])
async def list_classes(user: dict = Depends(get_current_user)):
    docs = await db.classes.find({}, {"_id": 0}).sort("starts_at", 1).to_list(500)
    return [await build_class_public(d) for d in docs]


@api_router.post("/classes", response_model=ClassPublic)
async def create_class(payload: ClassCreate, user: dict = Depends(require_owner)):
    class_id = str(uuid.uuid4())
    doc = payload.dict()
    doc["id"] = class_id
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.classes.insert_one(doc.copy())
    return await build_class_public(doc)


class ClassBulkCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    category: str
    kind: str
    duration_minutes: int = 60
    capacity: int = 10
    instructor: Optional[str] = ""
    image: Optional[str] = ""
    starts_at_list: List[str]


@api_router.post("/classes/bulk", response_model=List[ClassPublic])
async def create_classes_bulk(payload: ClassBulkCreate, user: dict = Depends(require_owner)):
    if not payload.starts_at_list:
        raise HTTPException(status_code=400, detail="Aucune date fournie")
    if len(payload.starts_at_list) > 200:
        raise HTTPException(status_code=400, detail="Trop de dates (max 200)")

    now_iso = datetime.now(timezone.utc).isoformat()
    docs = []
    for starts_at in payload.starts_at_list:
        docs.append({
            "id": str(uuid.uuid4()),
            "title": payload.title,
            "description": payload.description or "",
            "category": payload.category,
            "kind": payload.kind,
            "starts_at": starts_at,
            "duration_minutes": payload.duration_minutes,
            "capacity": payload.capacity,
            "instructor": payload.instructor or "",
            "image": payload.image or "",
            "created_at": now_iso,
        })
    await db.classes.insert_many([d.copy() for d in docs])
    results = []
    for d in docs:
        d.pop("_id", None)
        results.append(await build_class_public(d))
    return results


@api_router.put("/classes/{class_id}", response_model=ClassPublic)
async def update_class(class_id: str, payload: ClassUpdate, user: dict = Depends(require_owner)):
    existing = await db.classes.find_one({"id": class_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Cours introuvable")
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if updates:
        await db.classes.update_one({"id": class_id}, {"$set": updates})
    fresh = await db.classes.find_one({"id": class_id}, {"_id": 0})
    return await build_class_public(fresh)


@api_router.delete("/classes/{class_id}")
async def delete_class(class_id: str, user: dict = Depends(require_owner)):
    result = await db.classes.delete_one({"id": class_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cours introuvable")
    await db.bookings.delete_many({"class_id": class_id})
    return {"ok": True}


@api_router.get("/classes/{class_id}/bookings", response_model=List[BookingPublic])
async def class_bookings(class_id: str, user: dict = Depends(require_owner)):
    docs = await db.bookings.find({"class_id": class_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return [BookingPublic(**d) for d in docs]


# ============ Booking Routes ============
@api_router.post("/bookings", response_model=BookingPublic)
async def create_booking(payload: BookingCreate, user: dict = Depends(get_current_user)):
    cls = await db.classes.find_one({"id": payload.class_id}, {"_id": 0})
    if not cls:
        raise HTTPException(status_code=404, detail="Cours introuvable")

    settings = await get_settings_doc()

    # Prevent duplicate active booking by same user for same class
    existing_same = await db.bookings.find_one(
        {
            "class_id": payload.class_id,
            "user_id": user["id"],
            "status": {"$in": ["confirmed", "pending", "attended"]},
        }
    )
    if existing_same:
        raise HTTPException(status_code=400, detail="Vous avez déjà réservé ce cours")

    # Check multiple bookings rule
    if not settings.get("allow_multiple_bookings", True):
        overlap = await db.bookings.find_one(
            {"user_id": user["id"], "status": {"$in": ["confirmed", "pending"]}}
        )
        if overlap:
            raise HTTPException(
                status_code=400,
                detail="Réservations multiples non autorisées. Annulez d'abord une réservation existante.",
            )

    # Check capacity
    booked = await db.bookings.count_documents(
        {"class_id": payload.class_id, "status": {"$in": ["confirmed", "pending", "attended"]}}
    )
    if booked >= cls["capacity"]:
        raise HTTPException(status_code=400, detail="Cours complet")

    # Private classes may require confirmation
    is_private = cls["kind"] == "private"
    booking_status = "confirmed"
    if is_private and settings.get("private_requires_confirmation", True):
        booking_status = "pending"

    booking_id = str(uuid.uuid4())
    booking_doc = {
        "id": booking_id,
        "class_id": payload.class_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "user_email": user["email"],
        "status": booking_status,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "class_snapshot": {
            "title": cls["title"],
            "category": cls["category"],
            "kind": cls["kind"],
            "starts_at": cls["starts_at"],
            "duration_minutes": cls.get("duration_minutes", 60),
            "instructor": cls.get("instructor", ""),
        },
    }
    await db.bookings.insert_one(booking_doc.copy())
    booking_doc.pop("_id", None)
    return BookingPublic(**booking_doc)


@api_router.get("/bookings/mine", response_model=List[BookingPublic])
async def my_bookings(user: dict = Depends(get_current_user)):
    docs = await db.bookings.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [BookingPublic(**d) for d in docs]


@api_router.get("/bookings", response_model=List[BookingPublic])
async def all_bookings(user: dict = Depends(require_owner)):
    docs = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [BookingPublic(**d) for d in docs]


@api_router.delete("/bookings/{booking_id}")
async def cancel_booking(booking_id: str, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Réservation introuvable")

    is_owner = user["role"] == "owner"
    if not is_owner and booking["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas annuler cette réservation")

    # Check cancellation window (client only)
    if not is_owner:
        settings = await get_settings_doc()
        window = int(settings.get("cancellation_window_hours", 2))
        cls = await db.classes.find_one({"id": booking["class_id"]}, {"_id": 0})
        if cls:
            try:
                start = datetime.fromisoformat(cls["starts_at"].replace("Z", "+00:00"))
                if start.tzinfo is None:
                    start = start.replace(tzinfo=timezone.utc)
                if start - datetime.now(timezone.utc) < timedelta(hours=window):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Impossible d'annuler : moins de {window}h avant le début",
                    )
            except (ValueError, KeyError):
                pass

    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "cancelled"}})
    return {"ok": True}


@api_router.post("/bookings/{booking_id}/attend")
async def mark_attendance(booking_id: str, user: dict = Depends(require_owner)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Réservation introuvable")

    # If already attended, do nothing (idempotent)
    if booking.get("status") == "attended":
        return {"ok": True, "forfait_consumed": booking.get("forfait_consumed")}

    # Try to consume a matching forfait (not expired)
    category = (booking.get("class_snapshot") or {}).get("category")
    now_iso = datetime.now(timezone.utc).isoformat()
    match_criteria = {
        "user_id": booking["user_id"],
        "active": True,
        "remaining_classes": {"$gt": 0},
        "$and": [
            {"$or": [{"category": None}, {"category": category}]},
            {"$or": [{"expires_at": None}, {"expires_at": {"$gt": now_iso}}]},
        ],
    }
    matching = await db.forfaits.find_one(match_criteria, {"_id": 0}, sort=[("created_at", 1)])

    forfait_info = None
    if matching:
        await db.forfaits.update_one(
            {"id": matching["id"]},
            {"$inc": {"remaining_classes": -1}},
        )
        forfait_info = {
            "id": matching["id"],
            "name": matching["name"],
            "remaining_after": matching["remaining_classes"] - 1,
        }

    update = {"status": "attended"}
    if forfait_info:
        update["forfait_consumed"] = forfait_info
    await db.bookings.update_one({"id": booking_id}, {"$set": update})
    return {"ok": True, "forfait_consumed": forfait_info}


@api_router.post("/bookings/{booking_id}/confirm")
async def confirm_booking(booking_id: str, user: dict = Depends(require_owner)):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Réservation introuvable")
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "confirmed"}})
    return {"ok": True}


@api_router.get("/")
async def root():
    return {"message": "Wellness Booking API", "status": "ok"}


# ============ Forfait Routes ============
@api_router.get("/users/clients")
async def list_clients(user: dict = Depends(require_owner)):
    docs = await db.users.find(
        {"role": "client"},
        {"_id": 0, "hashed_password": 0},
    ).sort("name", 1).to_list(1000)
    return [{"id": d["id"], "name": d["name"], "email": d["email"]} for d in docs]


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None


@api_router.put("/users/{user_id}")
async def owner_update_user(user_id: str, payload: UserUpdate, user: dict = Depends(require_owner)):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if target.get("role") == "owner" and target["id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Impossible de modifier un autre propriétaire")

    updates: dict = {}
    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Le nom ne peut pas être vide")
        updates["name"] = name
    if payload.email is not None:
        new_email = payload.email.lower()
        if new_email != target["email"]:
            existing = await db.users.find_one({"email": new_email, "id": {"$ne": user_id}})
            if existing:
                raise HTTPException(status_code=400, detail="Email déjà utilisée")
            updates["email"] = new_email
    if payload.password is not None:
        if len(payload.password) < 6:
            raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
        updates["hashed_password"] = hash_password(payload.password)

    if updates:
        await db.users.update_one({"id": user_id}, {"$set": updates})
        # Keep booking snapshots in sync (name/email displayed to owner)
        if "name" in updates or "email" in updates:
            snapshot_updates = {}
            if "name" in updates:
                snapshot_updates["user_name"] = updates["name"]
            if "email" in updates:
                snapshot_updates["user_email"] = updates["email"]
            await db.bookings.update_many({"user_id": user_id}, {"$set": snapshot_updates})
            await db.forfaits.update_many({"user_id": user_id}, {"$set": snapshot_updates})

    fresh = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    return {
        "id": fresh["id"],
        "name": fresh["name"],
        "email": fresh["email"],
        "role": fresh["role"],
    }


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@api_router.put("/auth/change-password")
async def change_own_password(payload: PasswordChange, user: dict = Depends(get_current_user)):
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
    full = await db.users.find_one({"id": user["id"]})
    if not full or not verify_password(payload.current_password, full["hashed_password"]):
        raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect")
    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"hashed_password": hash_password(payload.new_password)}}
    )
    return {"ok": True}


@api_router.get("/forfaits", response_model=List[ForfaitPublic])
async def list_forfaits(user: dict = Depends(require_owner)):
    docs = await db.forfaits.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [ForfaitPublic(**d) for d in docs]


@api_router.get("/forfaits/mine", response_model=List[ForfaitPublic])
async def my_forfaits(user: dict = Depends(get_current_user)):
    now_iso = datetime.now(timezone.utc).isoformat()
    docs = await db.forfaits.find(
        {
            "user_id": user["id"],
            "active": True,
            "$or": [{"expires_at": None}, {"expires_at": {"$gt": now_iso}}],
        },
        {"_id": 0},
    ).sort("created_at", -1).to_list(200)
    return [ForfaitPublic(**d) for d in docs]


@api_router.post("/forfaits", response_model=ForfaitPublic)
async def create_forfait(payload: ForfaitCreate, user: dict = Depends(require_owner)):
    client = await db.users.find_one({"id": payload.user_id, "role": "client"}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client introuvable")
    if payload.total_classes < 1:
        raise HTTPException(status_code=400, detail="Le nombre de séances doit être ≥ 1")
    forfait_id = str(uuid.uuid4())
    doc = {
        "id": forfait_id,
        "user_id": payload.user_id,
        "user_name": client["name"],
        "user_email": client["email"],
        "name": payload.name,
        "total_classes": payload.total_classes,
        "remaining_classes": payload.total_classes,
        "category": payload.category or None,
        "expires_at": payload.expires_at or None,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.forfaits.insert_one(doc.copy())
    return ForfaitPublic(**doc)


@api_router.put("/forfaits/{forfait_id}", response_model=ForfaitPublic)
async def update_forfait(forfait_id: str, payload: ForfaitUpdate, user: dict = Depends(require_owner)):
    existing = await db.forfaits.find_one({"id": forfait_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Forfait introuvable")
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if updates:
        await db.forfaits.update_one({"id": forfait_id}, {"$set": updates})
    fresh = await db.forfaits.find_one({"id": forfait_id}, {"_id": 0})
    return ForfaitPublic(**fresh)


@api_router.delete("/forfaits/{forfait_id}")
async def delete_forfait(forfait_id: str, user: dict = Depends(require_owner)):
    result = await db.forfaits.delete_one({"id": forfait_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Forfait introuvable")
    return {"ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
