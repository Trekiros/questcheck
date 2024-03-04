import React, { FC, useEffect, useRef, useState } from "react";
import styles from './freeEntrySelect.module.scss'
import { createPortal } from "react-dom";
import { useFrame } from "@/model/hooks";
import { SuggestionNode } from "./tagInput";

type PropType = {
    value: string,
    onChange: (newValue: string) => void,
    placeholder?: string,
    suggestions: readonly string[],
    disabled?: boolean,
    classNames?: {
        input?: string,
        dropdown?: string,
        option?: string,
    },
}

const FreeEntrySelect: FC<PropType> = ({ value, onChange, suggestions, placeholder, disabled, classNames}) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const popoverRef = useRef<HTMLSelectElement>(null)
    const [visible, setVisible] = useState(false)

    const searchResults = suggestions.includes(value) ? suggestions
        : suggestions.filter(suggestion => suggestion.toLowerCase().includes(value.toLowerCase()))

    useFrame(() => {
        if (!visible) return;
        if (!popoverRef.current) return;
        if (!inputRef.current) return;
        
        const rect = inputRef.current.getBoundingClientRect();
        
        popoverRef.current.style.top = (rect.top + rect.height) + "px"
        popoverRef.current.style.left = rect.left + "px"
    }, [visible, popoverRef, inputRef])

    useEffect(() => {
        if (!visible) return;
        if (!popoverRef.current) return;

        function handleClickOutside(e: MouseEvent) {
            if (popoverRef.current!.contains(e.target as any)) return;

            setVisible(false)
        }

        window.addEventListener("mousedown", handleClickOutside)

        return () => window.removeEventListener("mousedown", handleClickOutside)
    }, [visible, popoverRef.current])

    return <>
        <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            className={`${styles.input} ${visible && styles.visible} ${classNames?.input}`}
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => { setVisible(true) }}
            onKeyDown={e => {
                if (e.key === 'Escape') {
                    setVisible(false)
                }

                if (e.key === 'ArrowDown') {
                    popoverRef.current?.focus()
                }
            }}
            placeholder={placeholder} />

        { visible && !!searchResults.length && (
            createPortal(
                <select
                    size={Math.max(2, searchResults.length)}
                    ref={popoverRef}
                    className={`${styles.select} ${classNames?.dropdown}`}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            onChange(String(popoverRef.current?.value))
                        }

                        if (e.key === 'Escape') {
                            inputRef.current?.focus()
                            
                        }
                    }}>
                        {(() => {
                            return (
                                !searchResults.length ? "No matching option (you can enter your own value here)" : searchResults.map(suggestion => (
                                    <option
                                        key={suggestion}
                                        onClick={e => { onChange(suggestion); setVisible(false) }}
                                        className={`${styles.option} ${classNames?.option}`}>
                                            <SuggestionNode value={suggestion} search={value} />
                                    </option>
                                ))
                            )
                        })() }
                </select>,
                document.body
            )
        )}
    </>
}


export default FreeEntrySelect