import { FC } from "react"
import styles from './edit.module.scss'
import { MutablePlaytest, PlaytestSchema } from "@/model/playtest"
import { MutableUserSchema } from "@/model/user"
import MarkdownTextArea from "../utils/markdownTextArea"

type PropType = {
    value: MutablePlaytest, 
    onChange: (newValue: MutablePlaytest) => void,
    disabled?: boolean,
    errorPaths: { [path in keyof MutablePlaytest]?: true },
}

const PlaytestEditor: FC<PropType> = ({ value, onChange, disabled, errorPaths }) => {
    return (
        <div className={`${styles.playtestEditor} ${disabled && styles.disabled}`}>
            <section className={`tooltipContainer ${styles.row}`}>
                <label>Name:</label>
                <input
                    className={errorPaths["name"] && styles.invalid}
                    type="text"
                    value={value.name}
                    maxLength={PlaytestSchema.shape.name.maxLength!}
                    onChange={e => onChange({...value, name: e.target.value })}
                    onBlur={() => onChange({ ...value, name: value.name.trim() })} />

                {errorPaths["name"] && (
                    <div className="tooltip" style={{ background: "#322" }}>
                        {value.name.length < PlaytestSchema.shape.name.minLength! && <p>The name should be at least {PlaytestSchema.shape.name.minLength!} characters long</p>}
                        {value.name.length > PlaytestSchema.shape.name.maxLength! && <p>The name must be no more than {PlaytestSchema.shape.name.maxLength!} characters long</p>}
                    </div>
                )}
            </section>

            <section className={styles.row}>
                <label>Description</label>

                <MarkdownTextArea
                    value={value.description}
                    onChange={e => onChange({ ...value, description: e.target.value })}
                    maxLength={PlaytestSchema.shape.description.maxLength!} />
            </section>
        </div>
    )
}

export default PlaytestEditor