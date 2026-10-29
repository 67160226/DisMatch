# FastAPI Login & Register System

ระบบ Login และ Register ด้วย FastAPI + PostgreSQL + SQLAlchemy + หน้าเว็บ (nginx)

## 📋 ความต้องการ

- Docker & Docker Compose
- หรือ Python 3.11+

## 🚀 วิธีรัน

### วิธีที่ 1: ใช้ Docker Compose (ง่ายที่สุด)

```bash
docker-compose up -d
```

เปิดใช้งานได้ที่:

| บริการ | URL | หมายเหตุ |
|--------|-----|----------|
| 🖥️ **หน้าเว็บ (Frontend)** | http://localhost:3000 | login / register / dashboard |
| ⚡ FastAPI | http://localhost:8000 | API |
| 📖 Swagger UI | http://localhost:8000/docs | ทดสอบ API |
| 🗄️ pgAdmin | http://localhost:8080 | จัดการฐานข้อมูล |

### วิธีที่ 2: รัน Local

```bash
# ติดตั้ง dependencies
pip install -r requirements.txt

# สตาร์ท PostgreSQL (หากยังไม่ได้รัน)
docker-compose up -d postgres

# รัน FastAPI
python main.py
```

> วิธีนี้จะได้เฉพาะ API — หน้าเว็บที่ port 3000 ต้องรันผ่าน Docker Compose
> เพราะพึ่ง nginx เป็นตัว proxy `/api` ให้ (`docker-compose up -d frontend`)

## 📍 Endpoints

### 1. สมัครสมาชิก (Register)
**POST** `/register`

```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

ตอบกลับ:
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "created_at": "2024-01-15T10:30:00"
}
```

### 2. เข้าสู่ระบบ (Login)
**POST** `/login`

```json
{
  "username": "john_doe",
  "password": "securepassword123"
}
```

ตอบกลับ:
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "created_at": "2024-01-15T10:30:00"
  }
}
```

### 3. ดึงข้อมูล User
**GET** `/users/{user_id}`

ตัวอย่าง: `/users/1`

ตอบกลับ:
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "created_at": "2024-01-15T10:30:00"
}
```

## 🗄️ Database

### Table: users

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary Key |
| username | VARCHAR(50) | Unique username |
| email | VARCHAR(100) | Unique email |
| hashed_password | VARCHAR(255) | Encrypted password |
| created_at | TIMESTAMP | Account creation time |

### Indexes

- `idx_username` - สำหรับค้นหาเร็วด้วย username
- `idx_email` - สำหรับค้นหาเร็วด้วย email

## 🛠️ ทดสอบ API

### ใช้ Swagger UI
```
http://localhost:8000/docs
```

### ใช้ curl

```bash
# Register
curl -X POST "http://localhost:8000/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"pass123"}'

# Login
curl -X POST "http://localhost:8000/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"pass123"}'

# Get User
curl "http://localhost:8000/users/1"
```

## 💾 ดูข้อมูลใน pgAdmin

1. เปิด http://localhost:8080
2. Login: `user@example.com` / `mypassword`
3. Add Server:
   - Hostname: `postgres`
   - Username: `myuser`
   - Password: `mypassword`
   - Database: `mydb`

## 🔐 Security Features

- ✅ Password hashing (bcrypt)
- ✅ Unique username & email constraints
- ✅ Input validation (Pydantic)
- ✅ Error handling
- ✅ Escape HTML ก่อน render ข้อมูล user ในหน้า dashboard (กัน XSS)
- ❌ **ยังไม่มี token/session จริง** — ดูหัวข้อข้อจำกัดใน Frontend

> **หมายเหตุเรื่อง bcrypt:** `requirements.txt` ปักหมุด `bcrypt==4.0.1` ไว้
> เพราะ passlib 1.7.4 ใช้กับ bcrypt ตั้งแต่ 4.1 ขึ้นไปไม่ได้ (`/register` จะพัง 500)
> และ bcrypt รองรับรหัสผ่านสูงสุด 72 ไบต์ — ส่วนที่เกินจะถูกตัดทิ้งเงียบ ๆ
> หน้าเว็บจึงเช็คให้ตั้งแต่ฝั่ง client แต่ **ฝั่ง backend ยังไม่ได้เช็ค**

