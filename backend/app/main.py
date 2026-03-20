# CI Trigger: Auth refactor and disk cleanup
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.bootstrap import bootstrap_owner


app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url, 
        "https://emlak.omnisync.life", 
        "http://emlak.omnisync.life",
        "http://localhost:3000", 
        "http://127.0.0.1:3000", 
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
def on_startup() -> None:
    bootstrap_owner()
