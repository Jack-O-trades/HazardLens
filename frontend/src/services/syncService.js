import { offlineDb } from '@/lib/offlineDb'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/**
 * Save a citizen report locally when offline (or if a live POST fails).
 */
export async function enqueueOfflineReport(reportPayload) {
    const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const record = {
        idempotencyKey,
        status: 'pending', // 'pending' | 'syncing' | 'failed'
        createdAt: new Date().toISOString(),
        retryCount: 0,
        lastError: null,
        payload: {
            ...reportPayload,
            clientSubmittedAt: new Date().toISOString(),
            submittedOffline: true,
        },
    }

    const localId = await offlineDb.syncQueue.add(record)
    return { localId, idempotencyKey }
}

/**
 * Flush all pending reports to the backend when connectivity returns.
 * Stops early if the network drops mid-sync.
 */
export async function flushSyncQueue({ authToken = null } = {}) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return { synced: 0, failed: 0 }
    }

    const pendingItems = await offlineDb.syncQueue
        .where('status')
        .anyOf(['pending', 'failed'])
        .sortBy('createdAt')

    let synced = 0
    let failed = 0

    for (const item of pendingItems) {
        if (!navigator.onLine) break

        await offlineDb.syncQueue.update(item.localId, { status: 'syncing' })

        try {
            const headers = {
                'Content-Type': 'application/json',
                'X-Idempotency-Key': item.idempotencyKey,
            }
            if (authToken) {
                headers.Authorization = `Bearer ${authToken}`
            }

            const res = await fetch(`${API_BASE}/api/reports`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    ...item.payload,
                    idempotencyKey: item.idempotencyKey,
                }),
            })

            if (!res.ok) {
                throw new Error(`Server responded with ${res.status}`)
            }

            // Successfully accepted by backend — remove from local queue
            await offlineDb.syncQueue.delete(item.localId)
            synced += 1
        } catch (err) {
            await offlineDb.syncQueue.update(item.localId, {
                status: 'failed',
                retryCount: (item.retryCount || 0) + 1,
                lastError: err.message || 'Network error',
            })
            failed += 1
        }
    }

    return { synced, failed }
}

export async function getPendingReportCount() {
    return offlineDb.syncQueue.where('status').anyOf(['pending', 'failed']).count()
}