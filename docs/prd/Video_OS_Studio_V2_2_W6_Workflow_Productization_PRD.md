# Video OS Studio V2.2 W6 — Workflow Productization PRD

## Status

Draft / W6-0 Planning

Base: V2.2 W5 Workflow Runtime Foundation

## Goal

Convert the durable Workflow Runtime into a user-facing video production workflow system.

W5 solved execution reliability:

- durable workflow state
- recovery
- retry
- checkpoints
- runtime ownership

W6 solves usability:

- choose a workflow template
- create a project from a template
- run a guided production pipeline
- review outputs at checkpoints

## Architecture

Template Layer:

WorkflowTemplate
        |
        v
WorkflowDefinition
        |
        v
WorkflowRun
        |
        v
Stages
        |
        v
Jobs

Workflow Runtime remains the execution engine. Templates only describe workflow composition.

## W6 Phases

### W6-0 Workflow Template Architecture

Add template contracts, registry, and validation.

Requirements:

- no Workflow Runtime rewrite
- no Project Schema breaking change
- reuse existing stages and jobs

Initial templates:

1. talking-head
2. product-ad
3. explainer

### W6-1 Template Registry

Provide:

- register(template)
- get(id)
- list()
- validate(template)

### W6-2 Create Project Wizard

User flow:

Create Project
-> Select template
-> Upload media
-> Select output profile
-> Generate Draft

### W6-3 Workflow Dashboard

Expose:

- workflow progress
- stage status
- job status
- checkpoint state
- errors

### W6-4 Review Workspace

Human review UI for:

- visual plan
- scenes
- captions
- timeline

### W6-5 Acceptance

Validate:

- talking head workflow
- product advertisement workflow
- restart/recovery continuity

## Development Rules

REUSE > MODIFY > CREATE

Do not duplicate:

- WorkflowRunner
- Job system
- Recovery logic
- Project transaction system

## Acceptance Criteria

A user can:

1. create a project
2. select a workflow template
3. upload media
4. generate a first draft
5. review workflow stages
6. continue to final render

The existing W5 durability guarantees must remain intact.
