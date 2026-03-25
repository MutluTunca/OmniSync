from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from uuid import UUID

from app.api.v1.dependencies import RoleChecker, get_current_user, get_active_company_id
from app.core.security import hash_password
from app.core.roles import Role
from app.db.session import get_db
from app.models.user import User

router = APIRouter()


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Role = Role.agent


class UpdateUserRequest(BaseModel):
    role: Role
    is_active: bool


class UserItem(BaseModel):
    id: str
    email: str
    full_name: str
    role: Role
    is_active: bool


class UserListResponse(BaseModel):
    items: list[UserItem]


@router.get("", response_model=UserListResponse)
def list_users(
    admin: User = Depends(RoleChecker("admin", "owner")), 
    active_company_id: UUID = Depends(get_active_company_id),
    db: Session = Depends(get_db)
) -> UserListResponse:
    # If owner, they see all users in the system
    # If admin, they see users of the active (selected) company
    print(f"DEBUG: list_users called by {admin.email} with role {admin.role}")
    if admin.role == Role.owner.value:
        users = db.query(User).order_by(User.email).all()
        print(f"DEBUG: Owner mode - found {len(users)} users")
    else:
        users = db.query(User).filter(User.company_id == active_company_id).order_by(User.email).all()
        print(f"DEBUG: Admin mode - found {len(users)} users for company {active_company_id}")
    result: list[UserItem] = []
    for item in users:
        try:
            parsed_role = Role(item.role)
        except ValueError:
            parsed_role = Role.agent
        result.append(
            UserItem(
                id=str(item.id),
                email=item.email,
                full_name=item.full_name,
                role=parsed_role,
                is_active=item.is_active,
            )
        )
    return UserListResponse(items=result)


@router.post("", response_model=UserItem)
def create_user(
    payload: CreateUserRequest, 
    creator: User = Depends(RoleChecker("admin", "owner")), 
    active_company_id: UUID = Depends(get_active_company_id),
    db: Session = Depends(get_db)
) -> UserItem:
    # Hierarchy check: Admin can only create Agents
    if creator.role == Role.admin.value and payload.role != Role.agent:
        raise HTTPException(status_code=403, detail="Admins can only create Agents")
    
    # Hierarchy check: Owner can create Admins or Agents
    # (Owner is allowed to create anyone)

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")

    user = User(
        company_id=active_company_id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role.value,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserItem(id=str(user.id), email=user.email, full_name=user.full_name, role=Role(user.role), is_active=user.is_active)


@router.put("/{user_id}", response_model=UserItem)
def update_user(
    user_id: str, 
    payload: UpdateUserRequest, 
    creator: User = Depends(RoleChecker("admin", "owner")), 
    active_company_id: UUID = Depends(get_active_company_id),
    db: Session = Depends(get_db)
) -> UserItem:
    try:
        uid = UUID(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid user id") from exc

    # If owner, find user anywhere. If admin, find user in active company.
    if creator.role == Role.owner.value:
        user = db.query(User).filter(User.id == uid).first()
    else:
        user = db.query(User).filter(User.id == uid, User.company_id == active_company_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Hierarchy check: Admin can only manage Agents
    if creator.role == Role.admin.value:
        if user.role != Role.agent.value:
            raise HTTPException(status_code=403, detail="Admins can only manage Agents")
        if payload.role != Role.agent:
            raise HTTPException(status_code=403, detail="Admins can only promote to Agent status")

    if user.id == creator.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    user.role = payload.role.value
    user.is_active = payload.is_active
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserItem(id=str(user.id), email=user.email, full_name=user.full_name, role=Role(user.role), is_active=user.is_active)
