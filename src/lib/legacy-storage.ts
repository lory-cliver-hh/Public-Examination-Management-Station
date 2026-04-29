"use client";

const LEGACY_MIGRATION_NAMESPACE = "gongkao-manager:legacy-migrated";

function getMigrationMarkerKey(scope: string, userId: string) {
  return `${LEGACY_MIGRATION_NAMESPACE}:${scope}:${userId}`;
}

export function readLegacyJson<T>(storageKey: string) {
  if (typeof window === "undefined") {
    return null as T | null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return null as T | null;
    }

    return JSON.parse(raw) as T;
  } catch {
    return null as T | null;
  }
}

export function hasLegacyMigrationMarker(scope: string, userId: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return Boolean(window.localStorage.getItem(getMigrationMarkerKey(scope, userId)));
  } catch {
    return false;
  }
}

export function markLegacyMigration(scope: string, userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getMigrationMarkerKey(scope, userId), new Date().toISOString());
  } catch {
    // Ignore storage write failures and let the app continue.
  }
}
