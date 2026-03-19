from datetime import datetime, timezone
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

# Auth scheme for bearer token
security = HTTPBearer()

def decode_access_token(token: str) -> dict:
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        if data.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        return data
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID in token")

    user = db.get(User, uid)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user

class RoleChecker:
    def __init__(self, *allowed_roles: str):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        if user.role not in self.allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
