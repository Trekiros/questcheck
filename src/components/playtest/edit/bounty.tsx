import MarkdownTextArea from "../../utils/markdownTextArea"
import Select from "../../utils/select"
import { ContractPDF, ContractTemplateEditor, generateContract } from "./contract"
import Checkbox from "../../utils/checkbox"
import styles from './edit.module.scss'
import { FC, useEffect, useState } from "react"
import { BountyList, CreatablePlaytestSchema, CurrentTemplateVersion } from "@/model/playtest"
import { EditorPropType } from "./edit"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEye, faPen } from "@fortawesome/free-solid-svg-icons"
import { useUserCtx } from "@/components/utils/page"
import { keys } from "@/model/utils"
import { usePromisedMemo } from "@/model/hooks"

type ContractTemplateParams = {[key: string]: string}
const defaultContractParams: ContractTemplateParams = {}

const BountyEditor: FC<Omit<EditorPropType, 'confirmBtn'>> = ({ value, onChange, disabled, errorPaths, emails }) => {
    const userCtx = useUserCtx()
    const [preview, setPreview] = useState(false)
    
    // This state allows the UI to save the user's template params if they temporarily switch to the manual contract mode
    const [templateVersion, setTemplateVersion] = useState<string|undefined>(CurrentTemplateVersion)
    const [templateParams, setTemplateParams] = useState<ContractTemplateParams>(value.bountyContract.type === 'template' ? value.bountyContract.templateValues : defaultContractParams)
    const [useNDA, setUseNDA] = useState(value.bountyContract.type === 'template' ? value.bountyContract.useNDA : false)
    useEffect(() => {
        if (value.bountyContract.type === 'template') {
            setTemplateParams(value.bountyContract.templateValues)
            setUseNDA(value.bountyContract.useNDA)
            setTemplateVersion(value.bountyContract.templateVersion)
        }
    }, [value.bountyContract])


    const contract = usePromisedMemo(
        async () => !userCtx ? null : await generateContract(value, { ...userCtx.user!, emails }),
        [value, userCtx, emails]
    )

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
                        maxLength={CreatablePlaytestSchema.shape.bountyDetails.maxLength!}/>
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

                    { !!userCtx?.user && <div className={styles.contractEditor}>
                        <div className={styles.type}>
                            <button
                                disabled={disabled}
                                className={value.bountyContract.type === 'template' ? styles.active : undefined}
                                onClick={() => {
                                    if (value.bountyContract.type === 'template') return;

                                    setPreview(false)
                                    onChange({ ...value, bountyContract: { type: 'template', templateValues: templateParams, useNDA, templateVersion }})
                                }}>
                                    Use Template
                            </button>

                            <button
                                disabled={disabled}
                                className={value.bountyContract.type === 'custom' ? styles.active : undefined}
                                onClick={async () => {
                                    if (value.bountyContract.type === 'custom') return;

                                    let template = (await generateContract(value, { ...userCtx.user!, emails })) || ""
                                    for (const templateKey of keys(value.bountyContract.templateValues)) {
                                        template = template.replaceAll(
                                            `{{${templateKey}}}`,
                                            value.bountyContract.templateValues[templateKey]!
                                        )
                                    }

                                    setPreview(false)
                                    setTemplateParams(value.bountyContract.templateValues)
                                    onChange({ ...value, bountyContract: { type: 'custom', text: template}})
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
                            user={userCtx.user!} 
                            playtest={value} 
                            text={contract || ""} />
                        ) : (
                            value.bountyContract.type === 'template' ? <>
                                <div className={styles.templateOptions}>
                                    <h4>Template Options:</h4>
                                    <Checkbox
                                        className={styles.checkbox}
                                        value={value.bountyContract.useNDA}
                                        onToggle={(newValue) => (value.bountyContract.type === 'template') && onChange({ ...value, bountyContract: { ...value.bountyContract, useNDA: newValue }})}>
                                            Include a Non-Disclosure Agreement (NDA) ?
                                    </Checkbox>
                                </div>
                                <ContractTemplateEditor
                                    playtest={value}
                                    emails={emails}
                                    user={userCtx.user}
                                    onChange={newTemplate => onChange({ 
                                        ...value,
                                        bountyContract: {
                                            type: 'template',
                                            useNDA: useNDA,
                                            templateValues: newTemplate,
                                            templateVersion: templateVersion,
                                        }
                                    })} />
                            </> : (
                                <div>
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

export default BountyEditor