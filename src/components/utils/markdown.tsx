import { FC, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
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
                    a: ({ href, children, ...props }) => {
                        if (!href) return null;

                        if (!!children) {
                            const text = String(children)

                            if (text !== href) return children
    
                            const urlRegex = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/
    
                            if (!text.match(urlRegex)) return children;
                        }
                        
                        return (
                            <Link {...props} href={href!} target="_blank">{href}</Link>
                        )
                    },
                    h1: ({ children, ...props}) => <h2 {...props}>{children}</h2>
                }}>
                    {text}
            </ReactMarkdown>
        </div>
    )
}

export default Markdown