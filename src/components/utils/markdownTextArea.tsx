import { ComponentProps, FC, useState } from "react";
import styles from './markdownTextArea.module.scss'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faPen } from "@fortawesome/free-solid-svg-icons";
import Markdown from "./markdown";
import AutoResizeTextArea from "./autoResizeTextArea";

const MarkdownTextArea: FC<ComponentProps<"textarea"> & { maxLength?: number }> = ({ maxLength, ...props }) => {
    const [preview, setPreview] = useState(false)

    const value = String(props.value)

    return (
        <div className={styles.mdtextarea}>
            <button onClick={() => setPreview(!preview)} disabled={props.disabled} className={styles.previewToggle}>
                { preview ? <>
                    <FontAwesomeIcon icon={faPen} />
                    Edit
                </> : <>
                    <FontAwesomeIcon icon={faEye} />
                    Preview
                </>}
            </button>
                    
            { preview ? (
                <div className={styles.preview}>
                    <Markdown text={value} />
                </div>
            ) : <>
                <AutoResizeTextArea
                    { ...props }
                    className={`${props.className} ${maxLength !== undefined && value.length > maxLength && styles.invalid}`} />
                
                { maxLength !== undefined && (
                    <label>{value.length}/{maxLength}</label>

                )}
            </>}
        </div>
    )
}

export default MarkdownTextArea