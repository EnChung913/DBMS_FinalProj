from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.auth_service import AuthService
from app.interfaces.schemas.auth import RegisterRequest

router = APIRouter()

@router.post("/register")
async def register_user(req: RegisterRequest, db: Session = Depends(get_db)):
    print("DEBUG RAW REQ:", req)
    print("DEBUG TYPE:", type(req))
    return AuthService.register(req, db)

