import { FC } from "react"
import CircleSkeleton from "./circle"
import styles from './skeleton.module.scss'

const DotSkeleton: FC<{}> = ({}) => {
    return (
        <div className={styles.dots}>
            <CircleSkeleton width={16} />
            <CircleSkeleton width={16} />
            <CircleSkeleton width={16} />
        </div>
    )
}

export default DotSkeleton