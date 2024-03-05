import { FC, ReactNode, useEffect, useState } from "react"
import styles from './edit.module.scss'
import { BountyList, MutablePlaytest, MutablePlaytestSchema, PlaytestSchema, TaskList } from "@/model/playtest"
import { MutableUserSchema } from "@/model/user"
import MarkdownTextArea from "../utils/markdownTextArea"
import TagInput from "../utils/tagInput"
import { EnginesList, GenreList, SystemsList } from "@/model/tags"
import { tagClassName } from "./searchParams"
import Calendar from "../utils/calendar"
import Select from "../utils/select"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faChevronRight } from "@fortawesome/free-solid-svg-icons"

type PropType = {
    value: MutablePlaytest, 
    onChange: (newValue: MutablePlaytest) => void,
    disabled?: boolean,
    errorPaths: { [path in keyof MutablePlaytest]?: true },
    confirmBtn: ReactNode,
}

const StepsList = ['Basic Info', 'Bounty', 'Feedback Form'] as const
type Step = typeof StepsList[number]

const PlaytestEditor: FC<PropType> = ({ value, onChange, disabled, errorPaths, confirmBtn }) => {
    const [step, setStep] = useState(0)
    const [maxStep, setMaxStep] = useState(0)

    return (
        <div className={`${styles.playtestEditor} ${disabled && styles.disabled}`}>
            <div className={styles.steps}>
                { StepsList.map((stepName, i) => <>
                    <button 
                        disabled={maxStep < i}
                        onClick={() => setStep(i)}
                        className={`${styles.step} ${(i === step) && styles.active}`}>
                            {stepName}
                    </button>

                    { (i !== StepsList.length - 1) && (
                        <FontAwesomeIcon icon={faChevronRight} />
                    )}
                </>)}
            </div>

            { (step === 0) && <BasicInfoEditor value={value} onChange={onChange} disabled={disabled} errorPaths={errorPaths} /> }
            { (step === 1) && <BountyEditor value={value} onChange={onChange} disabled={disabled} errorPaths={errorPaths} /> }

            <div className={styles.actions}>
                <button
                    disabled={step === 0}
                    onClick={() => setStep(step - 1)}>
                        Previous
                </button>

                { (step === StepsList.length - 1) ? confirmBtn : (
                    <button onClick={() => { setStep(step + 1); setMaxStep(Math.max(maxStep, step + 1))}}>
                        Next
                    </button>
                )}
            </div>
        </div>
    )
}

const BasicInfoEditor: FC<Omit<PropType, 'confirmBtn'>> = ({ value, onChange, disabled, errorPaths }) => {
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
                    <div className="tooltip" style={{ background: "#322" }}>
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
                        'Engine:': EnginesList,
                        'Genre:': GenreList,
                    }}
                    values={value.tags}
                    onChange={newValues => onChange({ ...value, tags: newValues })}
                    disabled={disabled} 
                    maxTags={20}/>
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
        </div>
    )
}

type ContractTemplateParams = {}

function generateContract(templateParams: ContractTemplateParams) {
    return ''
}

const defaultContractParams: ContractTemplateParams = {}

const BountyEditor: FC<Omit<PropType, 'confirmBtn'>> = ({ value, onChange, disabled, errorPaths }) => {
    const [templateParams, setTemplateParams] = useState<ContractTemplateParams>(value.bountyContract.type === 'template' ? value.bountyContract : defaultContractParams)

    useEffect(() => {
        if (value.bountyContract.type === 'template') {
            setTemplateParams(templateParams)
        }
    }, [value.bountyContract])

    return (
        <div className={styles.vstack}>
            <section className={styles.row}>
                <label className="tooltipContainer">
                    Bounty Type:
                </label>

                <div className={styles.vstack}>
                    <p>
                        Bounties are the incentive for playtesters to participate in your playtests.
                        They are the rewards you commit to giving them in exchange for their time & attention.
                    </p>

                    <Select
                        options={BountyList.map((option, i) => ({
                            value: option,
                            label: (i === 0) ? (option + ' (Not recommended)')
                                : (option + ' ' + Array.from({length: i}, () => '⭐').join(''))
                        }))}
                        value={value.bounty}
                        onChange={newValue => newValue && onChange({ ...value, bounty: newValue })} />
                </div>
            </section>

            <section className={styles.row}>
                <label>Bounty Details:</label>

                <div className={styles.vstack}>
                    <p>
                        The section below will be shown to every user before they apply to your playtest. 
                        Use it to describe exactly what type of bounty will be given, and how.
                    </p>

                    <MarkdownTextArea
                        className={errorPaths['bountyDetails'] && styles.invalid}
                        placeholder="Details..."
                        value={value.bountyDetails}
                        onChange={e => onChange({ ...value, bountyDetails: e.target.value })}
                        maxLength={MutablePlaytestSchema.shape.bountyDetails.maxLength!}/>
                </div>
            </section>

            <section className={styles.row}>
                <label>Bounty Contract:</label>

                <div className={styles.vstack}>
                    <p>
                        This contract will be shown to every user before they apply to your playtest.
                        By accepting an application, you agree to the contract with the playtester.
                    </p>

                    <p>
                        Note: This contract is what regulates your relationship with your playtesters.
                        This website only exists to facilitate your meeting playtesters - by publishing a playtest, you agree that Quest Check and Trekiros will not arbitrate nor be held responsible for any dispute between you and your playtesters related to the playtest.
                    </p>

                    <div className={styles.contractEditor}>
                        <div className={styles.type}>
                            <button
                                disabled={disabled}
                                className={value.bountyContract.type === 'template' ? styles.active : undefined}
                                onClick={() => onChange({ ...value, bountyContract: { type: 'template', ...templateParams }})}>
                                    Use Template
                            </button>

                            <button
                                disabled={disabled}
                                className={value.bountyContract.type === 'custom' ? styles.active : undefined}
                                onClick={() => {
                                    if (value.bountyContract.type === 'custom') return;

                                    setTemplateParams(value.bountyContract)
                                    onChange({ ...value, bountyContract: { type: 'custom', text: generateContract(value.bountyContract)}})
                                }}>
                                    
                                    Customize Contract
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default PlaytestEditor