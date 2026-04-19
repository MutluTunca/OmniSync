from contextlib import asynccontextmanager
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.bootstrap import bootstrap_owner


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    bootstrap_owner()
    yield
    # Shutdown logic (if any)


app = FastAPI(
    title=settings.app_name, 
    version="0.1.0",
    lifespan=lifespan
)

# Create uploads directory if not exists
if not os.path.exists("uploads"):
    os.makedirs("uploads")
if not os.path.exists("uploads/logos"):
    os.makedirs("uploads/logos")

app.mount("/api/v1/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url, 
        "https://emlak.omnisync.life", 
        "http://emlak.omnisync.life",
        "http://localhost:3000", 
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
