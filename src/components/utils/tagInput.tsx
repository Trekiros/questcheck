"use client";

import React, { FC, ReactNode, useEffect, useRef, useState } from "react";
import styles from './tagInput.module.scss'
import { createPortal } from "react-dom";
import { useFrame } from "@/model/hooks";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";

type PropType = {
    values: string[],
    onChange: (newValues: string[]) => void,
    placeholder?: string,
    suggestions?: string[],                       // Will be shown un-sorted
    categories?: { [category: string]: readonly string[] } // Will be shown sorted by category
}

const SuggestionNode: FC<{ value: string, search: string }> = ({ value, search }) => {
    if (!search) return <>{value}</>

    const matchIndex = value.toLowerCase().indexOf(search.toLowerCase())
    if (matchIndex === -1) {
        return null
    }

    return <>
        {
            value.substring(0, matchIndex)
        }<span className={styles.highlight}>
            {value.substring(matchIndex, matchIndex + search.length)}
        </span>{
            value.substring(matchIndex + search.length)
        }
    </>
}

const TagInput: FC<PropType> = ({ values, onChange, suggestions, categories, placeholder }) => {
    const rootRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const popoverRef = useRef<HTMLDivElement>(null)
    const [search, setSearch] = useState('')
    const [visible, setVisible] = useState(false)

    const [openCategories, setOpenCategories] = useState<{[category: string]: boolean}>(() => {
        if (!categories) return {}
    
        const result: {[categories: string]: boolean} = {}
        Object.keys(categories).forEach(category => {
            result[category] = true
        })
        return result
    })

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

    return <>
        <div ref={rootRef} className={styles.tagInput} onClick={() => { inputRef.current?.focus() }}>
            <span className={styles.tagList}>
                { values.map((value, index) => (
                    <button
                        onClick={e => { e.stopPropagation(); update(clone => clone.splice(index, 1)) }}
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
                onFocus={() => { setVisible(true) }}
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
                        { /** UNSORTED SUGGESTIONS **/ (() => {
                            if (!suggestions) return null;

                            const searchResults = suggestions.filter(suggestion => !values.includes(suggestion) && suggestion.toLowerCase().includes(search.toLowerCase()))

                            return (
                                <div className={styles.list}>
                                    { !searchResults.length ? "No matching tags in the default list (you can press enter to enter custom tags)" : searchResults.map(suggestion => (
                                        <button
                                            key={suggestion}
                                            onClick={e => {update(clone => clone.push(suggestion)); inputRef.current?.focus() }}
                                            className={styles.option}>
                                                <SuggestionNode value={suggestion} search={search} />
                                        </button>
                                    ))}
                                </div>
                            )
                        })() }

                        { /** CATEGORY_BASED SUGGESTIONS */ (() => {
                            if (!categories) return null;

                            return (
                                Object.entries(categories).map(([category, categoryTags]) => {
                                    const searchResults = categoryTags.filter(suggestion => !values.includes(suggestion) && suggestion.toLowerCase().includes(search.toLowerCase()))
                                    
                                    if (!searchResults.length) return <React.Fragment key={category} />

                                    return (
                                        <div className={styles.category} key={category}>
                                            <button 
                                                onClick={() => setOpenCategories({...openCategories, [category]: !openCategories[category]})} 
                                                className={styles.header}>
                                                    <FontAwesomeIcon icon={openCategories[category] ? faChevronUp : faChevronDown} />
                                                    {category}
                                            </button>
                                            { !!openCategories[category] && (
                                                <div className={styles.list}>
                                                    { searchResults.map(suggestion => (
                                                        <button
                                                            onClick={e => {update(clone => clone.push(suggestion)); inputRef.current?.focus() }}
                                                            className={styles.option}>
                                                                <SuggestionNode value={suggestion} search={search} />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )
                        })()}
                </div>,
                document.body
            )
        )}
    </>
}


export default TagInput