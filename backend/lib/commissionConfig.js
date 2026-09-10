import PlatformConfig from "../models/PlatformConfig.js";
import { normalizeCommissionTiers } from "./aiBotYield.js";

export function tiersFromPlatform(platform) {
  return normalizeCommissionTiers(platform?.aiBotDefaults?.commissionTiers);
}

export async function loadCommissionTiers() {
  const platform = await PlatformConfig.getSingleton();
  return tiersFromPlatform(platform);
}
