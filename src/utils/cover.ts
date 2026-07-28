import { GetIndexFromSlugID } from "./hash";
import YukinaConfig from "../../yukina.config";

/**
 * Retrieves the cover URL for an unspecified entry based on the provided ID.
 */
export function GetCoverURLForUnspecifiedEntry(id: string): string {
  const index = GetIndexFromSlugID(id, YukinaConfig.banners.length);
  return YukinaConfig.banners[index] ?? YukinaConfig.banners[0];
}
