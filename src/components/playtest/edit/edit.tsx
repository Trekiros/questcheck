import { FC, ReactNode, useEffect, useState } from "react"
import styles from './edit.module.scss'
import { CreatablePlaytest } from "@/model/playtest"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faChevronRight } from "@fortawesome/free-solid-svg-icons"
import BasicInfoEditor from "./basicInfo"
import BountyEditor from "./bounty"

export type EditorPropType = {
    value: CreatablePlaytest, 
    onChange: (newValue: CreatablePlaytest) => void,
    disabled?: boolean,
    errorPaths: { [path in keyof CreatablePlaytest]?: true },
    confirmBtn: ReactNode,
}

const StepsList = ['1. Basic Info', '2. Bounty'] as const

const PlaytestEditor: FC<EditorPropType> = ({ value, onChange, disabled, errorPaths, confirmBtn }) => {
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
                    onClick={() => {
                        setStep(step - 1)
                        window.scrollTo(0,0)
                    }}>
                        Previous
                </button>

                { (step === StepsList.length - 1) ? confirmBtn : (
                    <button onClick={() => { 
                        setStep(step + 1); 
                        setMaxStep(Math.max(maxStep, step + 1))
                        window.scrollTo(0,0)
                    }}>
                        Next
                    </button>
                )}
            </div>
        </div>
    )
}



export default PlaytestEditor