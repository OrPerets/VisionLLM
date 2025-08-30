.PHONY: dev-up dev-down logs seed migrate backend-dev ingest reindex eval ingest-one ingest-docs docker-build docker-push docker-build-multi

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

ingest:
	python3 -m ingestion.01_collect --sources configs/sources.yaml --out .cache --product all

ingest-one:
	python3 -m ingestion.01_collect --sources configs/sources.yaml --out .cache --product $(PRODUCT) --max-urls $(MAX) --resume

ingest-docs:
	@echo "Deprecated. Use 'make ingest' or 'make ingest-one' instead."

reindex:
	python3 ingestion/03_chunk.py && \
	python3 ingestion/04_embed.py && \
	python3 ingestion/05_index.py

eval:
	echo "Eval harness to be implemented in Phase 3"

docker-build:
	docker buildx build --platform linux/amd64 -t orperetz/vision-llm:latest -f backend/Dockerfile .
	docker buildx build --platform linux/amd64 -t orperetz/vision-llm-frontend:latest -f frontend/Dockerfile frontend

docker-build-multi:
	docker buildx build --platform linux/amd64,linux/arm64 -t orperetz/vision-llm:latest -f backend/Dockerfile .
	docker buildx build --platform linux/amd64,linux/arm64 -t orperetz/vision-llm-frontend:latest -f frontend/Dockerfile frontend

docker-push: docker-build
	docker push orperetz/vision-llm:latest
	docker push orperetz/vision-llm-frontend:latest


