import PlatformConfig from "../models/PlatformConfig.js";
import { normalizeCommissionTiers } from "./aiBotYield.js";
import { normalizeSlotDefaults } from "./smartCopy.js";

export function tiersFromPlatform(platform) {
  return normalizeCommissionTiers(platform?.aiBotDefaults?.commissionTiers);
}

export async function loadCommissionTiers() {
  const platform = await PlatformConfig.getSingleton();
  return tiersFromPlatform(platform);
}

export function slotDefaultsFromPlatform(platform) {
  return normalizeSlotDefaults(platform?.smartCopyDefaults?.slots);
}

export async function loadSlotDefaults() {
  const platform = await PlatformConfig.getSingleton();
  return slotDefaultsFromPlatform(platform);
}
