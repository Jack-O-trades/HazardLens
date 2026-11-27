import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'

const NetworkContext = createContext({
    isOnline: true,
    lastOnlineAt: null,
})

const PROBE_TIMEOUT_MS = 1800
const PROBE_INTERVAL_MS = 3000

async function probeEndpoint(url, timeoutMs) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        const res = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-store',
            signal: controller.signal,
        })
        return res.ok
    } catch {
        return false
    } finally {
        clearTimeout(timer)
    }
}

async function checkRealConnectivity() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return false
    }
    const bust = Date.now()
    // Race two CORS-enabled endpoints with cache-busting so neither local adapters
    // nor cached opaque responses can cause a false "Online" state.
    const results = await Promise.all([
        probeEndpoint(`https://dns.google/resolve?name=example.com&type=A&_=${bust}`, PROBE_TIMEOUT_MS),
        probeEndpoint(`https://1.1.1.1/cdn-cgi/trace?_=${bust}`, PROBE_TIMEOUT_MS),
    ])
    return results.some(Boolean)
}

export function NetworkProvider({ children }) {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    )
    const [lastOnlineAt, setLastOnlineAt] = useState(null)
    const checkingRef = useRef(false)

    const verifyConnection = useCallback(async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setIsOnline(false)
            return
        }
        if (checkingRef.current) return
        checkingRef.current = true
        try {
            const reachable = await checkRealConnectivity()
            setIsOnline(reachable)
            if (reachable) {
                setLastOnlineAt(new Date().toISOString())
            }
        } finally {
            checkingRef.current = false
        }
    }, [])

    useEffect(() => {
        verifyConnection()

        const handleOnline = () => {
            verifyConnection()
        }

        const handleOffline = () => {
            setIsOnline(false)
        }

        const handleFocusOrVisible = () => {
            if (document.visibilityState === 'visible') {
                verifyConnection()
            }
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        window.addEventListener('focus', verifyConnection)
        document.addEventListener('visibilitychange', handleFocusOrVisible)

        const intervalId = setInterval(() => {
            if (document.visibilityState === 'visible') {
                verifyConnection()
            }
        }, PROBE_INTERVAL_MS)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('focus', verifyConnection)
            document.removeEventListener('visibilitychange', handleFocusOrVisible)
            clearInterval(intervalId)
        }
    }, [verifyConnection])

    return (
        <NetworkContext.Provider value={{ isOnline, lastOnlineAt }}>
            {children}
        </NetworkContext.Provider>
    )
}

export function useNetwork() {
    return useContext(NetworkContext)
}
