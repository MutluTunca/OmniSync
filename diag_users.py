from app.db.session import SessionLocal
from app.models.user import User

db = SessionLocal()
try:
    users = db.query(User).all()
    print(f"Total Users: {len(users)}")
    print("-" * 50)
    for u in users:
        print(f"Email: {u.email} | Role: {u.role} | CompanyID: {u.company_id} | Active: {u.is_active}")
finally:
    db.close()
