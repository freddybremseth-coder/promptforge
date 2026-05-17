import type { Preset } from './types'

export const pythonFastapiPostgres: Preset = {
  id: 'python-fastapi-postgres',
  name: 'Python + FastAPI + Postgres',
  tagline: 'Typed APIer med FastAPI, Pydantic v2, SQLAlchemy 2.0 og Alembic-migrasjoner.',
  defaultConventions: [
    'MUST type every function with Pydantic models or type hints',
    'MUST write Alembic migrations for every schema change — no autogenerate-only commits',
    'MUST run pytest before push, fixtures in conftest.py',
    'MUST NOT commit a virtualenv or .env',
    'SHOULD pin dependencies via uv or pip-tools, never bare requirements.txt',
    'SHOULD use async endpoints when calling external IO',
  ],
  stackContext: `Stack details for the planner and renderer:
- Python 3.12, FastAPI with dependency injection via Depends()
- SQLAlchemy 2.0 async session, Alembic for migrations
- Pydantic v2 for request/response models and settings
- Docker Compose for local Postgres + the app
- pytest + httpx for endpoint tests, factory-boy or fixtures for data
- Ruff + mypy for lint/type checks

Conventions the team already follows:
- App layout: src/<package>/{api,models,services,db}/
- One Alembic revision per logical schema change
- Settings in src/<package>/config.py using pydantic-settings
- Routers grouped by domain, mounted from src/<package>/api/__init__.py`,
  skillBlueprints: [
    'fastapi-endpoint',
    'alembic-migration',
    'docker-compose',
    'pytest-fixture',
  ],
}
