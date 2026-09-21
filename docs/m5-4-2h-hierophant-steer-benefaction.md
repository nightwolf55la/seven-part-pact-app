# M5.4-2H — Hierophant Steer Time, atomic Steer, and Benefaction

**Status:** COMPLETE / READY FOR MERGE. Real Convex cloud Preview integration succeeded on disposable preview `cursor/hierophant-steer-time-2bde` (`perceptive-guineapig-864`). Not all of M5.4 complete. Not V5-activated. Doctrine/Sermon, Cult departure, Hestar Provide, and general Hierophant polish remain later work.

**Workstream boundary:** close the Hierophant UX/operability semantic sequence after Visions V1 and Hestar transfer by making Time scheduled on a particular Supplicant representable, then delivering atomic Steer and explicit Benefaction & Depart.

## Approved foundation

Master-approved in-place PRE-ACTIVATION V5 evolution. The existing `TimeDestination` discriminated union gains one concrete Hierophant target:

```ts
{ kind: "hierophant_supplicant", denizenId: DenizenId }
```

Scheduling requires `denizenId` to identify a current Hierophant Supplicant. Persisted CampaignState remains valid if that person later ceases to be a current Supplicant; later inapplicability is not structural invalidity.

Rejected remain rejected: arbitrary pending `allocationId`; "exactly one pending Domain Time"; note/free-text matching; V6; migration/shims for earlier disposable V5 shapes; silent rewrite of persisted state; a generic `domain_target` framework; speculative typed targets for other Domains.

Ordinary Planning/Story scheduling UI can select **Hierophant Supplicant**. Advanced/Correct is not the only authoring path.

## Atomic Steer

`steerHierophantSupplicant` spends one pending allocation whose destination is exactly `{ kind: "hierophant_supplicant", denizenId }` for the steered person, moves that Supplicant to the requested Temple (including Hestar), and removes 1 Woe in one canonical command/event/revision/snapshot.

Woe 1 → 0 may persist. Steer does not automatically invoke Benefaction & Depart.

If no matching Time is scheduled, the board tells the player to schedule Time on this Supplicant. Multiple equivalent weeks owned by the same wizard use first matching pending allocation in participant-then-allocation order; different wizards require an explicit week choice.

## Benefaction & Depart

`departHierophantSupplicantWithBenefaction` is a separate explicit operation for a current Temple-hosted Supplicant at Woe 0 with a builtin class. It grants the class Benefaction to the current host Temple and removes the Supplicant role (the person remains). Custom class and Cult-hosted Woe 0 are rejected. Reliable Prophet +1 remains unsettled and is not auto-applied.

## Real Convex cloud Preview

This is **real Convex cloud Preview integration**, not a Development deployment and not Production.

- Convex cloud deployment type: **preview**
- Preview name: `cursor/hierophant-steer-time-2bde`
- Live deployment slug: `perceptive-guineapig-864` (`https://perceptive-guineapig-864.convex.cloud`)
- Deploy key kind verified as `preview:self-1859c:convex-camel-jacket` before writes. `CONVEX_DEPLOY_KEY` was process-local from `CONVEX_PREVIEW_DEPLOY_KEY`. Dry-run: "Would have claimed preview deployment for `cursor/hierophant-steer-time-2bde`".
- Disposable campaign `cmp_2f8ab9f4-f8cd-4c7e-b70b-f4a1cc1f2953`, Hierophant-present / other seats silent, revision **0 → 36**.
- Invalid schedule of `{ kind: "hierophant_supplicant", denizenId }` for a non-Supplicant rejected (`Hierophant Supplicant destination does not resolve`).
- Valid schedule of allocation `alc_46e0c7f5-0015-4ad7-bc8b-49fe2ddb63aa` onto Supplicant `den_fcc3e043-4851-4e42-aaea-806423fd88e3` ("Ann of Krolis"); Planning and `getHierophantReference.steerTime` read back `{ kind: "hierophant_supplicant", denizenId }` pending.
- Atomic Steer Krolis courtyard / Woe 1 → Ushin agiary / Woe 0; allocation spent; person remains a Supplicant; Activity: `Steered Supplicant "Ann of Krolis"`.
- Idempotent replay of the same Steer command ID stayed at revision 31. Stale expectedRevision 30 rejected.
- `verifyMigration:verifyMigration` valid at revision 30 (scheduled) and 31 (steered) and 36 (final).
- Undo restored Krolis / Woe 1 / pending Time; Redo restored Ushin / Woe 0 / spent Time.
- Portable backup export of the scheduled destination, then of the steered snapshot; Undo followed by `importPortableBackup` restored steered Ushin / Woe 0.
- Explicit Benefaction & Depart: Supplicant role removed; Ushin Abundance 5 → 9 (Gentry +4); Krolis unchanged; Activity: `Departed Supplicant "Ann of Krolis" with Benefaction`.
- **Production not used.** No V6. No migration. Persistence/recovery semantics unchanged.

## Deliberately not in this close

- Doctrine / Sermon
- Cult departure (unresolved Cult semantics)
- Hestar Provide
- general Hierophant polish
- later Hierophant UX-refinement (start from post-merge `main`)

Do not mark all of M5.4 complete. CampaignState V5 remains PRE-ACTIVATION.
