import { MutableUser } from "@/model/user";
import { CreatablePlaytest } from "@/model/playtest";
import React, { FC, ReactNode, useEffect, useState } from "react";
import PDF from "@react-pdf/renderer";
import contractTemplate from './contractTemplate.md'
import styles from './edit.module.scss'
import dynamic from "next/dynamic";

// react-pdf can't be run server-side (and even if it could, it's probably a bad idea to)
// This ensures it is only ever imported & ran client-side
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  },
);



/*
    The template is a markdown document, but with the following extra properties:
    Any text surrounded by {{{triple curls}}} will be filled in by the software
    Any text surrounded by {{double curls}} must be filled in by the publisher
    Any text surrounded by {solo curls} must be filled in by server once a playtester is selected
*/
export function generateContract(playtest: CreatablePlaytest, publisher: MutableUser & { emails: string[] }, playtester?: MutableUser & { emails: string[] }): string {
    if (playtest.bountyContract.type === "custom") {
        let text = playtest.bountyContract.text

        if (!!playtester) {
            text = text.replaceAll('{playtester}', `${playtester.userName} (${playtester.emails[0]})`)
        }

        return text
    }

    let result = contractTemplate
        .replaceAll('{{{publisher}}}', `${publisher.userName} (${publisher.emails[0]})`)
        .replace('{{{task}}}', 
            (playtest.task ==='Read-through + Feedback') ? (
                "The Publisher will provide the Playtester with playtest material once this agreement has been signed by both parties. "
              + "The playtest material is around {{Page Count}} pages long. "
              + "The details for how to access this playtest material, as well as a survey link to collect feedback, will be communicated to the Playtester through the Quest Check website when this agreement comes into effect. "
              + "The Playtester agrees to read through the playtest material, and fill in the survey, before {{Deadline}}. "
              + "\n\n{{Additional Details (optional)}}"
            ) : (playtest.task === 'One Shot ran by the Publisher') ? (
                "The Publisher will run a game session on {{Date}} from {{Start Time}} to {{End Time}} (GMT + {{Time Zone}}), at {{Address or VTT}}. "
              + "The Playtester agrees to take part in the game session, and fill a survey about it before {{Deadline}}. "
              + "The Playtester agrees that the Publisher might record the game session, and use it in promotional material related to the playtest. "
              + "\n\n{{Additional Details (optional)}}"
            ) : (playtest.task === "One Shot ran by the Playtester") ? (
                "The Publisher will provide the Playtester with playtest material once this agreement has been signed by both parties. "
              + "The details for how to access this playtest material, as well as a survey link to collect feedback, will be communicated to the Playtester through the Quest Check website when this agreement comes into effect. "
              + "The Playtester agrees to run a game session using the playtest material provided, record it, and upload it to Youtube as a {{Unlisted or Public}} video, and fill in the survey, before {{Deadline}}. "
              + "The Playtester must ensure that all players participating in the game session agree to share the recording with the Publisher, and that they give the Publisher permission to use the recording in promotional material related to the playtest material. "
              + "\n\n{{Additional Details (optional)}}"
            ) : (playtest.task === "Campaign ran by the Publisher") ? (
                "The Publisher will run {{Minimum Games}} to {{Maximum Games}} game sessions, every {{Period}} from {{Start Time}} to {{End Time}} (GMT + {{Time Zone}}), starting on {{Start Date}}, at {{Address or VTT}}. "
              + "The Playtester agrees to take part in the game sessions, and fill a survey about it before {{Deadline}}. "
              + "The Playtester may still receive their compensation if they miss less than {{Maximum Missed Games}} of these game sessions. "
              + "The Playtester agrees that the Publisher might record the game session, and use it in promotional material related to the playtest. "
              + "\n\n{{Additional Details (optional)}}"
            ) : ( // Campaign ran by the Playtester
                "The Publisher will provide the Playtester with playtest material once this agreement has been signed by both parties. "
              + "The details for how to access this playtest material, as well as a survey link to collect feedback, will be communicated to the Playtester through the Quest Check website when this agreement comes into effect. "
              + "The Playtester agrees to run at least {{Minimum Games}} game sessions using the playtest material provided, record it, and upload each game session to Youtube as a {{Unlisted or Public}} video, and fill in the survey, before {{Deadline}}. "
              + "The Playtester must ensure that all players participating in the game session agree to share the recording with the Publisher, and that they give the Publisher permission to use the recording in promotional material related to the playtest material. "
              + "\n\n{{Additional Task Details (optional)}}"
            )
        )
        .replace('{{{bounty}}}', 
            (playtest.bounty === "Name credits only") ? (
                ''
            ) : (
                `### {{{i}}}. Compensation\n`
              + (
                (playtest.bounty === "Discount Code") ? (
                      "Once the Playtester has accomplished the task outlined in the preceding section, the Publisher agrees to give them a discount code by {{Distribution Method}}, within 14 days after the completion of the task. "
                    + "The discount code should allow the Playtester to purchase {{Product}} on {{Website}} for {{Discounted Price}} instead of the listed price of {{Listed Price}}. "
                    + "The discount code should be valid for a duration of at least 1 year, and will be usable {{Only once/At will}}. "
                ) : (playtest.bounty === "Gift Card") ? (
                      "Once the Playtester has accomplished the task outlined in the preceding section, the Publisher agrees to give them a gift card by {{Distribution Method}}, within 14 days after the completion of the task. "
                    + "The gift card must allow the Playtester to receive {{Value}} worth of free products in {{Applicable Stores}}. "
                    + "The gift card should be valid for a duration of at least 1 year. "
                ) : (playtest.bounty === "Free PDF") ? (
                      "Once the Playtester has accomplished the task outlined in the preceding section, the Publisher agrees to gift them a free PDF copy of {{Product}} by {{Distribution Method}}. "
                    + "The Publisher must provide the free PDF, at the latest, 14 days after the publication of the playtest material. "
                    + "The Publisher certifies that they have the right to distribute this free PDF copy."
                ) : (playtest.bounty === "Free Hardcover Copy") ? (
                     "Once the Playtester has accomplished the task outlined in the preceding section, the Publisher agrees to gift them a free hardcover copy of {{Product}}, and send it by mail at an address the Playtester must communicate to the Publisher in writing at {{Your Email Address}}. "
                    + "The Publisher must provide the free hardcover copy within 6 months of the publication of the playtest material (barring Force Majeure such as paper shortages, as described below). "
                    + "The Publisher certifies that they have the right to distribute this free hardcover copy. "
                ) : (// Payment
                    "Once the Playtester has accomplished the task outlined in the preceding section, the Publisher agrees to pay the Playtester {{Payment Amount}} through {{Payment Mehod (e.g. Paypal)}}. "
                  + "The Playtester must communicate to the Publisher the information necessary for the payment (e.g. Paypal address, invoice, etc...) in writing. at {{Your Email Address}}. "
                  + "The payment must be initiated within 14 days after the completion of the task outlined above. "
                )
              )
              + "\n\n{{Additional Bounty Details (optional)}}"
            )
        )
        .replace("{{{NDA}}}", !playtest.bountyContract.useNDA ? "" : (
            `### {{{i}}}. Non-Disclosure Agreement\n`
          + "Information related to this playtest is considered confidential unless (a) the Publisher specifies otherwise, or (b) it was already publicly known before this agreement came into effect. "
          + "The Playtester agrees not to publicly disclose this confidential information, until at least 3 months after the publication of the playtest material. "
          + "\n\n> Note: This clause does not prevent the Playtester from reporting unlawful behavior from the Publisher to the relevant authorities. "
        ))
        .replaceAll('{playtestId}', playtest.name)


    let i = 1
    while (result.includes('{{{i}}}')) {
        result = result.replace('{{{i}}}', i.toString())
        i++
    }

    if (!!playtester) {
        result = result.replaceAll('{playtester}', `${playtester.userName} (${playtester.emails[0]})`)
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

    return (
        <div className={styles.ContractTemplateEditor}>
            {parse(generateContract(playtest, { ...user, emails }), (content, type, href) => {
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

export const ContractPDF: FC<{ user: MutableUser, playtest: CreatablePlaytest, text: string }> = ({ user, playtest, text }) => {
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