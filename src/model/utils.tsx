import { DependencyList, ReactNode, useLayoutEffect } from "react"

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