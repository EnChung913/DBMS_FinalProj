from fastapi import FastAPI
from app.interfaces.routes.auth import router as auth_router

app = FastAPI()

@app.get("/")
def root():
    return {"status": "ok"}

app.include_router(auth_router, prefix="/auth")
