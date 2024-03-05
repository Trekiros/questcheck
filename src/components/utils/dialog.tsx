import { FC, ReactNode, createContext, useContext, useState } from "react";
import Modal from "./modal";
import styles from './dialog.module.scss'
import { createPortal } from "react-dom";

type SetDialog = (
    question: ReactNode,
    callback: (result: boolean) => any,
    yesText?: string,
    noText?: string,
) => void

type Dialog = Parameters<SetDialog>

const dialogContext = createContext<{
    setDialog: SetDialog,
}|undefined>(undefined)

type PropType = {
    children: ReactNode,
}

export const DialogProvider: FC<PropType> = ({children}) => {
    const [dialog, setDialog] = useState<Dialog|null>(null)
    const [ question, callback, yesText, noText ] = dialog || []

    return (
        <dialogContext.Provider value={{ setDialog: (...args) => setDialog(args) }}>
            {children}

            { dialog && createPortal(
                <Modal className={styles.confirmDialog} onCancel={() => { callback?.(false); setDialog(null) }}>
                    { question }

                    <div className={styles.buttons}>
                        <button onClick={() => { callback?.(true); setDialog(null) }}>{yesText || "Yes"}</button>
                        <button onClick={() => { callback?.(false); setDialog(null) }}>{noText || "No"}</button>
                    </div>
                </Modal>,
                document.body
            )}
        </dialogContext.Provider>
    )
}

export function useDialog() {
    const value = useContext(dialogContext)
    if (!value) {
        throw new Error('No Context found for dialog')
    }
    return value
}