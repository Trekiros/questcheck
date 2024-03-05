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
import { faChevronRight, faEye, faPen } from "@fortawesome/free-solid-svg-icons"
import { ContractPDF, generateContract } from "@/model/contract"
import { trpcClient } from "@/server/utils"
import ReactMarkdown from "react-markdown"

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
        </div>
    )
}

type ContractTemplateParams = {[key: string]: string}
const defaultContractParams: ContractTemplateParams = {}

const TemplateInput: FC<{ name: string, playtest: MutablePlaytest, onChange: (newValue: string) => void}> = ({ name, playtest, onChange }) => {
    const [internalValue, setInternalValue] = useState('')
    const optional = name.endsWith('(optional)')

    useEffect(() => {
        if (playtest.bountyContract.type === 'template') {
            setInternalValue(playtest.bountyContract.templateValues[name] || '')
        }
    }, [playtest])

    return (
        <input
            type="text" 
            className={(!optional && !internalValue) ? styles.invalid : undefined}
            placeholder={name} 
            style={{ width: (2 + (internalValue.length || name.length)) + 'ch' }}
            value={internalValue}
            onChange={e => setInternalValue(e.target.value)}
            onBlur={() => onChange(internalValue)} />
    )
}

const BountyEditor: FC<Omit<PropType, 'confirmBtn'>> = ({ value, onChange, disabled, errorPaths }) => {
    const userQuery = trpcClient.users.getSelf.useQuery()
    const [preview, setPreview] = useState(false)
    
    // This state allows the UI to save the user's template params if they temporarily switch to the manual contract mode
    const [templateParams, setTemplateParams] = useState<ContractTemplateParams>(value.bountyContract.type === 'template' ? value.bountyContract.templateValues : defaultContractParams)
    useEffect(() => {
        if (value.bountyContract.type === 'template') {
            setTemplateParams(value.bountyContract.templateValues)
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
                        Important Note:
                        <br />
                        The contract you end up signing with your playtester is what will arbitrate your relationship with the playtester.
                        Quest Check only exists to facilitate your meeting with playtesters, not to moderate it.
                        By publishing a playtest on this website, you agree that Quest Check is not your lawyer, does not provide legal advice, 
                        and will not be held accountable for any legal dispute between you and your playtesters related to your playtest.
                    </p>

                    { !!userQuery.data && <div className={styles.contractEditor}>
                        <div className={styles.type}>
                            <button
                                disabled={disabled}
                                className={value.bountyContract.type === 'template' ? styles.active : undefined}
                                onClick={() => {
                                    if (value.bountyContract.type === 'template') return;

                                    setPreview(false)
                                    onChange({ ...value, bountyContract: { type: 'template', templateValues: templateParams }})
                                }}>
                                    Use Template
                            </button>

                            <button
                                disabled={disabled}
                                className={value.bountyContract.type === 'custom' ? styles.active : undefined}
                                onClick={() => {
                                    if (value.bountyContract.type === 'custom') return;

                                    setPreview(false)
                                    setTemplateParams(value.bountyContract.templateValues)
                                    onChange({ ...value, bountyContract: { type: 'custom', text: generateContract(value, userQuery.data!)}})
                                }}>
                                    Customize Contract
                            </button>

                            <button
                                disabled={disabled}
                                className={styles.active}
                                onClick={() => setPreview(!preview)}>
                                    {preview ? <>
                                        <FontAwesomeIcon icon={faPen} />
                                        Edit
                                    </> : <>
                                        <FontAwesomeIcon icon={faEye} />
                                        Preview
                                    </>}
                            </button>
                        </div>

                        { preview ? (
                            <ContractPDF 
                            user={userQuery.data!} 
                            playtest={value} 
                            text={generateContract(value, userQuery.data!)} />
                        ) : (
                            value.bountyContract.type === 'template' ? (
                                <div className={`${styles.templateEditor} ${preview || styles.edit}`}>
                                    <ReactMarkdown
                                        allowedElements={[
                                            "h1", "h2", "h3", "p", "strong", "em", "a", "ul", "li", "hr", "blockquote", "code",
                                        ]}
                                        components={{
                                            code: ({ children }) => <TemplateInput 
                                                name={String(children)} 
                                                playtest={value}
                                                onChange={(newValue) => (value.bountyContract.type === 'template') && onChange({
                                                    ...value, 
                                                    bountyContract: { 
                                                        type: 'template', 
                                                        templateValues: { 
                                                            ...value.bountyContract.templateValues, 
                                                            [String(children)]: newValue,
                                                        },
                                                    },                                    
                                                })} />
                                        }}>
                                            {generateContract(value, userQuery.data!).replaceAll(/{{(.*?)}}/g, '`$1`')}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <div className={styles.templateEditor}>
                                    <MarkdownTextArea
                                        value={value.bountyContract.text}
                                        onChange={e => onChange({
                                            ...value,
                                            bountyContract: {
                                                type: "custom",
                                                text: e.target.value,
                                            },
                                        })}
                                        maxLength={5000}
                                        />
                                </div>
                            )
                        )}
                    </div> }
                </div>
            </section>
        </div>
    )
}

export default PlaytestEditor