import json
import traceback
import os
from app.db.session import SessionLocal
from app.workers.tasks import generate_comment_reply
from app.core.config import settings

print(f"DEBUG: OPENAI_API_KEY set: {bool(settings.openai_api_key)}")
print(f"DEBUG: MODEL_REPLY: {settings.openai_model_reply}")

db = SessionLocal()
try:
    comment_id = "26937410-5785-4d0e-9ec4-d8ddce1da752"
    print(f"Generating reply for: {comment_id}")
    # Call generate_comment_reply and see if it hits the internal generate_reply
    res = generate_comment_reply(comment_id)
    print(f"RESULT: {json.dumps(res, indent=2)}")
except Exception as e:
    print("CRITICAL ERROR:")
    traceback.print_exc()
finally:
    db.close()
