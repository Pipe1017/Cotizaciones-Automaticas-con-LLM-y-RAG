#!/usr/bin/env python3
"""Crear usuario administrador inicial.
Uso: python scripts/seed_admin.py <username> <nombre_completo> <password>
Ejemplo: python scripts/seed_admin.py admin "Administrador" Admin123
"""
import sys
import os

# Permite correrlo desde la raíz del proyecto sin instalar el paquete
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password


def main():
    if len(sys.argv) < 4:
        print("Uso: python scripts/seed_admin.py <username> <nombre> <password>")
        print("Ejemplo: python scripts/seed_admin.py admin 'Administrador' Admin123")
        sys.exit(1)

    username = sys.argv[1]
    nombre   = sys.argv[2]
    password = sys.argv[3]

    db = SessionLocal()
    try:
        if db.query(User).filter(User.username == username).first():
            print(f"El usuario '{username}' ya existe — no se creó ninguno nuevo.")
            return
        u = User(
            username=username,
            nombre=nombre,
            hashed_password=hash_password(password),
            rol="editor",
            activo=True,
        )
        db.add(u)
        db.commit()
        print(f"✓ Usuario '{username}' ({nombre}) creado con rol 'editor'.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
