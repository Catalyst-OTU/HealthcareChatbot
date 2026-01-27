import os
import json
import tempfile
from google.cloud import dialogflow_v2
from dotenv import load_dotenv

load_dotenv()

# Get Dialogflow service account JSON from environment
dialogflow_json = os.getenv("DIALOGFLOW_SERVICE_ACCOUNT_JSON")
DIALOGFLOW_PROJECT_ID = os.getenv("DIALOGFLOW_PROJECT_ID")

if not dialogflow_json:
    raise RuntimeError("DIALOGFLOW_SERVICE_ACCOUNT_JSON is not set in environment")

if not DIALOGFLOW_PROJECT_ID:
    raise RuntimeError("DIALOGFLOW_PROJECT_ID is not set in environment")

try:
    service_account_info = json.loads(dialogflow_json)
except json.JSONDecodeError as e:
    raise RuntimeError("Invalid DIALOGFLOW_SERVICE_ACCOUNT_JSON - must be valid JSON") from e

# Create a temporary file with the credentials
# This is necessary because Google Cloud SDK requires a file path
temp_cred_file = tempfile.NamedTemporaryFile(
    mode='w',
    suffix='.json',
    delete=False
)

try:
    json.dump(service_account_info, temp_cred_file)
    temp_cred_file.close()
    
    # Set the path for Google Cloud authentication
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = temp_cred_file.name
    
    # Initialize Dialogflow client
    SESSION_CLIENT = dialogflow_v2.SessionsClient()
    
    print("✅ Dialogflow client initialized successfully")
    
except Exception as e:
    # Clean up temp file on error
    if os.path.exists(temp_cred_file.name):
        os.unlink(temp_cred_file.name)
    raise RuntimeError(f"Failed to initialize Dialogflow: {e}") from e