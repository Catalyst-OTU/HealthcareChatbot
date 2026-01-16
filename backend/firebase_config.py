import firebase_admin
from firebase_admin import credentials, db

# Initialize Firebase Admin SDK
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred, {
    "databaseURL": "https://healthcarechatbot-d7719-default-rtdb.firebaseio.com/"  # Replace with your Firebase Realtime DB URL
})

# Reference to complaints node
complaints_ref = db.reference('complaints')
