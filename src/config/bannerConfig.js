/**
 * Banner Display Configuration
 * 
 * This file controls how many banners are displayed on the website.
 * Edit these values to change the maximum number of banners shown for each game.
 */

export const BANNER_DISPLAY_CONFIG = {
  hsr: {
    // Maximum number of character banners to show (set to null for unlimited)
    maxCharacterBanners: 4,
    
    // Maximum number of light cone banners to show (set to null for unlimited)
    maxLightConeBanners: 4,
    
    // Examples:
    // maxCharacterBanners: 2,  // Show only 2 newest character banners
    // maxCharacterBanners: 4,  // Show up to 4 character banners
    // maxCharacterBanners: null, // Show all active character banners
  },
  
  genshin: {
    maxCharacterBanners: null,
    maxWeaponBanners: null,
  },
  
  wuwa: {
    maxCharacterBanners: null,
    maxWeaponBanners: null,
  }
};

/**
 * Quick Presets - Uncomment one to use
 */

// PRESET 1: Show only newest 2 banners per type (old behavior)
// export const BANNER_DISPLAY_CONFIG = {
//   hsr: { maxCharacterBanners: 2, maxLightConeBanners: 2 },
//   genshin: { maxCharacterBanners: 2, maxWeaponBanners: 2 },
//   wuwa: { maxCharacterBanners: 2, maxWeaponBanners: 2 }
// };

// PRESET 2: Show all active banners (current behavior)
// Already active above

// PRESET 3: Show 3 character banners, 2 light cones
// export const BANNER_DISPLAY_CONFIG = {
//   hsr: { maxCharacterBanners: 3, maxLightConeBanners: 2 },
//   genshin: { maxCharacterBanners: 3, maxWeaponBanners: 2 },
//   wuwa: { maxCharacterBanners: 3, maxWeaponBanners: 2 }
// };
