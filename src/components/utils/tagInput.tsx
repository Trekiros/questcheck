import React, { CSSProperties, FC, ReactNode, useEffect, useRef, useState } from "react";
import styles from './tagInput.module.scss'
import { createPortal } from "react-dom";
import { useFrame } from "@/model/hooks";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";

type PropType = {
    values: string[],
    onChange: (newValues: string[]) => void,
    placeholder?: string,
    suggestions?: string[],                       // Will be shown un-sorted
    categories?: { [category: string]: readonly string[] } // Will be shown sorted by category
    disabled?: boolean,
    maxTags?: number,
    tagStyle?: (tag: string, category?: string) => CSSProperties,
    tagClassName?: (tag: string, category?: string) => string
}

export const SuggestionNode: FC<{ value: string, search: string }> = ({ value, search }) => {
    if (!search) return <>{value}</>

    const matchIndex = value.toLowerCase().indexOf(search.toLowerCase())
    if (matchIndex === -1) {
        return <>{value}</>
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

const ExpandingInput: FC<{ placeholder?: string, className?: string, onSubmit: (value: string) => void }> = ({ placeholder, className, onSubmit }) => {
    const [text, setText] = useState('')

    return (
        <div className={className}>
            <input
                className={className}
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        onSubmit(text)
                        setText('')
                    }
                }}
                placeholder={placeholder}
                style={{ width: `min(300px, ${Math.max(text.length, (placeholder || '').length)}ch)`}}
            />
            <button 
                onClick={() => {
                    onSubmit(text)
                    setText('')
                }}>
                    <FontAwesomeIcon icon={faCheck} />
            </button>
        </div>
    )
}

const TagInput: FC<PropType> = ({ values, onChange, suggestions, categories, placeholder, disabled, maxTags, tagStyle, tagClassName }) => {
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

    function addTags(...tags: string[]) {
        update(clone => {
            tags.forEach(tag => {
                if (maxTags && (clone.length >= maxTags)) return;
                if (!clone.includes(tag)) clone.push(tag)
            })
        })
    }

    useFrame(() => {
        if (!visible) return;
        if (!rootRef.current) return;
        if (!popoverRef.current) return;
        
        const rect = rootRef.current.getBoundingClientRect();
        
        popoverRef.current.style.top = (rect.top + rect.height) + "px"
        popoverRef.current.style.left = rect.left + "px"
    }, [visible, rootRef, popoverRef])

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
    }, [visible, popoverRef, rootRef])

    return <>
        <div ref={rootRef} className={styles.tagInput} onClick={() => { inputRef.current?.focus() }}>
            <span className={styles.tagList}>
                { values.map((value, index) => (
                    <button
                        style={tagStyle?.(value)}
                        key={index}
                        onClick={e => { e.stopPropagation(); update(clone => clone.splice(index, 1)) }}
                        className={`${styles.option} ${tagClassName?.(value)}`}>
                            {value}
                    </button>
                ))}
            </span>

            <input
                ref={inputRef}
                type="text"
                className={`${styles.input} ${visible && styles.visible}`}
                style={{width: `min(250px, ${Math.max(search.length, placeholder?.length || 0) + 4}ch)` }}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => { setVisible(true) }}
                onPaste={e => {
                    e.preventDefault()
                    const pasted = e.clipboardData.getData('Text')
                    if (!pasted.trim().length) return;

                    
                    // Split on a comma, carriage return or semicolon, and trims whitespace around the separator.
                    const tags = pasted.split(/[,\n;]+/)
                        .map(tag => tag.trim())
                    const last = tags.pop()!

                    const first = tags[0]
                    if (first) {
                        tags[0] = search + tags[0]
                    }

                    setSearch(last)
                    addTags(...tags)
                }}
                disabled={disabled}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                        if (search) { 
                            addTags(search)
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

            { !visible && placeholder && (
                <span className={styles.placeholder}>
                    {placeholder}
                </span>
            )}
        </div>

        { !disabled && visible && (
            createPortal(
                <div
                    style={{ minWidth: rootRef.current?.clientWidth + 'px' }}
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
                                            onClick={e => {addTags(suggestion); inputRef.current?.focus() }}
                                            style={tagStyle?.(suggestion)}
                                            className={`${styles.option} ${tagClassName?.(suggestion)}`}>
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
                                                    { searchResults.map((suggestion, index) => (
                                                        <button
                                                            key={index}
                                                            onClick={e => {addTags(category + ' ' + suggestion); inputRef.current?.focus() }}
                                                            style={tagStyle?.(suggestion, category)}
                                                            className={`${styles.option} ${tagClassName?.(suggestion, category)}`}>
                                                                <SuggestionNode value={suggestion} search={search} />
                                                        </button>
                                                    ))}

                                                    <ExpandingInput
                                                        className={styles.customOption}
                                                        placeholder="Custom..."
                                                        onSubmit={newTag => addTags(category + ' ' + newTag)} />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )
                        })()}

                        { maxTags && (
                            <label className={styles.maxTags}>
                                {values.length}/{maxTags}
                            </label>
                        )}
                </div>,
                document.body
            )
        )}
    </>
}


export default TagInput