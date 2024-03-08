import { MutableUser } from "@/model/user";
import { CreatablePlaytest } from "@/model/playtest";
import React, { FC } from "react";
import PDF from "@react-pdf/renderer";
import contractTemplate from './contractTemplate.md'

/*
    The template is a markdown document, but with the following extra properties:
    Any text surrounded by {{{triple curls}}} will be filled in by the software
    Any text surrounded by {{double curls}} must be filled in by the publisher
    Any text surrounded by {solo curls} must be filled in by server once a playtester is selected
*/
export function generateContract(playtest: CreatablePlaytest, publisher: MutableUser, playtester?: MutableUser): string {
    if (playtest.bountyContract.type === "custom") return playtest.bountyContract.text;

    let result = contractTemplate
        .replaceAll('{{{publisher}}}', publisher.userName)
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
                "### Compensation\n"
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
            "### Non-Disclosure Agreement\n"
          + "Information related to this playtest is considered confidential unless (a) the Publisher specifies otherwise, or (b) it was already publicly known before this agreement came into effect. "
          + "The Playtester agrees not to publicly disclose this confidential information, until at least 3 months after the publication of the playtest material. "
          + "\n\nNote: This clause does not prevent the Playtester from reporting unlawful behavior from the Publisher to the relevant authorities. "
        ))

    if (!!playtester) {
        result = result.replaceAll('{playtester}', playtester?.userName || '{playtester}')
    }

    return result
}

export const ContractPDF: FC<{ user: MutableUser, playtest: CreatablePlaytest, text: string }> = ({ user, playtest, text }) => {
    // Transforms markdown to react-pdf elements
    // This has a few bugs right now
    function parse(paragraph: string) {
        // Empty
        if (!paragraph) return null;

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
    
        // Default: just text.
        return <PDF.Text>{paragraph}</PDF.Text>
    }

    const paragraphs = text.split('\n')

    return <>
        <PDF.PDFViewer showToolbar={true} width='100%' height='600px'>
            <PDF.Document
                title={playtest.name}
                author={user.userName}>
                    <PDF.Page
                        style={{ padding: '1in', fontSize: '9pt' }}
                        orientation="portrait"
                        size="LETTER">
                            <PDF.View>
                                {paragraphs.map((paragraph, i) => (
                                    <React.Fragment key={i}>
                                        {parse(paragraph)}
                                    </React.Fragment>
                                ))}
                            </PDF.View>
                    </PDF.Page>
            </PDF.Document>
        </PDF.PDFViewer>
    </>
}