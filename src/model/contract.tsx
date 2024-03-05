import { z } from "zod";
import { MutableUser, User } from "./user";
import { MutablePlaytest, Playtest } from "./playtest";
import React, { FC } from "react";
import PDF from "@react-pdf/renderer";
import contractTemplate from './contractTemplate.md'

export const ContractTemplateSchema = z.object({
    
})

export type ContractTemplate = z.infer<typeof ContractTemplateSchema>

/*
    The template is a markdown document, but with the following extra properties:
    Any text surrounded by {{{triple curls}}} will be filled in by the software
    Any text surrounded by {{double curls}} must be filled in by the publisher
    Any text surrounded by {solo curls} must be filled in by the playtester
*/
export function generateContract(playtest: MutablePlaytest, publisher: MutableUser, playtester?: MutableUser): string {
    return contractTemplate
        .replaceAll('{{{publisher}}}', publisher.userName)
        .replaceAll('{{{playtester}}}', playtester?.userName || '{{{playtester}}}')
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
              + "\n\n{{Additional Details (optional)}}"
            )
        )
        
}

export const ContractEditor: FC<{ user: User, playtest: Playtest, onChange: (newValue: ContractTemplate) => void, disabled?: boolean}> = ({ user, playtest, onChange, disabled }) => {
    return (
        <></>
    )
}


export const ContractPDF: FC<{ user: MutableUser, playtest: MutablePlaytest, text: string }> = ({ user, playtest, text }) => {
    // Transforms markdown to react-pdf elements
    // This has a few bugs right now
    function parse(paragraph: string) {
        // Header
        if (paragraph.match(/^(#+)\s/)) {
            const [hashes, ...rest] = paragraph.split(' ')
    
            switch (hashes.length) {
                case 1: return <PDF.Text style={{ fontSize: '24pt' }}>{parse(rest.join(' '))}</PDF.Text>
                case 2: return <PDF.Text style={{ fontSize: '18pt' }}>{parse(rest.join(' '))}</PDF.Text>
                default: return <PDF.Text style={{ fontSize: '14pt' }}>{parse(rest.join(' '))}</PDF.Text>
            }
        }
    
        // List
        if (paragraph.match(/^(\s+)?\*\s.*/)) {
            const [spaces, ...rest] = paragraph.split('* ')
    
            return <PDF.Text style={{ paddingLeft: `${(spaces.length + 1) * 8}px`}}>- {parse(rest.join('* '))}</PDF.Text>
        }
    
        // Blockquote
        if (paragraph.match(/^\>\s.*/)) {
            const rest = paragraph.substring(2)
    
            return <PDF.Text style={{ backgroundColor: '#ddd', padding: '4px' }}>{parse(rest)}</PDF.Text>
        }

        // Template param
        const templateParamRegex = /{{(.*?)}}/
        const templateParamMatch = templateParamRegex.exec(paragraph)
        if (templateParamMatch) {
            const index = templateParamMatch.index
            const matchKey = templateParamMatch[1]
            const optional = matchKey.endsWith('(optional)')
            let value = ''
            if ((playtest.bountyContract.type === 'template') && (playtest.bountyContract.templateValues[matchKey])) {
                value = playtest.bountyContract.templateValues[matchKey]
            } else if (!optional) {
                value = `{${matchKey}}`
            }

            const beforeMatch = paragraph.substring(0, index)
            const afterMatch = paragraph.substring(index + matchKey.length + 4)

            return (
                <PDF.Text>
                    {parse(beforeMatch)}
                    {value && parse(value)}
                    {parse(afterMatch)}
                </PDF.Text>
            )
        }
    
        // Links
        const linkRegex = /\[(.*?)\]\((.*?)\)/
        const linkMatch = linkRegex.exec(paragraph)
        if (linkMatch) {
            const index = linkMatch.index
            const linkText = linkMatch[1]
            const href = linkMatch[2]
    
            const beforeMatch = paragraph.substring(0, index)
            const afterMatch = paragraph.substring(index + linkText.length + href.length + 4)
    
            return (
                <PDF.Text>
                    {parse(beforeMatch)}
                    <PDF.Link href={href}>{linkText}</PDF.Link>
                    {parse(afterMatch)}
                </PDF.Text>
            )
        }
        
        // Bold-Italic
        const boldItalicRegex = /\*\*\*(.*?)\*\*\*/
        const boldItalicMatch = boldItalicRegex.exec(paragraph)
        if (boldItalicMatch) {
            const index = boldItalicMatch.index
            const boldItaliced = boldItalicMatch[1]
    
            const beforeMatch = paragraph.substring(0, index)
            const afterMatch = paragraph.substring(index + boldItaliced.length + 6)
    
            return (
                <PDF.Text>
                    {parse(beforeMatch)}
                    <PDF.Text style={{ fontFamily: 'Helvetica-BoldOblique' }}>{parse(boldItaliced)}</PDF.Text>
                    {parse(afterMatch)}
                </PDF.Text>
            )
        }
    
        // Bold
        const boldRegex = /\*\*(.*?)\*\*/
        const boldMatch = boldRegex.exec(paragraph)
        if (boldMatch) {
            const index = boldMatch.index
            const bolded = boldMatch[1]
    
            const beforeMatch = paragraph.substring(0, index)
            const afterMatch = paragraph.substring(index + bolded.length + 4)
    
            return (
                <PDF.Text>
                    {parse(beforeMatch)}
                    <PDF.Text style={{ fontFamily: 'Helvetica-Bold' }}>{parse(bolded)}</PDF.Text>
                    {parse(afterMatch)}
                </PDF.Text>
            )
        }
    
        // Italics
        const italicsRegex = /\*(.*?)\*/
        const italicsMatch = italicsRegex.exec(paragraph)
        if (italicsMatch) {
            const index = italicsMatch.index
            const italicsed = italicsMatch[1]
    
            const beforeMatch = paragraph.substring(0, index)
            const afterMatch = paragraph.substring(index + italicsed.length + 2)
    
            return (
                <PDF.Text>
                    {parse(beforeMatch)}
                    <PDF.Text style={{ fontFamily: 'Helvetica-Oblique' }}>{parse(italicsed)}</PDF.Text>
                    {parse(afterMatch)}
                </PDF.Text>
            )
        }
    
        // Spacing
        if ((paragraph === "___") || (paragraph === "___\r")) {
            return <PDF.View style={{ marginBottom: '8px' }} />
        }
    
        return <PDF.Text>{paragraph}</PDF.Text>
    }
    return <>
        <PDF.PDFViewer showToolbar={true} width='100%' height='600px'>
            <PDF.Document
                title={playtest.name}
                author={user.userName}>
                    <PDF.Page
                        style={{ padding: '1in', fontSize: '11pt' }}
                        orientation="portrait"
                        size="LETTER">
                            <PDF.View>
                                { (() => {
                                    const paragraphs = text.split('\n');
                                    return (
                                        <>
                                            {paragraphs.map((paragraph, i) => (
                                                <React.Fragment key={i}>
                                                    {parse(paragraph)}
                                                </React.Fragment>
                                            ))}
                                        </>
                                    )
                                })()}
                            </PDF.View>
                    </PDF.Page>
            </PDF.Document>
        </PDF.PDFViewer>
    </>
}