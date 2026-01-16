from fastapi import FastAPI, Request, Form, status, Depends, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from firebase_config import complaints_ref
from datetime import datetime
from typing import List, Dict
from starlette.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware

import random

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
app.add_middleware(SessionMiddleware, secret_key="your-secret-key-here")

# Hardcoded admin credentials (change these in production!)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Openforme"

# Dependency to check if user is authenticated
def get_current_user(request: Request):
    user = request.session.get("user")
    if user != ADMIN_USERNAME:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Basic"},
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
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        request.session["user"] = username
        return RedirectResponse(url="/admin", status_code=status.HTTP_303_SEE_OTHER)
    else:
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
