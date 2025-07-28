// src/utils/features.js

export const featureMatrix = {
  free: {
    canWatchAds: true,
    canAccessAI: false,
    canAccessKabal: false,
    canAccessArchive: false,
    canAccessProScreen: false,
  },
  premium: {
    canWatchAds: false,
    canAccessAI: false,
    canAccessKabal: false,
    canAccessArchive: false,
    canAccessProScreen: false,
  },
  pro: {
    canWatchAds: false,
    canAccessAI: true,
    canAccessKabal: true,
    canAccessArchive: true,
    canAccessProScreen: true,
  }
};

export const hasFeature = (plan, feature) => {
  return !!featureMatrix[plan]?.[feature];
};
