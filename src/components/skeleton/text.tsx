import { ComponentProps, FC } from 'react'
import styles from './skeleton.module.scss'

const TextSkeleton: FC<ComponentProps<"div"> & { lines: number }> = ({ lines, ...props }) => {
    return (
        <div {...props}>
            {Array.from({ length: lines }, (_, i) => (
                <div key={i} className={`${styles.skeleton} ${styles.line}`}>
                </div>
            ))}
        </div>
    )
}

export default TextSkeleton