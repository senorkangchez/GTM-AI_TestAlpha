"use client";

// Client-side approval state for suggested MEDDPICC landings. Backed by
// localStorage so the inline (per-account) and global (/queue) surfaces SHARE the
// same state and it survives reloads. NOTHING here writes to a real or simulated
// CRM — "approved" is a status flip + a "would sync to SFDC" badge. That human
// gate is the shadow-DB boundary, by design.
import { useSyncExternalStore, useCallback } from "react";
import type { ApprovalStatus } from "./types";

const KEY = "fis-approvals-v1";
const listeners = new Set<() => void>();

function read(): Record<string, ApprovalStatus> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function write(map: Record<string, ApprovalStatus>) {
  window.localStorage.setItem(KEY, JSON.stringify(map));
  listeners.forEach((l) => l());
}

export function setApproval(key: string, status: ApprovalStatus) {
  const map = read();
  if (status === "pending") delete map[key];
  else map[key] = status;
  write(map);
}

const EMPTY: Record<string, ApprovalStatus> = {};
let cache: Record<string, ApprovalStatus> = EMPTY;
let cacheRaw = "{}";

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Record<string, ApprovalStatus> {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY) || "{}";
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      cache = JSON.parse(raw);
    } catch {
      cache = EMPTY;
    }
  }
  return cache;
}

/** Returns [statusMap, setStatus]. statusMap[key] defaults to undefined = "pending". */
export function useApprovals(): [Record<string, ApprovalStatus>, (key: string, s: ApprovalStatus) => void] {
  const map = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const set = useCallback((key: string, s: ApprovalStatus) => setApproval(key, s), []);
  return [map, set];
}

export function statusOf(map: Record<string, ApprovalStatus>, key: string): ApprovalStatus {
  return map[key] ?? "pending";
}
