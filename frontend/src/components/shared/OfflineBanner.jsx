import { useNetwork } from '@/context/NetworkContext'

export default function OfflineBanner() {
    const { isOnline, lastOnlineAt } = useNetwork()

    if (isOnline) return null

    const formattedTime = lastOnlineAt
        ? new Date(lastOnlineAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        })
        : 'Unknown'

    return (
        <div
            role="alert"
            className="w-full bg-amber-600 text-white text-xs sm:text-sm font-medium px-4 py-2 text-center z-[9999] relative shadow"
        >
            <strong>OFFLINE MODE:</strong> Live hazard updates and online routing are
            unavailable. Last connected: {formattedTime}.
        </div>
    )
}