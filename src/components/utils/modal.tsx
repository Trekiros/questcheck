import { FC, ReactNode, useEffect } from "react"
import styles from './modal.module.scss'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faClose } from "@fortawesome/free-solid-svg-icons"

type PropType = {
    className?: string,
    onCancel: () => void,
    children: ReactNode,
}

const Modal:FC<PropType> = ({ onCancel, children, className }) => {
    useEffect(() => {
        function escapeListener(e: KeyboardEvent) {
            if (e.key === 'Escape') onCancel()
        }

        window.addEventListener('keydown', escapeListener)
        return () => window.removeEventListener('keydown', escapeListener)
    }, [])

    return (
        <div className={styles.overlay}>
            
            <div className={`${styles.modal} ${className}`}>
                <button className={styles.closeBtn} onClick={onCancel}>
                    <FontAwesomeIcon icon={faClose} />
                </button>
                
                {children}
            </div>
        </div>
    )
}

export default Modal