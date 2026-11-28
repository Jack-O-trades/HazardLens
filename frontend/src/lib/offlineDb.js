import Dexie from 'dexie'

export const offlineDb = new Dexie('HazardLensOfflineDB')

offlineDb.version(1).stores({
    // Metadata for downloaded regional packages (Phase 3)
    regionalPackages: 'regionId, version, lastUpdatedAt, status',

    // Structured geospatial records (always carry timestamps & verification states)
    hazards: 'id, regionId, verificationStatus, updatedAt',
    shelters: 'id, regionId, updatedAt',

    // Offline citizen reports waiting to sync
    syncQueue: '++localId, &idempotencyKey, status, createdAt',
})

/**
 * Request persistent browser storage so the OS/browser is less likely
 * to evict offline maps and queued reports under storage pressure.
 */
export async function checkAndRequestStoragePersistence() {
    if (typeof navigator === 'undefined' || !navigator.storage) {
        return { supported: false, persisted: false, usageBytes: 0, quotaBytes: 0 }
    }

    let persisted = false
    try {
        persisted = await navigator.storage.persisted()
        if (!persisted && navigator.storage.persist) {
            persisted = await navigator.storage.persist()
        }
    } catch {
        persisted = false
    }

    let usageBytes = 0
    let quotaBytes = 0
    try {
        const estimate = await navigator.storage.estimate()
        usageBytes = estimate.usage || 0
        quotaBytes = estimate.quota || 0
    } catch {
        // Ignore estimate failure on restricted browsers
    }

    return { supported: true, persisted, usageBytes, quotaBytes }
}