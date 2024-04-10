import { MutableUser, User } from "@/model/user";
import { BountyList, CreatablePlaytest, TaskList } from "@/model/playtest";
import React, { FC, ReactNode, useEffect, useMemo, useState } from "react";
import PDF from "@react-pdf/renderer";
import styles from './edit.module.scss'
import dynamic from "next/dynamic";
import { Prettify } from "@/model/utils";
import { usePromisedMemo } from "@/model/hooks";

// react-pdf can't be run server-side (and even if it could, it's probably a bad idea to)
// This ensures it is only ever imported & ran client-side
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  },
);

function escapeRegex(str: string) {
    const specials = ["-", "[", "]", "/", "{", "}", "(", ")", "*", "+", "?", ".", "\\", "^", "$", "|"]
  
    const regex = RegExp('[' + specials.join('\\') + ']', 'g')
  
    return str.replace(regex, "\\$&");
}

const templateCache: {[key: string]: string} = {}
async function getTemplate(name: string) {
    if (templateCache[name]) return templateCache[name]

    const response = await fetch('/templates/' + name)
    const text = await response.text()
    templateCache[name] = text
    return text
}

/*
    The template is a markdown document, but with the following extra properties:
    Any text surrounded by {{{triple curls}}} will be filled in by the software
    Any text surrounded by {{double curls}} must be filled in by the publisher
    Any text surrounded by {solo curls} must be filled in by server once a playtester is selected
*/
export async function generateContract(playtest: CreatablePlaytest, publisher: Prettify<Omit<MutableUser, "playerProfile"> & Pick<User, "emails">>, playtester?: MutableUser & { emails: string[] }): Promise<string> {
    if (playtest.bountyContract.type === "custom") {
        let text = playtest.bountyContract.text

        if (!!playtester) {
            text = text.replaceAll('{playtester}', `${playtester.userName} (${playtester.emails[0]})`)
                .replaceAll('{playtesterName}', `${playtester.playerProfile.creditName}`)
        }

        return text
    }

    let result = await getTemplate(playtest.bountyContract.templateVersion || 'v1.md')

    result = result.replaceAll('{{{publisher}}}', `${publisher.userName} (${publisher.emails[0]})`)

    for (const Task of TaskList) {
        const regex = new RegExp(`{{{task = "${escapeRegex(Task)}" =>\r?\n?((.|\n|\r)*?)\r?\n?}}}\r?`, 'g')
        
        if (Task === playtest.task) {
            result = result.replaceAll(regex, "$1")
        } else {
            result = result.replaceAll(regex, "")
        }
    }

    for (const Bounty of BountyList) {
        const regex = new RegExp(`{{{bounty = "${escapeRegex(Bounty)}" =>\r?\n?((.|\n|\r)*?)\r?\n?}}}\r?`, 'g')
        
        if (Bounty === playtest.bounty) {
            result = result.replaceAll(regex, "$1")
        } else {
            result = result.replaceAll(regex, "")
        }
    }

    const ndaRegex = /{{{NDA =>\r?\n?((.|\n|\r)*?)\r?\n?}}}\r?/g
    if (playtest.bountyContract.useNDA) {
        result = result.replaceAll(ndaRegex, "$1")
    } else {
        result = result.replaceAll(ndaRegex, "")
    }

    let i = 1
    while (result.includes('{{{i}}}')) {
        result = result.replace('{{{i}}}', i.toString())
        i++
    }

    if (!!playtester) {
        result = result.replaceAll('{playtester}', `${playtester.userName} (${playtester.emails[0]})`)
            .replaceAll('{playtesterName}', `${playtester.playerProfile.creditName}`)
    }

    return result
}

type MarkdownElement = 'h1'|'h2'|'h3'|'list'|'blockquote'|'param'|'link'|'bold-italic'|'bold'|'italic'|'spacing'|'text'

type MarkdownRenderFunction = ((content: ReactNode, type: MarkdownElement, href?: string) => ReactNode)

