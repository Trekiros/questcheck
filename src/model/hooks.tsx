import { useSearchParams } from "next/navigation"
import { useRouter } from "next/router"
import { DependencyList, ReactNode, useEffect, useLayoutEffect, useState } from "react"
import { z } from "zod"

export function nodeJoin(arr: string[], node: ReactNode): ReactNode {
    return arr
        .reduce((acc: ReactNode, newValue: string) => {
            if (acc === null) return newValue

            else return <>{acc}{node}{newValue}</>
        }, null)
}

export function useFrame(callback: () => void, dependencies: DependencyList) {
    useLayoutEffect(() => {
        let running = true

        function run() {
            callback()

            if (running) requestAnimationFrame(run)
        }
        run()

        return () => { running = false }
    }, dependencies)
}


export function useURLState<TSchema extends z.ZodType, T extends z.infer<TSchema>>(name: string, schema: TSchema, defaultValue: T): [T, (newValue: T) => void] {
    const searchParams = useSearchParams()
    const router = useRouter()
    const parsed = schema.safeParse(searchParams.get(name))
    
    const [state, setState] = useState<T>(parsed.success ? parsed.data : defaultValue)

    const update = (newValue: T) => {
        setState(newValue)

        const newParams = new URLSearchParams(Array.from(searchParams.entries()))
        newParams.set(name, JSON.stringify(newValue))
        router.push(`?${newParams.toString()}`)
    }

    return [state, update]
}

export function useLocalStorageState<TSchema extends z.ZodType, T extends z.infer<TSchema>>(name: string, schema: TSchema, defaultValue: T): [T, (newValue: T) => void] {
    const [state, setState] = useState(defaultValue)

    useEffect(() => {
        if (typeof localStorage !== 'undefined') {
            const parsed = schema.safeParse(JSON.parse(localStorage.getItem(name) || 'null'))

            if (parsed.success) {
                setState(parsed.data)
            }
        }
    }, [])
    
    const update = (newValue: T) => {
        setState(newValue)

        if (!!JSON.parse(localStorage.getItem("preferences") || 'null')?.useLocalStorage) {
            localStorage.setItem(name, JSON.stringify(newValue))
        }
    }

    return [state, update]
}
