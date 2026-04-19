from app.db.session import SessionLocal
from app.models.user import User
from app.api.v1.endpoints.users import list_users
from uuid import UUID

db = SessionLocal()
try:
    owner = db.query(User).filter(User.role == "owner").first()
    if not owner:
        print("Owner not found in DB")
    else:
        print(f"Testing list_users for {owner.email} (Role: {owner.role})")
        # Mocking the dependency injection results
        response = list_users(admin=owner, active_company_id=owner.company_id, db=db)
        print(f"Total Users in Response: {len(response.items)}")
        for u in response.items:
            print(f" - {u.email} ({u.role})")
finally:
    db.close()
