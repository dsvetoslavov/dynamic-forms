# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Dynamic forms platform — a NestJS API for creating forms with conditional logic (rules), composing forms into flows, and collecting submissions. 

## Architecture

```
api/src/
  app.module.ts          # root module, TypeORM config (env vars with localhost defaults)
  forms/
    entities/            # Form, Question (enum QuestionType), Rule
    forms.module.ts
    forms.service.ts     # CRUD + rule management
    forms.controller.ts  # /forms, /forms/:id, /forms/:formId/rules
  submissions/
    entities/            # Submission, Answer
    submissions.module.ts
    submissions.service.ts
    submissions.controller.ts  # /submissions
```
