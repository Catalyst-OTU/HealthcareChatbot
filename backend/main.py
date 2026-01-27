from fastapi import FastAPI, Request, Form, status, Depends, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from firebase_config import complaints_ref, admins_ref
from datetime import datetime
from typing import List, Dict, Optional
from starlette.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware

import random
import bcrypt

app = FastAPI(
    title="Healthcare Chatbot Backend",
    docs_url="/api/for/healthcarechatbot/docs",
    redoc_url="/api/for/healthcarechatbot/redoc",
    openapi_url="/api/for/healthcarechatbot/openapi.json"
)
# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates folder
templates = Jinja2Templates(directory="templates")

# Generate unique Complaint ID
def generate_complaint_id():
    return f"CMP-{random.randint(1000, 9999)}"

# Complaint model
class Complaint(BaseModel):
    Patient_Name: str
    Complaint_Type: str
    Description: str






## Updated main.py (additions for admin dashboard, auth, and API endpoints

# Add session middleware (change secret_key to something secure)
app.add_middleware(SessionMiddleware, secret_key="41c262131ae9d442e46dcfa6711605b5c350a9e463d29cc4d0cc5a78d1c57545")

# Super admin credentials (seeder admin - change these in production!)
SUPER_ADMIN_USERNAME = "admin"
SUPER_ADMIN_PASSWORD = "Openforme"

# Initialize super admin if not exists
def initialize_super_admin():
    """Initialize super admin in Firebase if it doesn't exist"""
    try:
        admin = admins_ref.child(SUPER_ADMIN_USERNAME).get()
        if not admin:
            hashed = bcrypt.hashpw(SUPER_ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt())
            admins_ref.child(SUPER_ADMIN_USERNAME).set({
                "username": SUPER_ADMIN_USERNAME,
                "password_hash": hashed.decode('utf-8'),
                "is_super_admin": True,
                "created_at": datetime.now().isoformat(),
                "created_by": "system"
            })
    except Exception as e:
        print(f"Warning: Could not initialize super admin: {e}")

# Initialize super admin on startup
@app.on_event("startup")
async def startup_event():
    initialize_super_admin()

# Dependency to check if user is authenticated
def get_current_user(request: Request):
    user = request.session.get("user")
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Basic"},
        )
    
    # Check if user exists in Firebase or is super admin
    if user != SUPER_ADMIN_USERNAME:
        admin = admins_ref.child(user).get()
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Basic"},
            )
    
    return user

# Dependency to check if user is super admin
def get_super_admin(request: Request):
    user = get_current_user(request)
    if user == SUPER_ADMIN_USERNAME:
        return user
    admin = admins_ref.child(user).get()
    if not admin or not admin.get("is_super_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return user

# Login page
@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

# Handle login
@app.post("/login", response_class=HTMLResponse)
async def login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...)
):
    # Check super admin
    if username == SUPER_ADMIN_USERNAME and password == SUPER_ADMIN_PASSWORD:
        request.session["user"] = username
        request.session["is_super_admin"] = True
        return RedirectResponse(url="/admin", status_code=status.HTTP_303_SEE_OTHER)
    
    # Check Firebase admins
    admin = admins_ref.child(username).get()
    if admin:
        password_hash = admin.get("password_hash", "")
        if bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8')):
            request.session["user"] = username
            request.session["is_super_admin"] = admin.get("is_super_admin", False)
            return RedirectResponse(url="/admin", status_code=status.HTTP_303_SEE_OTHER)
    
    return templates.TemplateResponse(
        "login.html",
        {"request": request, "error": "Invalid username or password"}
    )

# Logout
@app.get("/logout")
async def logout(request: Request):
    request.session.pop("user", None)
    return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)

# Admin dashboard page (requires auth)
@app.get("/admin", response_class=HTMLResponse)
async def admin_dashboard(request: Request, current_user: str = Depends(get_current_user)):
    return templates.TemplateResponse("admin.html", {"request": request})

# API to get all complaints (requires auth)
@app.get("/api/complaints", response_model=List[Dict])
async def get_complaints(current_user: str = Depends(get_current_user)):
    complaints = complaints_ref.get()
    if not complaints:
        return []
    return [{"id": key, **value} for key, value in complaints.items()]

# API to update a complaint (requires auth)
class UpdateComplaint(BaseModel):
    Status: str
    Admin_Comment: str

@app.put("/api/complaints/{complaint_id}")
async def update_complaint(
    complaint_id: str,
    update: UpdateComplaint,
    current_user: str = Depends(get_current_user)
):
    complaint_ref = complaints_ref.child(complaint_id)
    if not complaint_ref.get():
        raise HTTPException(status_code=404, detail="Complaint not found")
    complaint_ref.update({
        "Status": update.Status,
        "Admin_Comment": update.Admin_Comment
    })
    return {"message": "Complaint updated successfully"}




# Serve frontend web page
@app.get("/", response_class=HTMLResponse)
async def web(request: Request):
    return templates.TemplateResponse("web.html", {"request": request})

# Handle form submission from web page
@app.post("/web/submit", response_class=HTMLResponse)
async def submit_web(
    request: Request,
    Patient_Name: str = Form(...),
    Complaint_Type: str = Form(...),
    Description: str = Form(...)
):
    complaint_id = generate_complaint_id()
    date_submitted = datetime.now().strftime("%Y-%m-%d")
    
    complaints_ref.child(complaint_id).set({
        "Patient_Name": Patient_Name,
        "Complaint_Type": Complaint_Type,
        "Description": Description,
        "Date_Submitted": date_submitted,
        "Status": "Pending",
        "Admin_Comment": ""
    })
    
    message = f"Thank you! Your complaint has been recorded. Your Complaint ID is {complaint_id}"
    
    return templates.TemplateResponse("web.html", {"request": request, "message": message})





