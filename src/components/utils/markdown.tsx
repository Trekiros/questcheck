import { FC } from 'react'
import ReactMarkdown from 'react-markdown'
import styles from './markdown.module.scss'
import Link from 'next/link'

type PropType = {
    text: string,
}

const Markdown: FC<PropType> = ({ text }) => {
    return (
        <div className={styles.markdown}>
            <ReactMarkdown
                disallowedElements={[
                    // These are disallowed for security reasons, because users can send each other some html content.
                    "dialog",
                    "iframe",
                    "input",
                    "audio",
                    "script",
                    "video",
                    'img',
                    'image',
                ]}
                components={{
                    // h2 is demoted to h2 for SEO reasons: a web page should only have a single h1 tag.
                    h1: ({ children, ...props}) => <h2 {...props}>{children}</h2>,
                    a: ({ children, href }) => <Link href={href!} target="_blank">{children}</Link>
                }}>
                    {text}
            </ReactMarkdown>
        </div>
    )
}

export default Markdown