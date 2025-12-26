// ✅ This file ONLY uses what your sheet files ALREADY EXPORT

import {
  ALL_SEQUENTIAL_2STR_RECENT as ALL_2STR_RECENT,
  ALL_SEQUENTIAL_2STR_ALL as ALL_2STR_ALL,
  ALL_PATCH_INFO,
} from "./allLiveSheetData";

import {
  ASIA_SEQUENTIAL_2STR_RECENT as ASIA_2STR_RECENT,
  ASIA_SEQUENTIAL_2STR_ALL as ASIA_2STR_ALL,
  ASIA_PATCH_INFO,
} from "./asiaLiveSheetData";

import {
  EU_SEQUENTIAL_2STR_RECENT as EU_2STR_RECENT,
  EU_SEQUENTIAL_2STR_ALL as EU_2STR_ALL,
  EU_PATCH_INFO,
} from "./euLiveSheetData";

import {
  NA_SEQUENTIAL_2STR_RECENT as NA_2STR_RECENT,
  NA_SEQUENTIAL_2STR_ALL as NA_2STR_ALL,
  NA_PATCH_INFO,
} from "./naLiveSheetData";

// ✅ Unified region access
const REGION_MAP = {
  ALL: {
    recent: ALL_2STR_RECENT,
    all: ALL_2STR_ALL,
    patches: ALL_PATCH_INFO,
  },
  ASIA: {
    recent: ASIA_2STR_RECENT,
    all: ASIA_2STR_ALL,
    patches: ASIA_PATCH_INFO,
  },
  EU: {
    recent: EU_2STR_RECENT,
    all: EU_2STR_ALL,
    patches: EU_PATCH_INFO,
  },
  America: {
    recent: NA_2STR_RECENT,
    all: NA_2STR_ALL,
    patches: NA_PATCH_INFO,
  },
};

// ✅ THIS is what the enhanced predictor will use
export function get2StrHistoricalRolls(region = "ALL", recentOnly = true) {
  const cfg = REGION_MAP[region] || REGION_MAP.ALL;
  return recentOnly ? cfg.recent : cfg.all;
}

export function get2StrPatchInfo(region = "ALL") {
  const cfg = REGION_MAP[region] || REGION_MAP.ALL;
  return cfg.patches;
}
