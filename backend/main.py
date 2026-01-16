from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from firebase_config import complaints_ref
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

# @app.get("/")
# async def root():
#     return {"message": "Healthcare Chatbot Backend is running ✅"}

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
