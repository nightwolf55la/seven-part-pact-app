# Environments

**Status:** Accepted  
**Applies Beginning With:** Milestone 2G Phase 2

This documents the intended environment model for Seven-Part Pact development,
preview, and production.

---

## Environment Roles

### Bolt

- AI development workbench.
- Source editing, automated testing, local build verification.
- No production credentials. No production Convex deploy keys.

### GitHub

- Canonical source control.
- Protected `main` branch.
- Feature branch / pull request workflow.
- No force-push or bypass of branch protection.

### Convex

- Disposable / fresh dev deployments for risky tests and rehearsal.
- Dedicated real dev deployment for ongoing development.
- Preview deployment isolated from Production.
- Production deployment separate and protected.
- Development, Preview, and Production deployments must remain isolated from
  one another.

### Vercel

- Preview and Production environments.
- Convex deploy keys scoped separately by environment.
- Vercel Preview must not share the production Convex backend.

---

## Practical Rules

- Never paste a production Convex deploy key into Bolt.
- Never point disposable or local testing at production intentionally.
- Before running a command with `--deployment`, visually verify its target.
- Before dangerous persistence work, take a Convex operational export.
- Rehearse migrations and recovery on disposable clones first.
- `npx convex deploy` is deployment-affecting and should only run through an
  intentional environment/deployment flow (e.g. the Vercel build command), not
  ad hoc from Bolt.
- `CONVEX_DEPLOY_KEY` is server/build infrastructure. It must never receive a
  `VITE_` prefix and must never be exposed to browser code.

---

## Secret Hygiene

- Do not commit `.env` files, deploy keys, or tokens to source control.
- Do not embed actual deployment names or keys in permanent architecture docs.
- It is acceptable to mention the dedicated dev deployment by purpose, but
  avoid making ephemeral deployment names part of permanent architecture.