@app.post("/web/track", response_class=HTMLResponse)
async def track_web(
    request: Request,
    Complaint_ID: str = Form(...)
):
    complaint = complaints_ref.child(Complaint_ID).get()

    if not complaint:
        return templates.TemplateResponse(
            "web.html",
            {
                "request": request,
                "error": f"Complaint ID {Complaint_ID} not found."
            }
        )

    return templates.TemplateResponse(
        "web.html",
        {
            "request": request,
            "complaint": complaint,
            "complaint_id": Complaint_ID
        }
    )


# ============ ADMIN MANAGEMENT ENDPOINTS ============

# Admin Management Models
class CreateAdmin(BaseModel):
    username: str
    password: str

class UpdatePassword(BaseModel):
    current_password: str
    new_password: str

# Admin Management Page (Super Admin Only)
@app.get("/admin/management", response_class=HTMLResponse)
async def admin_management_page(request: Request, current_user: str = Depends(get_super_admin)):
    return templates.TemplateResponse("admin_management.html", {"request": request})

# API to get all admins (Super Admin Only)
@app.get("/api/admins", response_model=List[Dict])
async def get_admins(current_user: str = Depends(get_super_admin)):
    admins = admins_ref.get()
    if not admins:
        # Return super admin if no admins in Firebase
        return [{
            "username": SUPER_ADMIN_USERNAME,
            "is_super_admin": True,
            "created_at": "system",
            "created_by": "system"
        }]
    
    result = []
    for username, data in admins.items():
        result.append({
            "username": username,
            "is_super_admin": data.get("is_super_admin", False),
            "created_at": data.get("created_at", ""),
            "created_by": data.get("created_by", "")
        })
    
    # Add super admin if not in Firebase
    if SUPER_ADMIN_USERNAME not in [a["username"] for a in result]:
        result.insert(0, {
            "username": SUPER_ADMIN_USERNAME,
            "is_super_admin": True,
            "created_at": "system",
            "created_by": "system"
        })
    
    return result

# API to create new admin (Super Admin Only)
@app.post("/api/admins", response_model=Dict)
async def create_admin(
    admin_data: CreateAdmin,
    current_user: str = Depends(get_super_admin)
):
    username = admin_data.username.strip()
    
    # Validate username
    if not username:
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    
    if username == SUPER_ADMIN_USERNAME:
        raise HTTPException(status_code=400, detail="Cannot create super admin")
    
    # Check if admin exists
    existing = admins_ref.child(username).get()
    if existing:
        raise HTTPException(status_code=400, detail="Admin already exists")
    
    # Validate password
    if len(admin_data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Hash password
    password_hash = bcrypt.hashpw(admin_data.password.encode('utf-8'), bcrypt.gensalt())
    
    # Create admin
    admins_ref.child(username).set({
        "username": username,
        "password_hash": password_hash.decode('utf-8'),
        "is_super_admin": False,
        "created_at": datetime.now().isoformat(),
        "created_by": current_user
    })
    
    return {"message": f"Admin {username} created successfully"}

# API to delete admin (Super Admin Only)
@app.delete("/api/admins/{username}")
async def delete_admin(
    username: str,
    current_user: str = Depends(get_super_admin)
):
    if username == SUPER_ADMIN_USERNAME:
        raise HTTPException(status_code=400, detail="Cannot delete super admin")
    
    admin = admins_ref.child(username).get()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    admins_ref.child(username).delete()
    return {"message": f"Admin {username} deleted successfully"}

# API to update own password (Any Admin)
@app.put("/api/admins/update-password")
async def update_password(
    password_data: UpdatePassword,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    # Get admin from Firebase or check super admin
    if current_user == SUPER_ADMIN_USERNAME:
        if password_data.current_password != SUPER_ADMIN_PASSWORD:
            raise HTTPException(status_code=400, detail="Current password is incorrect")
    else:
        admin = admins_ref.child(current_user).get()
        if not admin:
            raise HTTPException(status_code=404, detail="Admin not found")
        
        password_hash = admin.get("password_hash", "")
        if not bcrypt.checkpw(password_data.current_password.encode('utf-8'), password_hash.encode('utf-8')):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password
    if len(password_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    
    # Update password
    if current_user == SUPER_ADMIN_USERNAME:
        # Note: Super admin password is hardcoded, so we can't update it in Firebase
        # In production, you might want to store it in Firebase too
        raise HTTPException(status_code=400, detail="Super admin password cannot be changed via API")
    else:
        new_password_hash = bcrypt.hashpw(password_data.new_password.encode('utf-8'), bcrypt.gensalt())
        admins_ref.child(current_user).update({
            "password_hash": new_password_hash.decode('utf-8'),
            "password_updated_at": datetime.now().isoformat()
        })
    
    return {"message": "Password updated successfully"}

# API to check if current user is super admin
@app.get("/api/admins/check-super")
async def check_super_admin(request: Request, current_user: str = Depends(get_current_user)):
    is_super = request.session.get("is_super_admin", False)
    if current_user == SUPER_ADMIN_USERNAME:
        is_super = True
    return {"is_super_admin": is_super, "username": current_user}
