# Agent Workflow

## Purpose

This document defines how the human, ChatGPT agents, and Cursor collaborate on
Seven-Part Pact application development.

The objective is to minimize total project effort while preserving correctness,
state safety, recoverability, and useful project context.

The implementation worker is **Cursor**. Bolt is no longer the normal
implementation workflow and should not be used unless the human explicitly
requests it as a fallback or comparison.

## Roles

### Human

The human is the final authority over:

- product goals;
- rules interpretations;
- scope and tradeoffs;
- sensitive operations;
- production access;
- final merge/release decisions.

The human may perform trivial edits directly when delegation would cost more
than the edit.

### Master Agent

The Master Agent is long-lived and intentionally lightweight.

The Master owns:

- roadmap and milestone boundaries;
- settled architecture;
- workstream decomposition;
- cross-workstream dependencies;
- major design decisions;
- risk assessment;
- deciding when a Workstream or Specialist is warranted;
- preserving significant product decisions beyond temporary chats.

The Master normally does **not** direct Cursor through detailed implementation
or debug source-level problems. That belongs to the active Workstream.

#### Product / Design Idea Inbox

The Master is the default destination for unstructured product ideas, design
preferences, rules intuitions, future possibilities, and concerns.

The human should not need to decide which temporary agent owns an idea before
discussing it.

When the human raises an idea, the Master should:

- discuss and clarify it as useful;
- distinguish a settled preference from a hypothesis, possibility, or question;
- decide whether it affects current work;
- determine whether it should become a durable project principle or decision;
- route research to a Specialist when warranted;
- route implementation to the current or a future Workstream;
- preserve useful ideas without forcing them prematurely into active scope.

### Workstream Agent

A Workstream Agent is temporary and owns one bounded body of design and
implementation work from detailed design through implementation, review,
testing, and handoff.

The Workstream normally:

- inspects the actual repository and authoritative game sources;
- produces a design checkpoint when the work requires one;
- directs Cursor;
- reviews Cursor's actual source/diff rather than trusting its report alone;
- runs or requests proportionate verification;
- escalates when required;
- returns a compressed `MASTER AGENT HANDOFF` when complete.

Normally only one implementation Workstream should be active at a time.
Read-only design/research Workstreams or Specialists may overlap when doing so
safely reduces wall-clock time.

### Specialist Agent

A Specialist Agent is temporary and generally read-only.

Specialists perform focused:

- rules/source research;
- architecture review;
- adversarial review;
- persistence/recovery analysis;
- product or domain surveys.

Specialists normally do not implement and do not direct Cursor.

### Cursor

Cursor is the primary implementation worker.

Cursor works under Workstream direction and may, when explicitly instructed:

- inspect the local repository;
- create or switch Git branches;
- edit source;
- run tests/builds/checks;
- inspect diffs;
- commit and push coherent checkpoints.

Cursor is not the product or architecture authority. A Cursor completion report
is not proof that an implementation is correct.

## ChatGPT Agent Mode Selection

Whenever one ChatGPT agent gives the human a prompt intended to start or
continue another ChatGPT project agent, it must state the recommended ChatGPT
mode **outside the prompt**.

Use this exact project shorthand:

```text
CHATGPT MODE: STANDARD
```

or:

```text
CHATGPT MODE: PRO
Reason: <one concise reason>
```

`STANDARD` is the default.

Use `PRO` sparingly and only when deeper reasoning is likely to materially
reduce risk or rework, for example:

- difficult cross-cutting architecture;
- persistence/recovery/concurrency design with high corruption risk;
- data migration design or review;
- especially difficult rules conflicts spanning many sources;
- hard bugs whose cause is unclear and expensive to misdiagnose;
- high-stakes adversarial review where the normal model is plausibly not enough.

Do **not** recommend Pro merely because a task is important, large, or tedious.
Routine Master discussion, ordinary Workstream design, bounded implementation
review, and most Specialist research should use STANDARD.

If Pro is unavailable, use the strongest available standard ChatGPT
configuration rather than blocking the task.

## Communication and Handoffs

The normal flow is:

```text
Master
  -> Workstream or Specialist charter
  -> human starts the temporary ChatGPT agent
  -> temporary agent performs the work
  -> Workstream directs Cursor when implementation is needed
  -> temporary agent returns MASTER AGENT HANDOFF
  -> human returns that handoff to Master
```

Do not routinely return entire transcripts to the Master.

Preserve decisions, current repository state, open questions, and the next
exact action.

## Cursor Configuration — Mandatory With Cursor Prompts

Whenever a ChatGPT Workstream gives the human a Cursor prompt, it must first
show the requested Cursor configuration **outside the prompt**.

Use this template and do not omit fields merely because the default seems
obvious:

```text
CURSOR CONFIG
Agent: <short task/agent name>
Reuse: NEW AGENT | REUSE CURRENT AGENT
Surface: Agents Window
Environment: Local
Mode: Agent
Model: <model>
Effort: <level or N/A if unavailable>
Context: <selected context-window setting>
Max Mode: ON | OFF
Fast Mode: ON | OFF
Auto: ON | OFF
Execution: <execution/review mode, normally Auto-review>
```

If Cursor's UI renames one of these controls, use the current exact UI label
while preserving the same information.

### New Cursor Agent vs Reuse

Use `NEW AGENT` when:

- beginning a new Workstream;
- entering a new Domain or major execution body whose prior context would add
  more search baggage than value;
- current context is heavily saturated;
- prior investigation has become broad, stale, or misleading;
- moving from one major architecture/design phase into an unrelated one.

Use `REUSE CURRENT AGENT` when:

- continuing the same implementation slice;
- reviewing or correcting the immediately preceding Cursor work;
- running focused verification for work the agent just implemented;
- making bounded fixes where existing inspected context is valuable.

Cursor has no project `/clear` workflow. Start a **new agent** when fresh
context is warranted.

Do not reuse an agent merely because it is technically still available, and do
not start a new Cursor agent reflexively between tiny related fixes.

## Cursor Model Guidance

Model selection should match task risk and complexity.

### Preferred default for foundational work

For structural Domain work, CampaignState changes, cross-Domain modeling,
complex validators, broad command integration, or difficult correctness work,
the current preferred starting point is typically:

```text
Model: Grok 4.6
Effort: High
Context: Standard
Max Mode: OFF
Fast Mode: OFF
Auto: OFF
```

Increase context or enable Max Mode only when there is a concrete reason.

### UI and bounded implementation

For routine or moderately complex UI work, presentation passes, and bounded
implementation with settled state/architecture, **Composer 2.5** is often a
good cost-effective choice.

Use Grok 4.6 with High effort instead when UI work is tightly coupled to complex
state, subtle rules, or difficult cross-component behavior.

### Frontier Anthropic / OpenAI models

Anthropic and OpenAI frontier models are acceptable when there is a concrete
benefit, for example:

- unusually difficult architecture;
- high-risk code review;
- hard debugging after cheaper models have failed;
- subtle correctness problems where an independent stronger model materially
  improves confidence.

They are more expensive and should not be the routine default.

### Chinese model families

Do not choose Chinese model families by default for this project.

Use one only when:

- the human explicitly requests it; or
- preferred models are inadequate/unavailable and there is a concrete reason
  the alternative is likely to help.

If recommending one, state the reason explicitly.

## Cursor Budget / Pro-Pool Discipline

Treat Cursor's paid usage as two practical project budget pools:

1. the Grok / Composer pool;
2. the other-model pool, including more expensive frontier-model usage.

The Grok / Composer pool may spill into the second pool when exhausted.
Therefore:

- prefer Grok/Composer when they are adequate for the task;
- preserve the other-model pool for work that benefits materially from it;
- do not burn tokens merely because Cursor is cheaper than the former Bolt
  workflow;
- do not choose a weaker model or skip verification merely to conserve budget.

Optimize **total effort and reliability**, not the token count of one turn.

## Cursor Context / Max / Fast / Auto Discipline

### Context

`Context: Standard` is the normal default.

