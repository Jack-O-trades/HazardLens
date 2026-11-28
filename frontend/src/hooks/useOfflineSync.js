import { useEffect, useState, useCallback } from 'react'
import { useNetwork } from '@/context/NetworkContext'
import {
    flushSyncQueue,
    getPendingReportCount,
} from '@/services/syncService'
import { checkAndRequestStoragePersistence } from '@/lib/offlineDb'

export function useOfflineSync(authToken = null) {
    const { isOnline } = useNetwork()
    const [pendingCount, setPendingCount] = useState(0)
    const [isSyncing, setIsSyncing] = useState(false)
    const [storageStatus, setStorageStatus] = useState(null)

    const refreshCount = useCallback(async () => {
        const count = await getPendingReportCount()
        setPendingCount(count)
    }, [])

    // Request persistent storage once on mount
    useEffect(() => {
        checkAndRequestStoragePersistence().then(setStorageStatus)
        refreshCount()
    }, [refreshCount])

    // Auto-flush queue whenever connectivity returns
    useEffect(() => {
        if (!isOnline) return

        let cancelled = false
        const runSync = async () => {
            setIsSyncing(true)
            await flushSyncQueue({ authToken })
            if (!cancelled) {
                await refreshCount()
                setIsSyncing(false)
            }
        }

        runSync()
        return () => {
            cancelled = true
        }
    }, [isOnline, authToken, refreshCount])

    return { pendingCount, isSyncing, storageStatus, refreshCount }
}