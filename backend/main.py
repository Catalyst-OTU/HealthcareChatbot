from fastapi import FastAPI, Request, Form, Depends
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from firebase_config import complaints_ref
from config import get_current_admin
from datetime import datetime
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





@app.get("/admin", response_class=HTMLResponse)
async def admin_dashboard(request: Request, admin: str = Depends(get_current_admin)):
    all_complaints = complaints_ref.get() or {}
    
    # Convert Firebase dict to a list of complaints
    complaints_list = [
        {"Complaint_ID": cid, **data} for cid, data in all_complaints.items()
    ]
    
    return templates.TemplateResponse(
        "admin.html",
        {"request": request, "complaints": complaints_list}
    )



@app.post("/admin/update", response_class=HTMLResponse)
async def update_complaint(
    request: Request,
    Complaint_ID: str = Form(...),
    Status: str = Form(...),
    Admin_Comment: str = Form(""),
    admin: str = Depends(get_current_admin)
):
    complaint = complaints_ref.child(Complaint_ID).get()
    if not complaint:
        return templates.TemplateResponse(
            "admin.html",
            {"request": request, "error": f"Complaint ID {Complaint_ID} not found."}
        )

    complaints_ref.child(Complaint_ID).update({
        "Status": Status,
        "Admin_Comment": Admin_Comment
    })
    
    message = f"Complaint {Complaint_ID} updated successfully!"
    all_complaints = complaints_ref.get() or {}
    complaints_list = [{"Complaint_ID": cid, **data} for cid, data in all_complaints.items()]

    return templates.TemplateResponse(
        "admin.html",
        {"request": request, "complaints": complaints_list, "message": message}
    )







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