Use a larger context only when the task genuinely needs simultaneous access to
a broader set of source/repository material and splitting the task would make
reasoning worse.

Do not use a giant context window as a substitute for a focused prompt.

### Max Mode

`Max Mode: OFF` is the normal default.

Enable Max Mode only when its additional context/reasoning capacity has a
concrete benefit, especially for high-risk cross-cutting work that cannot be
safely decomposed further.

Max Mode should not be enabled merely because a task is long-running.

### Fast Mode

`Fast Mode: OFF` is the normal default for implementation.

Fast Mode may be used for low-risk, well-bounded work when latency matters and
quality is unlikely to suffer materially.

Do not use Fast Mode for:

- migrations;
- recovery;
- concurrency;
- campaign-state corruption investigation;
- difficult unresolved rules interpretation;
- broad cross-cutting architecture.

For ordinary structural Domain work with a settled contract, Fast Mode may be
considered when the Workstream has tightly bounded repository search space and
verification. The decision should be explicit rather than habitual.

### Auto

`Auto: OFF` is the normal default because this project deliberately chooses a
model appropriate to the task and its budget pool.

Use Auto only when the Workstream has a concrete reason to delegate model
selection to Cursor and the task is low-risk enough that model choice is not
important to correctness or budget planning.

## Branch and Repository Coordination

Before repository-writing implementation begins, the Master or Workstream must
state:

- whether a new branch is required;
- the base branch;
- the intended branch name;
- when branch creation should occur.

Implementation should normally use a dedicated feature/workstream branch.
Read-only Specialist work and discussion-only design do not require a branch.

Cursor may perform safe branch setup itself when directed.
The human should not be required to perform routine Git operations manually
solely because the old Bolt workflow required it.

The local Git checkout and GitHub remain authoritative for repository state.
Before material writes, and again at meaningful checkpoints, verify as
appropriate:

- current branch;
- clean/expected status;
- `HEAD`;
- intended base;
- diff;
- pushed checkpoint SHA.

Do not trust an implementation report over the actual repository state.

Before PR/merge, inspect the real diff and verify the final checkpoint.

## Workstream Escalation

A Workstream must stop and escalate before:

- materially changing settled architecture;
- materially expanding or changing milestone scope;
- CampaignState schema evolution or a data migration not already approved;
- changing Undo/Redo, backup, checkpoint, recovery, or audit semantics;
- weakening an established invariant;
- making a substantial unresolved game-rules interpretation;
- choosing an expensive-to-reverse technology;
- introducing production credentials/access;
- discovering material campaign-state corruption risk;
- introducing a new shared cross-Domain subsystem not already approved.

Routine implementation decisions, bounded test fixes, refactors within the
approved design, and ordinary bugs do not require Master escalation.

## Structural Domain Work — Default Operating Pattern

M5.2E confirmed that a new Seven-Part-Pact Domain structural foundation is
most efficient when it is treated as one coherent representability body rather
than a serial list of gameplay commands.

Unless a concrete dependency requires otherwise, a structural Domain pass
should cover:

- source/static catalogs needed for state;
- persisted Domain state/types;
- CampaignState integration;
- Domain-local and shared-reference integrity;
- representative deterministic tests;
- one meaningful closure gate.

The structural-closure question is:

> Can authoritative CampaignState faithfully represent a meaningful
> normal-play snapshot of this Domain, including durable consequences and
> stable references?

A missing gameplay command is not automatically a missing structural field.

### Representability vs Automation

Keep these concerns explicit and separate:

1. state representability;
2. minimum manual/semantic operability;
3. automated monthly/rules procedures;
4. UI/presentation.

Do not require broad gameplay automation to declare a structural foundation
complete.

If the milestone also requires basic usability, first close the structural
contract, then define one bounded minimum-operability command surface, then
basic UI. Do not discover every Codex action serially unless that automation
was explicitly chartered.

## Cursor Search-Space Discipline

Implementation prompts should bound repository search space, not merely be
short.

Prefer instructions such as:

> Start with these files. Follow imports only when a concrete compiler error or
> focused failing test requires it.

Avoid speculative repository-wide instructions such as:

