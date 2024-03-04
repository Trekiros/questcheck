"use client";

import { FC, MouseEvent } from "react"
import styles from './checkbox.module.scss'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheck } from "@fortawesome/free-solid-svg-icons"

type PropType = {
    value: boolean,
    onToggle: (newValue: boolean) => void,
    className?: string,
    children?: React.ReactNode,
    disabled?: boolean,
}

const Checkbox:FC<PropType> = ({ value, onToggle, className, children, disabled }) => {
    return (
        <button
            disabled={disabled}
            className={`${className || ''} ${styles.checkbox} ${value ? styles.checked : ''}`}
            onClick={e => onToggle(!value)}>
                <FontAwesomeIcon icon={faCheck} />
                {children}
        </button>
    )
}

export default Checkbox