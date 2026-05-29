.PHONY: dev-build dev-rebuild dev-run dev-kill dev-logs

dev-build:
	docker compose build

dev-rebuild:
	docker compose down
	docker compose build --no-cache
	docker compose up -d

dev-run:
	docker compose up -d

dev-kill:
	docker compose down

dev-logs:
	docker compose logs -f
