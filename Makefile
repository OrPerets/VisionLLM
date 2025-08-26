.PHONY: dev-up dev-down logs seed migrate backend-dev

dev-up:
	docker compose -f infra/docker-compose.yml up -d --build

dev-down:
	docker compose -f infra/docker-compose.yml down -v

logs:
	docker compose -f infra/docker-compose.yml logs -f | cat

backend-dev:
	$(MAKE) -C backend dev

migrate:
	$(MAKE) -C backend migrate

seed:
	$(MAKE) -C backend seed


