# M5: Wizard Character Foundation

## CampaignState V4

- M5.1 introduces CampaignState V4 as the sole supported current and historical baseline.
- CampaignState V3 retains its historical TypeScript meaning but is not runtime-supported. `validateAnyCampaignState` rejects V1/V2/V3.
- There is no V3 → V4 semantic migration.
- This was an explicitly human-approved destructive **pre-release** compatibility retirement: all pre-session V3 campaign data was disposable.
- This exception is **not** precedent for future valuable campaign data. Once the first real V4 campaign is created, normal compatibility-preservation expectations resume.
- Existing Convex deployments/environments are retained; do not recreate them.
- V4-only validators must not be deployed while campaign-owned V3 records remain in a given environment.
- For this approved disposable pre-release V3-to-V4 cutover, the human explicitly waived an operational export; this does not change the normal future recovery policy for valuable campaigns.

## Wizard character shape

Every modeled V4 Wizard carries a required `character` field with the following sub-fields:

| Field | Type | Notes |
|---|---|---|
| `elements` | `{ air, fire, earth, water }` or `null` | Safe integers. **May be negative.** Total 8 is normal Draft-4 creation guidance, not a structural invariant. |
| `pactFragmentPersonalForm` | `string \| null` | Free text describing the Wizard's personal form of the Pact Fragment. |
| `familiarDescription` | `string \| null` | Free text. No `FamiliarId` or entity is introduced at this time. |
| `ageYears` | `number \| null` | Whole-year age, manually editable. M5.1 adds no automatic aging or month coupling. |
| `publicChangesOfMagic` | `string[]` | Shared/public only. Does not claim to model secret Changes of Magic. |
| `importantNotes` | `string \| null` | The printed Wizard-sheet "Important Notes" concept (shared/public), not generic Notes or Lore. |
| `companionDescriptions` | `{ air, fire, earth, water }` (each `string \| null`) | Interim Wizard-sheet Companion descriptions keyed by Element. These are **not** the complete future Denizen/Companion entity model; they record only what appears on the character sheet today. A later schema evolution may replace or link these descriptions to modeled Denizens. |

Design decisions:

- Character answers may be incomplete (`null`). New Wizards receive the blank character object (`BLANK_WIZARD_CHARACTER`).
- Do not invent `0/0/0/0` Elements for unset characters; use `null`.
- Pronouns are static/derived and not persisted.
- `companionDescriptions` uses whole-object replacement, not per-element partial patching.

## Persistence

### Command and event

```
Command:  update_wizard_character
Event:    wizard_character_updated v1
```

- The client sends intent (wizard ID + patch), not a resulting `CampaignState`.
- The server normalizes the patch and computes the authoritative result.
- Accepted edits go through the canonical commit path.
- Normal idempotency and fingerprint machinery applies.
- No global revision CAS is required for character edits.
- The accepted logical revision receives its event and a complete snapshot.

### Activity history

An accepted character edit is described as **"Updated wizard character"** in the activity feed.

### Recovery

Generic Undo/Redo, checkpoint, backup, and equality machinery carries V4 character state without Wizard-specific recovery mechanisms. The `statesDeepEqual` canonical-JSON comparison automatically covers all character fields.
