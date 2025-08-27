PYTHON ?= python3

.PHONY: dev run test fmt lint migrate revision seed

dev:
	PYTHONPATH=.. $(PYTHON) -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

run:
	PYTHONPATH=.. $(PYTHON) -m uvicorn app.main:app --host 0.0.0.0 --port 8000

test:
	$(PYTHON) -m pytest

fmt:
	$(PYTHON) -m black .
	$(PYTHON) -m ruff --fix .

lint:
	$(PYTHON) -m ruff .

migrate:
	alembic upgrade head

revision:
	alembic revision --autogenerate -m "update"

seed:
	$(PYTHON) scripts/seed.py