- audit every consumer;
- find all assumptions;
- grep every use;
- prove all possible impacts.

For a changed union/type:

1. make the approved change;
2. let TypeScript and focused tests identify real affected consumers;
3. inspect those concrete consumers;
4. expand only when evidence requires it.

Unexpected exploration of unrelated Domains/subsystems is a prompt/scope
warning, not automatically productive diligence.

Prompt length is not the main metric. Long prompts can be efficient when their
search topology and responsibility are tightly bounded. Short prompts can be
very expensive when they open an unbounded dependency graph.

Optimize for:

- bounded search topology;
- coherent deliverable;
- explicit exclusions;
- proportionate verification.

## Decompose by Code Dependency

One conceptual game feature may span:

- Domain-local state;
- a shared subsystem;
- UI;
- persistence integration.

Do not force all of those into one Cursor task merely because they correspond
to one game-rule concept.

If one portion has a broad dependency graph while another is local, use
separate coherent execution passes.

A shared-subsystem correction should not drag unrelated Domain-local work into
the same Cursor request, and vice versa.

## Testing / Validation Calibration

For ordinary structural Domain work:

- test distinct important contracts;
- use representative malformed/reference failures;
- parameterize closely related variants;
- avoid exhaustive malformed-state matrices unless corruption risk actually
  requires them.

Before adding a test, ask:

> What distinct regression would this catch that existing tests do not?

Do not repeatedly re-prove generic snapshot/Undo/Redo/backup/audit/idempotency
machinery when a change does not alter that machinery.

For a known bounded bug:

- add one or a few focused RED -> GREEN regressions;
- run affected tests;
- run build/typecheck as appropriate;
- run `git diff --check`.

Do not rerun the complete repository gate after every micro-fix if a meaningful
parent checkpoint already ran it and the new blast radius is narrow.

The safety exception remains: persistence architecture, migrations, recovery,
concurrency, schema evolution, and corruption-sensitive changes receive
stronger verification.

## Meaningful Full Gates

Use focused tests while iterating.

Run the complete repository gate at meaningful Domain/phase/Workstream closure
boundaries and when a checkpoint's blast radius independently justifies it.

Manual/integration tests should prove only unique boundaries automated tests
cannot fully establish, such as:

- actual Convex serialization;
- true concurrency;
- browser file download/upload;
- environment/deployment wiring;
- realistic migrations;
- realtime/refresh behavior.

Do not manually replay large deterministic matrices.

## Current-V5 Test Fixture Guidance

M5.2E added the test-only helper:

```ts
makeTestCampaignStateV5(
  overrides?: Partial<CampaignStateV5>
): CampaignStateV5
```

It starts from `initialCampaignState()` and shallow-spreads top-level
overrides.

Ordinary tests that need "an otherwise valid current V5 state" should prefer
this helper or its established current equivalent.

Tests whose purpose is exact schema/version/malformed serialization should
remain explicit.

Do not create a generic multi-version fixture framework merely to reduce
typing.

## Runtime / Context as Diagnostic Signal

Do not establish hard Cursor time limits, because legitimate foundational work
can take time.

But treat these as warning signs when the claimed task is small:

- very high Standard-context consumption;
- hour-plus runtime for a genuinely bounded micro-fix;
- repeated exploration of unrelated Domains/subsystems;
- test setup dominating the feature change;
- a nominally local task consuming most of the context window.

When these appear, reassess prompt scope, agent saturation, and task
decomposition before concluding that more context/testing is inherently
necessary.

M5.2E demonstrated that coherent Domain structural passes can complete much
faster than heavily micro-sliced or repository-wide audit tasks.

## AI Resource Discipline

AI context and Cursor usage are project resources.

The goal is not minimum token usage. The goal is minimum **total effort** while
preserving quality and safety.

### Context discipline

Do not ask Cursor to reread the entire repository by default.

Prefer:

- targeted relevant files;
- explicit approved invariants;
- concise summaries of prior checkpoints;
- repository docs that are actually relevant;
- existing agent context when it remains useful.

A good implementation prompt should identify:

