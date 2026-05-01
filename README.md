# Dynamic Forms

A platform for creating forms, composing them into multi-step flows and conditional logic, and collecting submissions. Users define questions, wire up rules that show/hide fields based on answers, and guide respondents through ordered form sequences.

> **Prototype** — this is an exploratory project, not a production-ready application. There is no auth and error handling is minimal.

## Running the project

### With Docker (recommended)

```bash
docker-compose up
```

This starts three services:

| Service | Port | Description |
|---------|------|-------------|
| db | 5432 | PostgreSQL 18 |
| api | 3000 | NestJS backend |
| web | 4200 | Angular frontend (Nginx) |

### Without Docker

Prerequisites: Node 24+, PostgreSQL 18 with a `dynamic_forms` database.

```bash
# 1. Start Postgres and create the database
createdb dynamic_forms

# 2. API
cd api
npm install
npm run start:dev          # http://localhost:3000

# 3. Web
cd web
npm install
npx ng serve               # http://localhost:4200
```

The API reads `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE` from the environment, defaulting to `localhost:5432/dynamic_forms` with `postgres`/`postgres` credentials.

## Data model

```mermaid
erDiagram
    FORM ||--o{ QUESTION : contains
    FLOW ||--o{ FLOW_FORM : "ordered forms"
    FLOW ||--o{ RULE : "conditional logic"
    FLOW ||--o{ FLOW_RUN : sessions
    FLOW_FORM }o--|| FORM : references
    RULE }o--|| QUESTION : "source question"
    RULE }o--|| QUESTION : "target question
    FLOW_RUN ||--o{ SUBMISSION : collects
    SUBMISSION }o--|| FORM : "for form"
    SUBMISSION ||--o{ ANSWER : contains
    ANSWER }o--|| QUESTION : "answers"

    FORM {
        uuid id PK
        string name
        string description
        timestamp createdAt
        timestamp updatedAt
        timestamp deletedAt
    }

    QUESTION {
        uuid id PK
        uuid formId FK
        enum type "TEXT | YES_NO | SELECT | MULTI_SELECT | NUMBER"
        string label
        int order
        jsonb config
        timestamp createdAt
        timestamp deletedAt
 w    }

    FLOW {
        uuid id PK
        string name
        string description
        timestamp createdAt
        timestamp updatedAt
        timestamp deletedAt
    }

    FLOW_FORM {
        uuid flowId PK_FK
        uuid formId PK_FK
        int order
    }

    RULE {
        uuid id PK
        uuid flowId FK
        uuid sourceQuestionId FK
        string triggerValue
        uuid targetQuestionId FK
        timestamp createdAt
        timestamp updatedAt
        timestamp deletedAt
    }

    FLOW_RUN {
        uuid id PK
        uuid flowId FK
        string username
        string status
        timestamp startedAt
        timestamp completedAt
    }

    SUBMISSION {
        uuid id PK
        uuid formId FK
        uuid flowRunId FK
        timestamp submittedAt
    }

    ANSWER {
        uuid id PK
        uuid submissionId FK
        uuid questionId FK
        text value
    }
```

## Architecture

**Tech stack:** NestJS 11 / TypeORM / PostgreSQL (API) — Angular 21 (Web)

### Module structure

```
forms/          Form, Question, Flow, FlowForm, Rule CRUD    depends on: —
flow-runs/      FlowRun lifecycle, submissions                depends on: Forms
```

### Layering

Each module follows **Controller → Service → Repository**:

- **Controller** — HTTP boundary. Validates input via class-validator DTOs, maps entities to response DTOs. No business logic.
- **Service** — Domain logic. Orchestrates business rules (rule evaluation, diff-based question updates). Depends on repository interfaces, never on TypeORM directly.
- **Repository** — Persistence. Wraps all TypeORM access behind an interface injected via a symbol token. 

