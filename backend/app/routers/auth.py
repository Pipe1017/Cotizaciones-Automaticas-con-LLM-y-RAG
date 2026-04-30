from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_editor
from app.core.security import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models.user import User

router = APIRouter()


class Token(BaseModel):
    access_token: str
    token_type: str
    rol: str
    nombre: str


class UserOut(BaseModel):
    id: int
    username: str
    nombre: str
    rol: str
    activo: bool

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str
    nombre: str
    password: str
    rol: str = "viewer"


class PasswordChange(BaseModel):
    password_actual: str
    password_nuevo: str


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username, User.activo == True).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    return {
        "access_token": create_access_token(user.username, user.rol),
        "token_type": "bearer",
        "rol": user.rol,
        "nombre": user.nombre,
    }


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=list[UserOut])
def list_users(_: User = Depends(require_editor), db: Session = Depends(get_db)):
    return db.query(User).filter(User.activo == True).order_by(User.nombre).all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(data: UserCreate, _: User = Depends(require_editor), db: Session = Depends(get_db)):
    if data.rol not in ("viewer", "editor"):
        raise HTTPException(status_code=400, detail="Rol inválido — usa 'viewer' o 'editor'")
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="El username ya existe")
    user = User(
        username=data.username,
        nombre=data.nombre,
        hashed_password=hash_password(data.password),
        rol=data.rol,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, current_user: User = Depends(require_editor), db: Session = Depends(get_db)):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.activo = False
    db.commit()


@router.post("/users/{user_id}/password", status_code=204)
def change_password(
    user_id: int,
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Solo puede cambiar su propia contraseña (o un editor la de cualquiera)
    if current_user.id != user_id and current_user.rol != "editor":
        raise HTTPException(status_code=403, detail="Sin permiso")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if current_user.id == user_id and not verify_password(data.password_actual, user.hashed_password):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    user.hashed_password = hash_password(data.password_nuevo)
    db.commit()
