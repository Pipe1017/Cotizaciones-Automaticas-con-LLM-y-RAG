#!/usr/bin/env python3
"""Crear un usuario nuevo desde la línea de comandos.
Uso: python scripts/create_user.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password


def main():
    print("=== Crear usuario OPEX CRM ===")
    username = input("Username: ").strip()
    if not username:
        print("Username requerido")
        sys.exit(1)

    nombre = input("Nombre completo: ").strip()
    if not nombre:
        print("Nombre requerido")
        sys.exit(1)

    import getpass
    password = getpass.getpass("Contraseña: ")
    if len(password) < 6:
        print("La contraseña debe tener al menos 6 caracteres")
        sys.exit(1)

    rol = input("Rol (viewer/editor) [editor]: ").strip() or "editor"
    if rol not in ("viewer", "editor"):
        print("Rol inválido")
        sys.exit(1)

    db = SessionLocal()
    try:
        if db.query(User).filter(User.username == username).first():
            print(f"Error: el usuario '{username}' ya existe")
            sys.exit(1)
        user = User(
            username=username,
            nombre=nombre,
            hashed_password=hash_password(password),
            rol=rol,
        )
        db.add(user)
        db.commit()
        print(f"\nUsuario '{username}' ({nombre}) creado con rol '{rol}'")
    finally:
        db.close()


if __name__ == "__main__":
    main()
