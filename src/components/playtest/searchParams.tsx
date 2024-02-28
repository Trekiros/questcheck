import { BountyList, PlaytestSearchParams, TaskList } from "@/model/playtest";
import { FC } from "react";
import styles from './searchParams.module.scss'
import { TagSuggestions } from "@/model/tags";
import TagInput from "../utils/tagInput";
import Calendar from "../utils/calendar";
import Checkbox from "../utils/checkbox";


type PropType = {
    value: PlaytestSearchParams,
    onChange: (newValue: PlaytestSearchParams) => void,
}

const SearchParams: FC<PropType> = ({ value, onChange }) => {
    function update(callback: (clone: PlaytestSearchParams) => void) {
        const clone = structuredClone(value)
        callback(clone)
        onChange(clone)
    }

    return (
        <div className={styles.searchParams}>
            <h2>Advanced Search</h2>
            
            <section>
                <h3>Tags:</h3>

                <div>
                    <label>Must include:</label>
                    <TagInput
                        values={value.includeTags || []}
                        onChange={newValue => update(clone => {
                            if (newValue.length) clone.includeTags = newValue;
                            else delete clone.includeTags;
                        })}
                        suggestions={TagSuggestions} />
                </div>
                <div>
                    <label>Cannot include:</label>
                    <TagInput
                        values={value.excludeTags || []}
                        onChange={newValue => update(clone => {
                            if (newValue.length) clone.excludeTags = newValue;
                            else delete clone.excludeTags;
                        })}
                        suggestions={TagSuggestions} />
                </div>
            </section>

            <section>
                <h3>Date</h3>

                <div className={styles.dates}>
                    <div>
                        <Calendar
                            value={value.after}
                            onChange={newValue => update(clone => clone.after = newValue)}
                            min={Date.now()}
                            max={value.before} 
                            placeholder="After..."/>
                    </div>
                    <div>
                        <Calendar
                            value={value.before}
                            onChange={newValue => update(clone => clone.before = newValue)}
                            min={Math.max(Date.now(), value.after || 0)}
                            placeholder="Before..." />
                    </div>
                </div>
            </section>

            <section>
                <h3>Task</h3>

                <ul>
                    {TaskList.map(task => (
                        <li key={task}>
                            <Checkbox 
                                value={!!value.acceptableTasks ? !!value.acceptableTasks[task] : true} 
                                onToggle={() => update(clone => {
                                    console.log(clone)
                                    if (!clone.acceptableTasks) {
                                        clone.acceptableTasks = {}
                                        TaskList.forEach(t => clone.acceptableTasks![t] = true)
                                    }
                                    clone.acceptableTasks[task] = !clone.acceptableTasks[task]
                                })}>
                                    {task}
                            </Checkbox>
                        </li>
                    ))}
                </ul>
            </section>

            <section>
                <h3>Bounty</h3>

                <ul>
                    {BountyList.map(bounty => (
                        <li key={bounty}>
                            <Checkbox 
                                value={!!value.acceptableBounties ? !!value.acceptableBounties[bounty] : true} 
                                onToggle={() => update(clone => {
                                    console.log(clone)
                                    if (!clone.acceptableBounties) {
                                        clone.acceptableBounties = {}
                                        BountyList.forEach(t => clone.acceptableBounties![t] = true)
                                    }
                                    clone.acceptableBounties[bounty] = !clone.acceptableBounties[bounty]
                                })}>
                                    {bounty}
                            </Checkbox>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    )
}

export default SearchParams
