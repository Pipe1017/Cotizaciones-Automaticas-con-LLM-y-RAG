.PHONY: up down migrate seed setup logs

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f backend

migrate:
	docker compose exec backend alembic upgrade head

seed: migrate
	docker compose exec backend python -m scripts.setup_minio
	docker compose exec backend python -m scripts.migrate_crm_baterias
	docker compose exec backend python -m scripts.migrate_crm_fertilizantes

setup: up
	@echo "Esperando que los servicios estén listos..."
	@sleep 8
	$(MAKE) seed
	@echo ""
	@echo "AURA CRM listo:"
	@echo "  Frontend:   http://localhost:3000"
	@echo "  Backend:    http://localhost:8000/docs"
	@echo "  MinIO UI:   http://localhost:9001"
