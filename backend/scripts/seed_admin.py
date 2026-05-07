#!/usr/bin/env python3
"""Crear usuario administrador inicial.
Uso: python -m scripts.seed_admin <username> <nombre_completo> <password> [rol]
Ejemplo: python -m scripts.seed_admin aura.gallego "Aura Gallego" aura123 editor
"""
import sys
from app.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password


def main():
    if len(sys.argv) < 4:
        print("Uso: python -m scripts.seed_admin <username> <nombre> <password> [rol]")
        sys.exit(1)

    username = sys.argv[1]
    nombre = sys.argv[2]
    password = sys.argv[3]
    rol = sys.argv[4] if len(sys.argv) > 4 else "editor"

    if rol not in ("viewer", "editor"):
        print("Rol inválido. Usa 'viewer' o 'editor'")
        sys.exit(1)

    db = SessionLocal()
    try:
        if db.query(User).filter(User.username == username).first():
            print(f"El usuario '{username}' ya existe")
            return
        u = User(
            username=username,
            nombre=nombre,
            hashed_password=hash_password(password),
            rol=rol,
        )
        db.add(u)
        db.commit()
        print(f"Usuario '{username}' ({nombre}) creado con rol '{rol}'")
    finally:
        db.close()


if __name__ == "__main__":
    main()
