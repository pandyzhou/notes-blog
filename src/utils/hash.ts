import YukinaConfig from "../../yukina.config";
import CryptoJS from "crypto-js";

/**
 * Converts a given slug to a hashed slug or returns the raw slug based on the configuration.
 */
export function IdToSlug(slug: string): string {
  switch (YukinaConfig.slugMode) {
    case "HASH": {
      const hash = CryptoJS.SHA256(slug);
      const hasedSlug = hash.toString(CryptoJS.enc.Hex).slice(0, 8);
      return hasedSlug;
    }
    case "RAW":
      return slug;
    default:
      return slug;
  }
}

/**
 * Computes an index from a given slug ID string using a custom hash algorithm.
 */
export function GetIndexFromSlugID(id: string, listLength: number): number {
  let hashValue = 0;
  for (let i = 0; i < id.length; i++) {
    hashValue += id.charCodeAt(i) * 31 ** (id.length - 1 - i);
  }
  const index = Math.abs(Math.round(hashValue)) % listLength;
  return Number.isFinite(index) ? index : 0;
}
