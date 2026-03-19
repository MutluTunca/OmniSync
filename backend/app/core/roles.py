from enum import Enum


class Role(str, Enum):
    owner = "owner"
    admin = "admin"
    manager = "manager"
    operator = "operator"
    agent = "agent"

    @classmethod
    def choices(cls) -> list[str]:
        return [role.value for role in cls]
