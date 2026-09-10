import type { CampaignStateV5 } from "./campaign-state";
import {
  isValidDenizenId,
  isValidIsleId,
  isValidPlaceId,
  isValidCompanionRelationshipId,
  isValidTreasureId,
  isValidCampaignPowerfulDenizenTaxonomyId,
} from "./ids";
import { DomainError } from "./errors";

export function validateV5WorldReferenceIntegrity(state: CampaignStateV5): void {
  const { world, wizards, lifecycle, pactFragmentOperationalState } = state;

  const denizenIds = new Set<string>();
  for (let i = 0; i < world.denizens.length; i++) {
    const d = world.denizens[i];
    if (!isValidDenizenId(d.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `world.denizens[${i}].denizenId is malformed: "${d.denizenId}"`);
    }
    if (denizenIds.has(d.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate denizenId: ${d.denizenId}`);
    }
    denizenIds.add(d.denizenId);
  }

  const isleIds = new Set<string>();
  for (let i = 0; i < world.isles.length; i++) {
    const isle = world.isles[i];
    if (!isValidIsleId(isle.isleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `world.isles[${i}].isleId is malformed: "${isle.isleId}"`);
    }
    if (isleIds.has(isle.isleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate isleId: ${isle.isleId}`);
    }
    isleIds.add(isle.isleId);
  }

  const placeIds = new Set<string>();
  for (let i = 0; i < world.places.length; i++) {
    const place = world.places[i];
    if (!isValidPlaceId(place.placeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `world.places[${i}].placeId is malformed: "${place.placeId}"`);
    }
    if (placeIds.has(place.placeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate placeId: ${place.placeId}`);
    }
    placeIds.add(place.placeId);

    const p = place.placement;
    if (p.kind === "on_isle") {
      if (!isleIds.has(p.isleId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `world.places[${i}] on_isle placement references nonexistent isle: ${p.isleId}`);
      }
    } else if (p.kind === "mobile" && p.associatedIsleId !== null) {
      if (!isleIds.has(p.associatedIsleId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `world.places[${i}] mobile placement references nonexistent isle: ${p.associatedIsleId}`);
      }
    }
  }

  const companionRelIds = new Set<string>();
  const currentCompanionKeys = new Set<string>();
  const wizardIds = new Set<string>(wizards.map((w) => w.wizardId));

  for (let i = 0; i < world.companionRelationships.length; i++) {
    const cr = world.companionRelationships[i];
    if (!isValidCompanionRelationshipId(cr.companionRelationshipId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `world.companionRelationships[${i}].companionRelationshipId is malformed: "${cr.companionRelationshipId}"`);
    }
    if (companionRelIds.has(cr.companionRelationshipId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate companionRelationshipId: ${cr.companionRelationshipId}`);
    }
    companionRelIds.add(cr.companionRelationshipId);

    if (!wizardIds.has(cr.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `world.companionRelationships[${i}].wizardId references nonexistent wizard: ${cr.wizardId}`);
    }
    if (!denizenIds.has(cr.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `world.companionRelationships[${i}].denizenId references nonexistent denizen: ${cr.denizenId}`);
    }

    if (cr.status === "current") {
      const key = `${cr.wizardId}:${cr.element}`;
      if (currentCompanionKeys.has(key)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Multiple current companion relationships for wizard ${cr.wizardId} element ${cr.element}`);
      }
      currentCompanionKeys.add(key);
    }
  }

  const campaignTaxonomyIds = new Set<string>();
  for (let i = 0; i < world.campaignPowerfulDenizenTaxonomies.length; i++) {
    const taxonomy = world.campaignPowerfulDenizenTaxonomies[i];
    if (!isValidCampaignPowerfulDenizenTaxonomyId(taxonomy.taxonomyId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `world.campaignPowerfulDenizenTaxonomies[${i}].taxonomyId is malformed: "${taxonomy.taxonomyId}"`);
    }
    if (campaignTaxonomyIds.has(taxonomy.taxonomyId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate campaign powerful denizen taxonomyId: ${taxonomy.taxonomyId}`);
    }
    campaignTaxonomyIds.add(taxonomy.taxonomyId);
  }

  for (let i = 0; i < world.denizens.length; i++) {
    const profile = world.denizens[i].powerfulProfile;
    if (profile === null) continue;
    for (let j = 0; j < profile.taxonomies.length; j++) {
      const ref = profile.taxonomies[j];
      if (ref.kind === "campaign" && !campaignTaxonomyIds.has(ref.taxonomyId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `world.denizens[${i}].powerfulProfile.taxonomies[${j}] references nonexistent campaign taxonomy: ${ref.taxonomyId}`,
        );
      }
    }
  }

  const treasureIds = new Set<string>();
  for (let i = 0; i < world.treasures.length; i++) {
    const treasure = world.treasures[i];
    if (!isValidTreasureId(treasure.treasureId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `world.treasures[${i}].treasureId is malformed: "${treasure.treasureId}"`);
    }
    if (treasureIds.has(treasure.treasureId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate treasureId: ${treasure.treasureId}`);
    }
    treasureIds.add(treasure.treasureId);

    const custody = treasure.custody;
    if (custody.kind === "subject") {
      if (custody.subject.kind === "wizard" && !wizardIds.has(custody.subject.wizardId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `world.treasures[${i}].custody.subject.wizardId references nonexistent wizard: ${custody.subject.wizardId}`,
        );
      }
      if (custody.subject.kind === "denizen" && !denizenIds.has(custody.subject.denizenId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `world.treasures[${i}].custody.subject.denizenId references nonexistent denizen: ${custody.subject.denizenId}`,
        );
      }
    }
    if (custody.kind === "place" && !placeIds.has(custody.placeId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `world.treasures[${i}].custody.placeId references nonexistent place: ${custody.placeId}`,
      );
    }
  }

  for (let i = 0; i < wizards.length; i++) {
    const w = wizards[i];
    if (w.homeIsleId !== null && !isleIds.has(w.homeIsleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `wizards[${i}].homeIsleId references nonexistent isle: ${w.homeIsleId}`);
    }
    if (w.sanctumPlaceId !== null && !placeIds.has(w.sanctumPlaceId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `wizards[${i}].sanctumPlaceId references nonexistent place: ${w.sanctumPlaceId}`);
    }
  }

  for (const [seatId, fragment] of Object.entries(pactFragmentOperationalState)) {
    if (fragment.custody.kind === "wizard" && !wizardIds.has(fragment.custody.wizardId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `pactFragmentOperationalState.${seatId}.custody.wizardId references nonexistent wizard: ${fragment.custody.wizardId}`,
      );
    }
  }

  if (lifecycle.kind === "play") {
    for (let i = 0; i < lifecycle.currentMonth.engagements.length; i++) {
      const eng = lifecycle.currentMonth.engagements[i];
      if (eng.target !== null && eng.target.kind === "denizen") {
        if (!denizenIds.has(eng.target.denizenId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `lifecycle.currentMonth.engagements[${i}].target.denizenId references nonexistent denizen: ${eng.target.denizenId}`);
        }
      }
    }
  }
}
