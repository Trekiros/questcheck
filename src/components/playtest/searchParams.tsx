import { BountyList, DefaultSearchParams, PlaytestSearchParams, Task, TaskList } from "@/model/playtest";
import { FC, useState } from "react";
import styles from './searchParams.module.scss'
import { EnginesList, GenreList, MaterialList, SystemsList } from "@/model/tags";
import TagInput from "../utils/tagInput";
import Checkbox from "../utils/checkbox";
import Select from "../utils/select";
import { keys } from "@/model/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp, faExpand, faRotate } from "@fortawesome/free-solid-svg-icons";
import { useDialog } from "../utils/dialog";

export function tagClassName(tag: string, category?: string) {
    const tagCat = tag.split(' ')[0]

    switch (category || tagCat) {
        case 'Game:': return 'systemTag'
        case 'Engine:': return 'engineTag'
        case 'Genre:':  return 'genreTag'
        case 'Material:': return 'materialTag'
    }

    return ''
}

type PropType = {
    value: PlaytestSearchParams,
    onChange: (newValue: PlaytestSearchParams) => void,
}

const SearchParams: FC<PropType> = ({ value, onChange }) => {
    const [collapsed, setCollapsed] = useState(false)
    const { setDialog } = useDialog()

    function update(callback: (clone: PlaytestSearchParams) => void) {
        const clone = structuredClone(value)
        callback(clone)
        onChange(clone)
    }

    return (
        <div className={styles.searchParams}>
            <h2>
                Advanced Search

                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={styles.collapse}>
                        <FontAwesomeIcon icon={collapsed ? faChevronUp : faChevronDown} />
                </button>
            </h2>
            { !collapsed && <>
                <SearchParamsForm
                    value={value}
                    update={update} />

                <section>
                    <button 
                        disabled={JSON.stringify(value) === JSON.stringify(DefaultSearchParams)}
                        onClick={() => setDialog("Do you wish to reset your search parameters?", confirm => confirm && onChange(DefaultSearchParams))}>
                            <FontAwesomeIcon icon={faRotate} />
                            Reset Search Params
                    </button>
                </section>
            </>}
        </div>
    )
}

export const SearchParamsForm: FC<{ 
    value: PlaytestSearchParams, 
    update: (callback: (clone: PlaytestSearchParams) => void) => void,
    disabled?: boolean,
    className?: string,
    fields?: {
        tags?: boolean,
        date?: boolean,
        task?: boolean,
        bounty?: boolean,
    },
}> = ({ value, update, disabled, className, fields }) => {
    return (
        <div className={`${styles.form} ${className}`}>
            { (fields?.tags !== false) && (
                <section>
                    <h3>Tags:</h3>

                    <div>
                        <label>Must include:</label>
                        <TagInput
                            disabled={disabled}
                            tagClassName={tagClassName}
                            values={value.includeTags || []}
                            onChange={newValue => update(clone => {
                                const actualNewValue = newValue.filter(tag => !value.excludeTags || !value.excludeTags?.includes(tag))
                                if (actualNewValue.length) clone.includeTags = actualNewValue
                                else delete clone.includeTags;
                            })}
                            categories={{
                                "Game:": SystemsList.filter(tag => !value.excludeTags || !value.excludeTags?.includes(tag)),
                                "Material:": MaterialList.filter(tag =>!value.excludeTags ||!value.excludeTags?.includes(tag)),
                                "Engine:": EnginesList.filter(tag => !value.excludeTags || !value.excludeTags?.includes(tag)),
                                "Genre:": GenreList.filter(tag => !value.excludeTags || !value.excludeTags?.includes(tag)),
                            }} />
                    </div>
                    <div>
                        <label>Cannot include:</label>
                        <TagInput
                            disabled={disabled}
                            tagClassName={tagClassName}
                            values={value.excludeTags || []}
                            onChange={newValue => update(clone => {
                                const actualNewValue = newValue.filter(tag => !value.includeTags || !value.includeTags?.includes(tag))
                                if (actualNewValue.length) clone.excludeTags = actualNewValue
                                else delete clone.excludeTags;
                            })}
                            categories={{
                                "Game:": SystemsList.filter(tag => !value.includeTags || !value.includeTags?.includes(tag)),
                                "Material:": MaterialList.filter(tag =>!value.includeTags ||!value.includeTags?.includes(tag)),
                                "Engine:": EnginesList.filter(tag => !value.includeTags || !value.includeTags?.includes(tag)),
                                "Genre:": GenreList.filter(tag =>!value.includeTags || !value.includeTags?.includes(tag)),
                            }} />
                    </div>
                </section>
            )}

            { (fields?.date !== false) && (
                <section>
                    <h3>Publication Date</h3>

                    <div className={styles.dates}>
                        <Select
                            disabled={disabled}
                            value={value.after}
                            onChange={newValue => update(clone => clone.after = newValue)}
                            options={[
                                {label: 'No restriction', value: undefined},
                                {label: 'In the past 24 hours', value: - 24 * 60 * 60 * 1000},
                                {label: 'In the past 7 days', value: - 7 * 24 * 60 * 60 * 1000},
                                {label: 'In the past 30 days', value: - 30 * 24 * 60 * 60 * 1000},
                                {label: 'In the past 6 months', value: - 6 * 30 * 24 * 60 * 60 * 1000},
                                {label: 'In the past year', value: -365 * 24 * 60 * 60 * 1000},
                            ]} />
                    </div>
                </section>
            )}

            { (fields?.task !== false) && (
                <section>
                    <h3>Task</h3>

                    <ul>
                        {TaskList.map(task => (
                            <li key={task}>
                                <Checkbox 
                                disabled={disabled}
                                    value={!!value.acceptableTasks ? !!value.acceptableTasks[task] : true} 
                                    onToggle={() => update(clone => {
                                        if (!clone.acceptableTasks) {
                                            clone.acceptableTasks = {}
                                            TaskList.forEach(t => clone.acceptableTasks![t] = true)
                                        }

                                        clone.acceptableTasks[task] = !clone.acceptableTasks[task]

                                        // If all tasks are acceptable, remove the search param for increased perfs.
                                        if (!keys(clone.acceptableTasks).find(t => !(clone.acceptableTasks![t]))) {
                                            delete clone.acceptableTasks
                                        }
                                    })}>
                                        {task}
                                </Checkbox>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            { (fields?.bounty !== false) && (
                <section>
                    <h3>Bounty</h3>

                    <ul>
                        {BountyList.map(bounty => (
                            <li key={bounty}>
                                <Checkbox 
                                    disabled={disabled}
                                    value={!!value.acceptableBounties ? !!value.acceptableBounties[bounty] : true} 
                                    onToggle={() => update(clone => {
                                        if (!clone.acceptableBounties) {
                                            clone.acceptableBounties = {}
                                            BountyList.forEach(b => clone.acceptableBounties![b] = true)
                                        }

                                        clone.acceptableBounties[bounty] = !clone.acceptableBounties[bounty]

                                        // If all bounties are acceptable, remove the search param for increased perfs.
                                        if (!keys(clone.acceptableBounties).find(b => !(clone.acceptableBounties![b]))) {
                                            delete clone.acceptableBounties
                                        }
                                    })}>
                                        {bounty}
                                </Checkbox>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    )
}

export default SearchParams
