import os
import random
import string
from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Boolean, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from passlib.context import CryptContext

# ดึง DATABASE_URL จาก Environment Variable ของ Docker Compose
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://myuser:mypassword@postgres:5432/mydb")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI(title="Food Matcher API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Database Models ====================
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, index=True)
    created_by = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

class RoomFood(Base):
    __tablename__ = "room_foods"
    id = Column(Integer, primary_key=True, index=True)
    room_code = Column(String(10), ForeignKey("rooms.code"))
    food_name = Column(String(100))

class RoomMember(Base):
    __tablename__ = "room_members"
    id = Column(Integer, primary_key=True, index=True)
    room_code = Column(String(10), ForeignKey("rooms.code"))
    username = Column(String(50))
    joined_at = Column(DateTime, default=datetime.utcnow)

class Vote(Base):
    __tablename__ = "votes"
    id = Column(Integer, primary_key=True, index=True)
    room_code = Column(String(10), ForeignKey("rooms.code"))
    food_name = Column(String(100))
    username = Column(String(50))
    is_like = Column(Boolean)

Base.metadata.create_all(bind=engine)

# ==================== Schemas ====================
class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class CreateRoomSchema(BaseModel):
    username: str
    foods: List[str]

class VoteSchema(BaseModel):
    room_code: str
    food_name: str
    username: str
    is_like: bool

class GoogleAuthSchema(BaseModel):
    token: str

# ==================== Helper Functions ====================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def check_room_match(code: str, db: Session):
    total_users = db.query(Vote.username).filter(Vote.room_code == code).distinct().count()
    if total_users == 0:
        return False, None

    foods = db.query(RoomFood).filter(RoomFood.room_code == code).all()
    for food in foods:
        like_count = db.query(Vote).filter(
            Vote.room_code == code,
            Vote.food_name == food.food_name,
            Vote.is_like == True
        ).count()
        
        if like_count == total_users:
            return True, food.food_name

    return False, None

# ==================== Endpoints ====================
@app.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username นี้ถูกใช้งานแล้ว")
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email นี้ถูกใช้งานแล้ว")
    
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=pwd_context.hash(user.password)
    )
    db.add(db_user)
    db.commit()
    return {"message": "Success"}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")
    return {"message": "Success", "user": {"id": db_user.id, "username": db_user.username}}

@app.post("/auth/google")
def google_login(data: GoogleAuthSchema, db: Session = Depends(get_db)):
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests
        
        GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "442327447287-itsteth7ufnpfhvgep91rfqbjeqnqatp.apps.googleusercontent.com")
        
        id_info = id_token.verify_oauth2_token(data.token, requests.Request(), GOOGLE_CLIENT_ID)
            
        email = id_info['email']
        username = id_info.get('name', email.split('@')[0])

        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                username=username,
                email=email,
                hashed_password="GOOGLE_AUTH_USER"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        return {"message": "Success", "user": {"id": user.id, "username": user.username}}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google Login ไม่สำเร็จ: {str(e)}")

@app.post("/rooms/create")
def create_room(data: CreateRoomSchema, db: Session = Depends(get_db)):
    code = generate_room_code()
    new_room = Room(code=code, created_by=data.username)
    db.add(new_room)
    
    # บันทึกผู้สร้างห้องเป็นสมาชิกคนแรก
    db.add(RoomMember(room_code=code, username=data.username))
    
    for food in data.foods:
        db.add(RoomFood(room_code=code, food_name=food))
        
    db.commit()
    return {"room_code": code}

@app.post("/rooms/{code}/join")
def join_room_user(code: str, username: str, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.code == code).first()
    if not room:
        raise HTTPException(status_code=404, detail="ไม่พบห้องนี้")
        
    existing = db.query(RoomMember).filter(
        RoomMember.room_code == code, 
        RoomMember.username == username
    ).first()
    
    if not existing:
        db.add(RoomMember(room_code=code, username=username))
        db.commit()
        
    return {"message": "Joined"}

@app.get("/rooms/{code}")
def get_room(code: str, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.code == code).first()
    if not room:
        raise HTTPException(status_code=404, detail="ไม่พบห้องนี้")
    foods = db.query(RoomFood).filter(RoomFood.room_code == code).all()
    members = db.query(RoomMember.username).filter(RoomMember.room_code == code).distinct().all()
    return {
        "code": room.code, 
        "created_by": room.created_by, 
        "foods": [f.food_name for f in foods],
        "members": [m[0] for m in members]
    }

@app.post("/rooms/vote")
def vote_food(data: VoteSchema, db: Session = Depends(get_db)):
    existing_vote = db.query(Vote).filter(
        Vote.room_code == data.room_code,
        Vote.food_name == data.food_name,
        Vote.username == data.username
    ).first()

    if existing_vote:
        existing_vote.is_like = data.is_like
    else:
        new_vote = Vote(
            room_code=data.room_code,
            food_name=data.food_name,
            username=data.username,
            is_like=data.is_like
        )
        db.add(new_vote)

    db.commit()

    is_match, matched_food = check_room_match(data.room_code, db)
    return {
        "message": "Voted",
        "is_match": is_match,
        "matched_food": matched_food
    }

@app.get("/rooms/{code}/status")
def get_room_status(code: str, db: Session = Depends(get_db)):
    is_match, matched_food = check_room_match(code, db)
    return {
        "is_match": is_match,
        "matched_food": matched_food
    }

@app.get("/rooms/{code}/top-vote")
def get_top_voted_food(code: str, db: Session = Depends(get_db)):
    top_food = db.query(
        Vote.food_name, 
        func.count(Vote.id).label('like_count')
    ).filter(
        Vote.room_code == code, 
        Vote.is_like == True
    ).group_by(Vote.food_name).order_by(func.count(Vote.id).desc()).first()

    if top_food:
        return {"food_name": top_food[0], "likes": top_food[1]}
    else:
        first_food = db.query(RoomFood).filter(RoomFood.room_code == code).first()
        return {"food_name": first_food.food_name if first_food else "ไม่มีเมนู", "likes": 0}