- objective;
- approved design;
- relevant files/patterns;
- scope;
- exclusions;
- verification;
- stop/escalation conditions.

Then stop.

### Request sizing

Do not combine broad repository discovery, architecture design, implementation,
full testing, documentation, and final review into one enormous Cursor request.

For material work, use coherent sequential passes/checkpoints.

When a later pass depends on earlier work, summarize the relevant result and
point Cursor at the changed files rather than repeating the full original
prompt.

If a request becomes too broad, split it. Do not respond by weakening
verification or omitting safety invariants.

### Iteration

If Cursor reports a problem:

- distinguish a real architecture/scope issue from a routine implementation
  bug;
- keep routine corrections in the same useful Cursor context;
- escalate/replan only when the problem changes the approved design or risk
  boundary.

Avoid restarting broad audits merely because a bounded implementation needed a
small correction.

### Reports

Ask Cursor for concise reports focused on:

- files changed;
- important implementation decisions;
- tests/build/check results;
- branch/checkpoint SHA when applicable;
- deviations;
- unresolved issues.

Do not ask Cursor to retell its entire process unless that process itself is
needed for a decision.

## Review

Review effort is proportional to blast radius.

Implementation reports are not authoritative. Repository state is.

For material changes:

- inspect the actual source/diff;
- verify relevant state invariants;
- check tests proportionally;
- verify branch and checkpoint identity.

Do not perform ceremonial review of every trivial edit.

## Testing

Automate deterministic behavior.

Use focused tests during implementation.

Run the complete repository gate at meaningful closure boundaries and when a
checkpoint's blast radius justifies it, not after every small edit.

Manual tests are for integration boundaries automated tests cannot fully prove,
for example:

- actual Convex persistence/serialization;
- true concurrency;
- browser file download/upload;
- environment/deployment wiring;
- migrations against realistic disposable/cloned data;
- realtime/refresh behavior.

Do not manually replay large deterministic matrices.

Use the smallest manual test that proves the unique integration boundary.

## State-Safety Exception

Never conserve tokens or wall-clock time by weakening verification around:

- persisted campaign state;
- migrations;
- backup/recovery;
- concurrency;
- schema evolution;
- corruption handling.

Campaign state loss/corruption remains the application's highest technical risk.

## Secrets / Environments

Never put production credentials into Cursor prompts or ChatGPT handoffs.

Never intentionally use valuable production campaign data as an experimentation
environment.

Rehearse risky persistence work on disposable or cloned deployments first.

Consult current repository architecture/recovery/environment documentation
before persistence-sensitive work.

## Trivial Human Edits

Do not delegate trivial changes when the human can make them faster with
essentially no risk, such as:

- an obvious one-line ignore/config change;
- a typo;
- a single clearly identified documentation correction.

This does not mean the human should manually perform routine implementation or
Git orchestration that Cursor can safely own.

## ChatGPT Context-Limit / Recovery Discipline

ChatGPT conversation limits can arrive without a useful remaining-context
indicator. Context preservation is therefore an operational requirement.

Master, Workstream, and Specialist agents should:

- keep important decisions out of sprawling transient discussion where
  practical;
- produce concise state summaries at major boundaries;
- avoid forcing the human to reconstruct already-settled context;
- proactively provide a copyable recovery handoff when a long chat is becoming
  risky;
- include the latest branch, SHA, decisions, unresolved issues, and next exact
  action in that handoff.

Do not wait for a visible context-limit warning; one may not exist.

Cursor context is handled differently: start a **new Cursor agent** at a
meaningful context boundary rather than looking for `/clear`.

## Standard Master Handoff

Every Workstream/Specialist completion report should contain:

```text
MASTER AGENT HANDOFF

Workstream:
Status:

Delivered / Findings:

Important decisions:

Evidence / source basis:

Persistence or architecture impact:

Testing / verification:

Repository status, if applicable:

Open issues / uncertainties:

Decisions required from Master/user:

Recommended next action:
```

For long implementation Workstreams, use intermediate checkpoint reports as
needed so that a clean, reviewable SHA and the next action are recoverable even
before final completion.
