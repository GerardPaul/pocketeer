import type { Href } from "expo-router";

// Expo Router 57's generated route types omit "/" and offer "/(tabs)/index", which doesn't resolve at runtime.
export const HOME = "/" as Href;
