const CACHE_DURATION = 60 * 60 * 1000

const cachedValues: {[key: string]: { timeout: NodeJS.Timeout, value: any }} = {}

export async function cache<T>(key: string, callback: () => Promise<T>) {
    if (!cachedValues[key]) {
        const value = await callback()
        const timeout = setTimeout(() => {
            delete cachedValues[key]
        }, CACHE_DURATION)

        // This could have been filled in the meantime, but the value we have is more up to date
        if (cachedValues[key]) {
            clearTimeout(cachedValues[key].timeout)
        }

        cachedValues[key] = { timeout, value }
        return cachedValues[key].value as T
    }

    else {
        // Refresh timeout
        clearTimeout(cachedValues[key].timeout)
        cachedValues[key].timeout = setTimeout(() => {
            delete cachedValues[key]
        }, CACHE_DURATION)

        return cachedValues[key].value as T
    }
}

export async function invalidate(key: string) {
    if (cachedValues[key]) {
        clearTimeout(cachedValues[key].timeout)
        delete cachedValues[key]
    }

}