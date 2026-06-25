export interface AdSizePreset {
  id: string;
  label: string;
  width: number;
  height: number;
  // Interstitial is special: it implies placementType "interstitial" and
  // sizes itself to the full screen rather than a fixed width/height.
  isInterstitial?: boolean;
}

// Standard IAB ad unit sizes most commonly used for mobile rich media.
export const IAB_AD_SIZE_PRESETS: AdSizePreset[] = [
  { id: 'medium_rectangle', label: 'Medium Rectangle', width: 300, height: 250 },
  { id: 'mobile_leaderboard', label: 'Mobile Leaderboard', width: 320, height: 50 },
  { id: 'large_mobile_banner', label: 'Large Mobile Banner', width: 320, height: 100 },
  { id: 'leaderboard', label: 'Leaderboard', width: 728, height: 90 },
  { id: 'half_page', label: 'Half Page', width: 300, height: 600 },
  { id: 'square', label: 'Square', width: 250, height: 250 },
  { id: 'interstitial', label: 'Interstitial', width: 0, height: 0, isInterstitial: true },
];

export const CUSTOM_PRESET_ID = 'custom';
