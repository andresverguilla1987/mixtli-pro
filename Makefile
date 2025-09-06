# Quick dev helpers
.PHONY: up down seed logs db psql

up:
	cd infra && docker compose --env-file ./.env.docker up -d db adminer swagger

down:
	cd infra && docker compose --env-file ./.env.docker down

seed:
	cd infra && docker compose --env-file ./.env.docker up seed --build --abort-on-container-exit && docker compose rm -f seed

logs:
	cd infra && docker compose logs -f

db:
	@echo "Adminer: http://localhost:$${ADMINER_PORT:-8080} (server: db, user: $${POSTGRES_USER:-mixtli})"

swagger:
	@echo "Swagger UI: http://localhost:$${SWAGGER_PORT:-9000}"


app:
	cd infra && docker compose --env-file ./.env.docker up --build -d app

web:
	cd infra && docker compose --env-file ./.env.docker up --build -d web

all:
	cd infra && docker compose --env-file ./.env.docker up --build -d db adminer swagger app web


caddy:
	cd infra && docker compose --env-file ./.env.docker up -d caddy


caddy:
	cd infra && docker compose --env-file ./.env.docker up -d caddy
