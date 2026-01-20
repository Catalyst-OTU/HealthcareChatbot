import os
import json
import firebase_admin
from firebase_admin import credentials, db
from dotenv import load_dotenv

load_dotenv()

firebase_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
firebase_db_url = os.getenv("FIREBASE_DB_URL")

if not firebase_json:
    raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON is not set")

try:
    service_account_info = json.loads(firebase_json)
except json.JSONDecodeError as e:
    raise RuntimeError("Invalid FIREBASE_SERVICE_ACCOUNT_JSON") from e

cred = credentials.Certificate(service_account_info)

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred, {
        "databaseURL": firebase_db_url
    })

complaints_ref = db.reference("complaints")
admins_ref = db.reference("admins")
users_ref = db.reference("users")