function parse(markdown: string, render: MarkdownRenderFunction): ReactNode {
    // Empty
    if (!markdown) return null;

    // Multiple paragraphs
    const paragraphs = markdown.split('\n')
    if (paragraphs.length > 1) return paragraphs.map(paragraph => render(parse(paragraph, render), 'text'))

    // Header
    if (markdown.match(/^(#+)\s/)) {
        const [hashes, ...rest] = markdown.split(' ')

        switch (hashes.length) {
            case 1: return render(parse(rest.join(' '), render), 'h1')
            case 2: return render(parse(rest.join(' '), render), 'h2')
            default: return render(parse(rest.join(' '), render), 'h3')
        }
    }

    // List
    if (markdown.match(/^(\s+)?\*\s.*/)) {
        const [_, ...rest] = markdown.split('* ')

        return render(parse(rest.join('* '), render), 'list')
    }

    // Blockquote
    if (markdown.match(/^\>\s.*/)) {
        const rest = markdown.substring(2)

        return render(parse(rest, render), 'blockquote')
    }

    // Template param
    const templateParamRegex = /{{(.*?)}}/
    const templateParamMatch = templateParamRegex.exec(markdown)
    if (templateParamMatch) {
        const index = templateParamMatch.index
        const matchKey = templateParamMatch[1]
        
        const beforeMatch = markdown.substring(0, index)
        const afterMatch = markdown.substring(index + matchKey.length + 4)

        return (
            render(
                <>
                    {parse(beforeMatch, render)}
                    {render(matchKey, 'param')}
                    {parse(afterMatch, render)}
                </>,
                'text'
            )
        )
    }

    // Links
    const linkRegex = /\[(.*?)\]\((.*?)\)/
    const linkMatch = linkRegex.exec(markdown)
    if (linkMatch) {
        const index = linkMatch.index
        const linkText = linkMatch[1]
        const href = linkMatch[2]

        const beforeMatch = markdown.substring(0, index)
        const afterMatch = markdown.substring(index + linkText.length + href.length + 4)

        return (
            render(
                <>
                    {parse(beforeMatch, render)}
                    {render(parse(linkText, render), 'link', href)}
                    {parse(afterMatch, render)}
                </>,
                'text'
            )
        )
    }
    
    // Bold-Italic
    const boldItalicRegex = /\*\*\*(.*?)\*\*\*/
    const boldItalicMatch = boldItalicRegex.exec(markdown)
    if (boldItalicMatch) {
        const index = boldItalicMatch.index
        const boldItaliced = boldItalicMatch[1]

        const beforeMatch = markdown.substring(0, index)
        const afterMatch = markdown.substring(index + boldItaliced.length + 6)

        return (
            render(
                <>
                    {parse(beforeMatch, render)}
                    {render(parse(boldItaliced, render), 'bold-italic')}
                    {parse(afterMatch, render)}
                </>,
                'text'
            )
        )
    }

    // Bold
    const boldRegex = /\*\*(.*?)\*\*/
    const boldMatch = boldRegex.exec(markdown)
    if (boldMatch) {
        const index = boldMatch.index
        const bolded = boldMatch[1]

        const beforeMatch = markdown.substring(0, index)
        const afterMatch = markdown.substring(index + bolded.length + 4)

        return (
            render(
                <>
                    {parse(beforeMatch, render)}
                    {render(parse(bolded, render), 'bold')}
                    {parse(afterMatch, render)}
                </>,
                'text'
            )
        )
    }

    // Italics
    const italicsRegex = /\*(.*?)\*/
    const italicsMatch = italicsRegex.exec(markdown)
    if (italicsMatch) {
        const index = italicsMatch.index
        const italicsed = italicsMatch[1]

        const beforeMatch = markdown.substring(0, index)
        const afterMatch = markdown.substring(index + italicsed.length + 2)

        return (
            render(
                <>
                    {parse(beforeMatch, render)}
                    {render(parse(italicsed, render), 'italic')}
                    {parse(afterMatch, render)}
                </>,
                'text'
            )
        )
    }

    // Spacing
    if ((markdown === "___") || (markdown === "___\r")) {
        return render(null, 'spacing')
    }

    // Default: just text.
    return render(markdown, 'text')
}

const TemplateInput: FC<{ name: string, playtest: CreatablePlaytest, onChange: (newValue: string) => void}> = ({ name, playtest, onChange }) => {
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
            className={((!optional && !internalValue) || (internalValue.length > 600)) ? styles.invalid : undefined}
            placeholder={name} 
            style={{ width: 'min(100%, ' + (2 + (internalValue.length || name.length)) + 'ch)' }}
            value={internalValue}
            onChange={e => setInternalValue(e.target.value)}
            onBlur={() => onChange(internalValue)} />
    )
}

export const ContractTemplateEditor: FC<{ user: MutableUser, emails: string[], playtest: CreatablePlaytest, onChange: (newTemplate: {[key: string]: string}) => void }> = ({ user, emails, playtest, onChange }) => {
    let i = 0

    const contract = usePromisedMemo(
        async () => await generateContract(playtest, { ...user, emails }),
        [playtest, user, emails],
    )

    return (
        <div className={styles.ContractTemplateEditor}>
            {parse(contract || "", (content, type, href) => {
                switch (type) {
                    case 'h1': return <h1 key={i++}>{content}</h1>
                    case 'h2': return <h2 key={i++}>{content}</h2>
                    case 'h3': return <h3 key={i++}>{content}</h3>
                    case 'list': return <ul key={i++}><li>{content}</li></ul>
                    case 'blockquote': return <blockquote key={i++}>{content}</blockquote>
                    case 'link': return <a href={href} key={i++}>{content}</a>
                    case 'bold-italic': return <em key={i++}><b>{content}</b></em>
                    case 'bold': return <strong key={i++}>{content}</strong>
                    case 'italic': return <em key={i++}>{content}</em>
                    case 'spacing': return <hr key={i++} />
                    case 'text': return <span key={i++}>{content}</span>
                    case 'param': return (
                        <TemplateInput 
                            name={String(content)}
                            playtest={playtest}
                            onChange={newValue => (playtest.bountyContract.type === 'template') && onChange({ ...playtest.bountyContract.templateValues, [String(content)]: newValue })}
                            key={i++} />
                    )
                }
            })}
        </div>
    )
}

export const ContractPDF: FC<{ user: Omit<MutableUser, "playerProfile">, playtest: CreatablePlaytest, text: string }> = ({ user, playtest, text }) => {
    return (
        <PDFViewer showToolbar={true} width='100%' height='600px'>
            <PDF.Document
                title={playtest.name}
                author={user.userName}>
                    <PDF.Page
                        style={{ padding: '1in', fontSize: '9pt' }}
                        orientation="portrait"
                        size="LETTER">
                            <PDF.View>
                                {parse(text, (content, type, href) => {
                                    switch (type) {
                                        case 'h1': return <PDF.Text style={{ fontSize: '24pt' }}>{content}</PDF.Text>
                                        case 'h2': return <PDF.Text style={{ fontSize: '18pt' }}>{content}</PDF.Text>
                                        case 'h3': return <PDF.Text style={{ fontSize: '14pt' }}>{content}</PDF.Text>
                                        case 'list': return <PDF.Text style={{ paddingLeft: '8px'}}>- {content}</PDF.Text>
                                        case 'blockquote': return <PDF.Text style={{ color: "#555" }}>{content}</PDF.Text>
                                        case 'link': return <PDF.Link href={href}>{content}</PDF.Link>
                                        case 'bold-italic': return <PDF.Text style={{ fontFamily: 'Helvetica-BoldOblique' }}>{content}</PDF.Text>
                                        case 'bold': return <PDF.Text style={{ fontFamily: 'Helvetica-Bold' }}>{content}</PDF.Text>
                                        case 'italic': return <PDF.Text style={{ fontFamily: 'Helvetica-Oblique' }}>{content}</PDF.Text>
                                        case 'spacing': return <PDF.View style={{ marginBottom: '8px' }} />
                                        case 'text': return  <PDF.Text>{content}</PDF.Text>
                                        case 'param': {
                                            if ((playtest.bountyContract.type === 'template') && (playtest.bountyContract.templateValues[String(content)])) {
                                                return <PDF.Text>{playtest.bountyContract.templateValues[String(content)]}</PDF.Text>
                                            } else if (!String(content).endsWith('(optional)')) {
                                                return <PDF.Text style={{ color: "red"}}>{`{${content}}`}</PDF.Text>
                                            } else return null;
                                        }
                                    }
                                })}
                            </PDF.View>
                    </PDF.Page>
            </PDF.Document>
        </PDFViewer>
    )
}