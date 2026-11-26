import { createContext, useContext, useEffect, useState } from 'react'

const NetworkContext = createContext({
    isOnline: true,
    lastOnlineAt: null,
})

export function NetworkProvider({ children }) {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    )
    const [lastOnlineAt, setLastOnlineAt] = useState(() =>
        typeof navigator !== 'undefined' && navigator.onLine
            ? new Date().toISOString()
            : null
    )

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true)
            setLastOnlineAt(new Date().toISOString())
        }

        const handleOffline = () => {
            setIsOnline(false)
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    return (
        <NetworkContext.Provider value={{ isOnline, lastOnlineAt }}>
            {children}
        </NetworkContext.Provider>
    )
}

export function useNetwork() {
    return useContext(NetworkContext)
}