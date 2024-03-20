import { FC, ReactNode, useState } from "react";
import styles from './expandable.module.scss'

const Expandable: FC<{ children: ReactNode, lines?: number }> = ({ children, lines }) => {
    const [collapsed, setCollapsed] = useState(true)

    if (!collapsed) return children

    return (
        <div 
            onClick={() => setCollapsed(false)} 
            className={styles.collapsed} 
            style={lines !== undefined ? { WebkitLineClamp: lines } : undefined}>
                {children}
        </div>
    )
}

export default Expandable