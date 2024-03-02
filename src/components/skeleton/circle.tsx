import { FC } from "react";
import styles from './skeleton.module.scss'

// Default width: 100%
const CircleSkeleton: FC<{ width?: number }> = ({ width }) => {
    const widthStr = typeof width === 'number' ? `${width}px` : (width || '100%')

    return (
        <div className={`${styles.skeleton} ${styles.circle}`} style={{ width: widthStr }}>
        </div>
    )
}

export default CircleSkeleton