import type { CampaignStateV5 } from "../shared/domain";
import { initialCampaignState } from "../shared/domain";

/** Test-only current-V5 fixture. Shallow top-level overrides; no deep merge. */
export function makeTestCampaignStateV5(
  overrides?: Partial<CampaignStateV5>,
): CampaignStateV5 {
  return {
    ...initialCampaignState(),
    ...overrides,
  };
}
