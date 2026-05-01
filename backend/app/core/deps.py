from typing import Optional

from fastapi import Cookie, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.database import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(
    request: Request,
    header_token: Optional[str] = Depends(oauth2_scheme),
    cookie_token: Optional[str] = Cookie(None, alias="access_token"),
    db: Session = Depends(get_db),
) -> User:
    # Prioridad: 1) Header Authorization  2) Cookie  3) Query param
    token = (
        header_token
        or cookie_token
        or request.query_params.get("token")
    )

    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise exc
    try:
        payload = decode_token(token)
        username: str = payload.get("sub")
        if not username:
            raise exc
    except InvalidTokenError:
        raise exc
    user = db.query(User).filter(User.username == username, User.activo == True).first()
    if not user:
        raise exc
    return user


def require_editor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.rol != "editor":
        raise HTTPException(status_code=403, detail="Solo los editores pueden modificar datos")
    return current_user


def viewer_or_editor(request: Request, current_user: User = Depends(get_current_user)) -> User:
    """GET → cualquier usuario autenticado. POST/PUT/PATCH/DELETE → solo editor."""
    if request.method not in ("GET", "HEAD", "OPTIONS") and current_user.rol != "editor":
        raise HTTPException(status_code=403, detail="Solo los editores pueden modificar datos")
    return current_user
