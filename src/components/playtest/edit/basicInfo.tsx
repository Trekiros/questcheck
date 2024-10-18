import TagInput from "../../utils/tagInput"
import { EnginesList, GenreList, MaterialList, SystemsList } from "@/model/tags"
import { tagClassName } from "../searchParams"
import Calendar from "../../utils/calendar"
import { FC } from "react"
import { EditorPropType } from "./edit"
import styles from './edit.module.scss'
import { PlaytestSchema, TaskList } from "@/model/playtest"
import Select from "@/components/utils/select"
import MarkdownTextArea from "@/components/utils/markdownTextArea"

const BasicInfoEditor: FC<Omit<EditorPropType, 'confirmBtn'>> = ({ value, onChange, disabled, errorPaths }) => {
    return (
        <div className={styles.vstack}>
            <section className={`tooltipContainer ${styles.row}`}>
                <label>Name:</label>
                <input
                    placeholder="Playtest name..."
                    className={errorPaths["name"] && styles.invalid}
                    type="text"
                    value={value.name}
                    maxLength={PlaytestSchema.shape.name.maxLength!}
                    onChange={e => onChange({...value, name: e.target.value })}
                    onBlur={() => onChange({ ...value, name: value.name.trim() })} />

                {errorPaths["name"] && (
                    <div className="tooltip">
                        {value.name.length < PlaytestSchema.shape.name.minLength! && <p>The name should be at least {PlaytestSchema.shape.name.minLength!} characters long</p>}
                        {value.name.length > PlaytestSchema.shape.name.maxLength! && <p>The name must be no more than {PlaytestSchema.shape.name.maxLength!} characters long</p>}
                    </div>
                )}
            </section>

            <section className={styles.row}>
                <label className="tooltipContainer">
                    Application deadline:
                    <div className="tooltip" style={{ background: "#322" }}>
                        Applications will automatically close after this date. You can also close applications manually.
                    </div>
                </label>

                <Calendar
                    className={errorPaths['applicationDeadline'] && styles.invalid}
                    value={value.applicationDeadline || undefined}
                    onChange={newValue => newValue && onChange({ ...value, applicationDeadline: newValue })}
                    min={Date.now() + 1000 * 60 * 60 * 24 * 2}
                    placeholder="Applications must remain open at least 2 days..."/>
            </section>

            <section className={styles.row}>
                <label>Tags:</label>
                
                <TagInput
                    tagClassName={tagClassName}
                    placeholder="Search or create tags..."
                    categories={{
                        'Game:': SystemsList,
                        'Material:': MaterialList,
                        'Engine:': EnginesList,
                        'Genre:': GenreList,
                    }}
                    values={value.tags}
                    onChange={newValues => onChange({ ...value, tags: newValues })}
                    disabled={disabled} 
                    maxTags={20}/>
            </section>

            <section className={styles.row}>
                <label>Maximum playtesters:</label>
                
                <input
                    placeholder="(optional)..."
                    type='number'
                    className={errorPaths['maxPositions'] ? styles.invalid : undefined}
                    value={value.maxPositions}
                    min={1}
                    onChange={e => onChange({ ...value, maxPositions: e.target.value ? Number(e.target.value) : undefined})} />
            </section>

            <section className={styles.row}>
                <label>Playtest Type:</label>

                <div className={styles.vstack}>
                    <Select
                        options={TaskList.map(option => ({ value: option, label: option }))}
                        value={value.task}
                        onChange={newValue => onChange({ ...value, task: newValue })} />

                    <MarkdownTextArea
                        placeholder="Details..."
                        value={value.description}
                        onChange={e => onChange({ ...value, description: e.target.value })}
                        maxLength={PlaytestSchema.shape.description.maxLength!} />
                </div>
            </section>

            <section className={styles.row}>
                <label>Private Description:</label>

                <div className={styles.vstack}>
                    <p>
                        The following description will only be shown to playtesters after you have accepted their application to your playtest.
                        Use it to give them links to the playtest materials and any other resources necessary to run the playtest.
                    </p>

                    <MarkdownTextArea
                        placeholder="You can find the playtest material at..."
                        value={value.privateDescription}
                        onChange={e => onChange({...value, privateDescription: e.target.value })}
                        maxLength={PlaytestSchema.shape.privateDescription.maxLength!} />
                </div>
            </section>

            <section className={styles.row}>
                <label>Feedback form URL:</label>

                <div className={styles.vstack}>
                    <p>
                        This link will only be shown to playtesters after you have accepted their application to your playtest.
                        Use it to give them a link to an online survey of your choice.
                    </p>

                    <input 
                        placeholder="https://..."
                        type="text"
                        className={errorPaths['feedbackURL'] ? styles.invalid : undefined}
                        value={value.feedbackURL}
                        onChange={e => onChange({ ...value, feedbackURL: e.target.value })} />
                </div>
            </section>
        </div>
    )
}

export default BasicInfoEditor