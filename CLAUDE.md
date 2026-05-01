# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Dynamic forms platform — a NestJS API for creating forms with conditional logic (rules), composing forms into flows, and collecting submissions via flow runs. 

## Architecture

```
api/src/
  app.module.ts            # root module, TypeORM config (env vars with localhost defaults)
  builder/
    entities/              # Form, Question, Flow, FlowForm, Rule
    dto/                   # request DTOs (class-validator), response DTOs (plain shapes)
    forms.repository.ts    # Form/Question persistence (soft-deletes rules on question removal)
    forms.service.ts       # form domain logic, no TypeORM imports
    forms.controller.ts    # /forms validation, response mapping
    flows.repository.ts    # Flow/FlowForm/Rule persistence
    flows.service.ts       # flow domain logic, rule validation
    flows.controller.ts    # /flows validation, response mapping
    builder.module.ts
  submissions/
    entities/              # FlowRun, Submission, Answer
    dto/
    flow-runs.repository.ts    # FlowRun + Submission persistence
    flow-runs.service.ts       # orchestration: rule evaluation, state, submissions
    flow-runs.controller.ts    # /flow-runs
    rule-engine.ts             # pure function: evaluateRules
    submissions.module.ts
```

### Module dependencies

```
builder/        — Form, Question, Flow, FlowForm, Rule CRUD    depends on: —
submissions/    — FlowRun lifecycle, submissions                depends on: Builder
```

### Layering: Controller -> Service -> Repository

**Controller** — HTTP boundary
- Receives validated DTOs via `@Body()` (class-validator + `ValidationPipe`)
- Maps entities to response DTOs (plain shape objects, no methods)
- No business logic, no TypeORM imports

**Service** — Domain logic
- Orchestrates business rules (e.g. diff questions, determine soft-deletes)
- Depends on repository interface via `@Inject(SYMBOL)`, never on TypeORM directly
- Throws NestJS HTTP exceptions (`NotFoundException`, etc.)
- Accepts/returns entity types, not DTOs

**Repository** — Persistence
- Single file: interface + TypeORM implementation (e.g. `forms.repository.ts`)
- Wraps all TypeORM access (find, save, softRemove, transactions)
- Interface exported as symbol token for DI (e.g. `FORMS_REPOSITORY`)
- Owns transactional boundaries (e.g. `update` soft-deletes old questions + saves form atomically via `DataSource.transaction`)
- No knowledge of services or controllers

### DTOs
- **Request DTOs** — class-validator decorators, `@Type()` for nested validation, `whitelist: true` strips unknown fields
- **Response DTOs** — pure shape classes, no methods or mapping logic (will be shared with FE)
- **Mapping** lives in controllers, not in DTOs

### Flow runs
- A `FlowRun` models a user's session through a flow (id, flowId, username, status, startedAt, completedAt)
- Every `Submission` belongs to a FlowRun (NOT NULL FK) — no standalone submissions
- Routes: `POST /flow-runs`, `POST /flow-runs/:runId/submissions`, `GET /flow-runs/:runId/state`
- Rule engine evaluates conditional logic to determine enabled questions per form

### Testing
- Integration tests against real Postgres (`dynamic_forms_test` database in the same container)
- Tests hit the TypeORM implementation directly, no mocks
- No `afterEach` cleanup — tests are additive; use IDs not names for assertions

### Conventions
- Soft delete everywhere (`@DeleteDateColumn` on Form, Question, Flow, Rule)
- Form update: soft-delete changed/removed questions, soft-delete rules referencing them, create new questions (snapshot approach)
- Module wires repository via `{ provide: SYMBOL, useClass: TypeOrmImpl }`
