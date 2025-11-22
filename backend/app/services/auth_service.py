from sqlalchemy.orm import Session
from app.db.models.generated import User, StudentProfile, DepartmentProfile, CompanyProfile
from app.core.security import hash_password
from app.interfaces.schemas.auth import RegisterRequest
import uuid

class AuthService:

    @staticmethod
    def register(req: RegisterRequest, db: Session):

        # 檢查 email 或 username 是否存在
        exists = db.query(User).filter(
            (User.email == req.email) | (User.username == req.username)
        ).first()

        if exists:
            return {"success": False, "message": "username or email already exists"}

        # 建立 user
        new_user = User(
            real_name=req.real_name,
            email=req.email,
            username=req.username,
            password=hash_password(req.password),
            nickname=req.nickname,
            role=req.role
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # ----------------------------------------
        # 建立 Profile (依角色)
        # ----------------------------------------

        if req.role == "student":
            # 先生成一個 department_id（暫時假資料，之後可以補）
            # schema 需要 department_id + entry_year + grade
            # MVP 先填入 default 值
            profile = StudentProfile(
                user_id=new_user.user_id,
                student_id=f"S{str(new_user.user_id)[:8]}",
                department_id=None,   # ← 必須填實際部門，後續補
                entry_year=2024,
                grade=1
            )
            db.add(profile)

        elif req.role == "department":
            profile = DepartmentProfile(
                department_id=new_user.user_id,
                department_name=f"Dept-{req.nickname}",
                contact_person=new_user.user_id
            )
            db.add(profile)

        elif req.role == "company":
            profile = CompanyProfile(
                company_id=new_user.user_id,
                company_name=req.nickname,
                industry="Unknown",
                contact_person=new_user.user_id
            )
            db.add(profile)

        else:
            return {"success": False, "message": "invalid role"}

        db.commit()

        return {"success": True, "user_id": str(new_user.user_id)}
