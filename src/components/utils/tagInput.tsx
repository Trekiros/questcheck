"use client";

import React, { FC, ReactNode, useEffect, useRef, useState } from "react";
import styles from './tagInput.module.scss'
import { createPortal } from "react-dom";
import { useFrame } from "@/model/hooks";

type PropType = {
    values: string[],
    onChange: (newValues: string[]) => void,
    suggestions: string[],
    placeholder?: string,
}

const TagInput: FC<PropType> = ({ values, onChange, suggestions, placeholder }) => {
    const rootRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const popoverRef = useRef<HTMLDivElement>(null)
    const [search, setSearch] = useState('')
    const [visible, setVisible] = useState(false)

    function update(callback: (clone: string[]) => void) {
        const clone = [...values]
        callback(clone)
        onChange(clone)
    }

    useFrame(() => {
        if (!visible) return;
        if (!rootRef.current) return;
        if (!popoverRef.current) return;
        
        const rect = rootRef.current.getBoundingClientRect();
        
        popoverRef.current.style.top = (rect.top + rect.height) + "px"
        popoverRef.current.style.left = rect.left + "px"
    }, [visible, rootRef.current, popoverRef.current])

    useEffect(() => {
        if (!visible) return;
        if (!popoverRef.current) return;
        if (!rootRef.current) return;

        function handleClickOutside(e: MouseEvent) {
            if (rootRef.current!.contains(e.target as any)) return;
            if (popoverRef.current!.contains(e.target as any)) return;

            setVisible(false)
            setSearch('')
        }

        window.addEventListener("mousedown", handleClickOutside)

        return () => window.removeEventListener("mousedown", handleClickOutside)
    }, [visible, popoverRef.current, rootRef.current])

    const searchResults = suggestions.filter(suggestion => !values.includes(suggestion) && suggestion.toLowerCase().includes(search.toLowerCase()))

    return <>
        <div ref={rootRef} className={styles.tagInput} onClick={() => { inputRef.current?.focus() }}>
            <span className={styles.tagList}>
                { values.map((value, index) => (
                    <button
                        onClick={e => update(clone => clone.splice(index, 1))}
                        className={styles.option}>
                            {value}
                    </button>
                ))}
            </span>

            <input
                ref={inputRef}
                type="text"
                className={`${styles.input} ${visible && styles.visible}`}
                style={{width: `min(250px, ${search.length + 4}ch)` }}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setVisible(true)}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                        if (search) { 
                            update(clone => clone.push(search))
                            setSearch('')
                        }
                        e.preventDefault()
                    }

                    if (e.key === 'Escape') {
                        setVisible(false)
                        inputRef.current?.blur()
                    }
                }}
                placeholder={placeholder} />
        </div>

        { visible && (
            createPortal(
                <div
                    ref={popoverRef}
                    className={styles.listBox}>
                        { !searchResults.length ? "No matching tags in the default list (you can press enter to enter custom tags)" : searchResults.map(suggestion => {
                            let suggestionNode = <>{suggestion}</>
                            if (search) {
                                const matchIndex = suggestion.toLowerCase().indexOf(search.toLowerCase())
                                if (matchIndex === -1) {
                                    return <React.Fragment key={suggestion} />
                                }

                                suggestionNode = <>
                                    {
                                        suggestion.substring(0, matchIndex)
                                    }<span className={styles.highlight}>
                                        {suggestion.substring(matchIndex, matchIndex + search.length)}
                                    </span>{
                                        suggestion.substring(matchIndex + search.length)
                                    }
                                </>
                            }

                            return (
                                <button
                                    onClick={e => {update(clone => clone.push(suggestion)); inputRef.current?.focus() }}
                                    className={styles.option}>
                                        {suggestionNode}
                                </button>
                            )
                        })}
                </div>,
                document.body
            )
        )}
    </>
}

            /*<ReactTags
                placeholderText={placeholder || "Tags..."}
                classNames={{
                    root: styles.tagInput,
                    rootIsActive: styles.active,
                    rootIsDisabled: styles.disabled,
                    rootIsInvalid: styles.invalid,
    
                    tagList: styles.tagList,
                    tag: styles.tag,
                    tagListItem: styles.tagListItem,
                    tagName: styles.tagName,
                    
                    label: styles.label,
                    comboBox: styles.comboBox,
                    input: styles.input,
    
                    listBox: styles.listBox,
                    option: styles.option,
                    optionIsActive: styles.active,
                    highlight: styles.highlight,
                }}

                allowNew={true}
                collapseOnSelect={false}

                renderListBox={({ children, ...props }) => !ref.current ? <></> : createPortal(
                    <div
                        {...props} 
                        className={styles.listBox} 
                        style={{ top: (ref.current.offsetTop + ref.current.clientHeight) + "px", left: ref.current.offsetLeft + "px" }}
                        onFocus={e => e.stopPropagation()}>
                            {children}
                    </div>,
                    document.body
                )}
    
                labelText=""
    
                selected={values.map(tag => ({ label: tag, value: tag }))}
                onAdd={newTag => update(v => v.push(String(newTag.value)))}
                onDelete={index => update(v => v.splice(index, 1))}
                suggestions={suggestions.map(tag => ({ label: tag, value: tag }))}/>*/

export default TagInput