## 🖥️ Frontend

หน้าเว็บเป็น static HTML/CSS/JS ล้วน (ไม่ต้อง build, ไม่ต้องใช้ Node) เสิร์ฟด้วย nginx

### หน้าเว็บ

| หน้า | URL | ทำอะไร |
|------|-----|--------|
| เข้าสู่ระบบ | http://localhost:3000/ | เรียก `POST /login` แล้วพาไป dashboard |
| สมัครสมาชิก | http://localhost:3000/register | เรียก `POST /register` แล้วพากลับไปหน้า login |
| Dashboard | http://localhost:3000/dashboard | โหลดข้อมูลจาก `GET /users/{id}` |

### เชื่อมกับ API ยังไง

nginx ทำหน้าที่ **reverse proxy** ให้ด้วย เบราว์เซอร์จึงยิง API แบบ same-origin
ทำให้**ไม่ต้องตั้งค่า CORS ใน `main.py` เลย**

```
เบราว์เซอร์ → http://localhost:3000/api/login
                        ↓ nginx ตัด prefix /api ออก
              http://fastapi_app:8000/login
```

ถ้าอยากเปลี่ยนไปเรียก API ตรง ๆ (ข้าม proxy) ต้องแก้ `API` ใน `frontend/html/app.js`
เป็น `http://localhost:8000` **และ** เพิ่ม `CORSMiddleware` ใน `main.py`

### แก้ไฟล์หน้าเว็บ

`./frontend/html` ถูก mount เข้า container อยู่แล้ว — แก้ไฟล์เสร็จแค่ refresh เบราว์เซอร์
ไม่ต้อง rebuild (จะ rebuild ก็ต่อเมื่อแก้ `nginx.conf` หรือ `Dockerfile`)

```bash
docker-compose restart frontend   # ถ้าแก้ nginx.conf
docker-compose up -d --build frontend
```

### ⚠️ ข้อจำกัด — ยังไม่ใช่ระบบ auth จริง

`POST /login` ของ backend **ไม่ได้ออก token** ให้ แค่ส่งข้อมูล user กลับมาเมื่อรหัสผ่านถูก
ฝั่งหน้าเว็บจึงเก็บ user ไว้ใน `localStorage` เพื่อ "จำสถานะ" ในเดโมเท่านั้น

หมายความว่า:

- ใครก็ตั้งค่า `localStorage` เองแล้วเข้า dashboard ได้ โดยไม่ต้องรู้รหัสผ่าน
- `GET /users/{id}` เปิดให้เรียกได้อิสระ ไม่มีการตรวจสิทธิ์
- **ห้ามนำไปใช้งานจริงก่อนเพิ่ม JWT** (ดูหัวข้อ Next Steps)

## 📁 Files

- `main.py` - FastAPI application
- `requirements.txt` - Python dependencies
- `docker-compose.yml` - Docker configuration
- `Dockerfile` - FastAPI image
- `init.sql` - SQL script for database setup
- `README.md` - This file
- `frontend/` - หน้าเว็บ (static site + nginx)
  - `Dockerfile` - nginx image
  - `nginx.conf` - เสิร์ฟไฟล์ static + proxy `/api` → `fastapi_app:8000`
  - `html/index.html` - หน้าเข้าสู่ระบบ
  - `html/register.html` - หน้าสมัครสมาชิก
  - `html/dashboard.html` - หน้า dashboard
  - `html/style.css` - สไตล์ทั้งหมด
  - `html/app.js` - เรียก API, จัดการฟอร์ม, จัดการ session

## 🚀 Next Steps

- เพิ่ม JWT authentication
- เพิ่ม Email verification
- เพิ่ม Password reset functionality
- เพิ่ม Role-based access control (RBAC)
