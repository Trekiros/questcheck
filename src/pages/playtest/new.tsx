import PlaytestEditor from '@/components/playtest/edit/edit'
import styles from './new.module.scss'
import { CreatablePlaytest, CreatablePlaytestSchema, newPlaytest } from '@/model/playtest'
import { useEffect, useState } from 'react'
import { validate } from '@/model/utils'
import { trpcClient } from '@/server/utils'
import { useRouter } from 'next/router'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faWarning } from '@fortawesome/free-solid-svg-icons'
import DotSkeleton from '@/components/skeleton/dots'
import { NextSeo } from 'next-seo'
import Modal from '@/components/utils/modal'
import Link from 'next/link'
import { useDialog } from '@/components/utils/dialog'
import { generateContract } from '@/components/playtest/edit/contract'
import Select from '@/components/utils/select'
import { useUser } from '@clerk/nextjs'

function NewPlaytestPage() {
    const { setDialog } = useDialog()
    const user = useUser()
    const recentPlaytests = trpcClient.playtests.search.useQuery({ search: { includeClosed: true, includeAuthors: [user.user?.id!] }, page: 0, perPage: 10 })
    const userInfo = trpcClient.users.getSelf.useQuery()
    const createPlaytestMutation = trpcClient.playtests.create.useMutation()
    const [playtest, setPlaytest] = useState<CreatablePlaytest>(newPlaytest)
    const { isValid, errorPaths } = validate(playtest, CreatablePlaytestSchema)
    const router = useRouter()

    const disabled = userInfo.isFetching || createPlaytestMutation.isLoading

    const isAllowed = userInfo.data?.isPublisher && (
        userInfo.data.publisherProfile.twitterProof
     || userInfo.data.publisherProfile.facebookProof
     || userInfo.data.publisherProfile.manualProof
    )

    const [templateIsValid, setTemplateIsValid] = useState(false)
    useEffect(() => {
        if (!userInfo.data) return;
        if (playtest.bountyContract.type !== 'template') {
            setTemplateIsValid(true);
            return;
        }

        const mandatoryTemplateTags = Array.from(generateContract(playtest, userInfo.data).matchAll(/\{\{(.*?)\}\}/g))
        
        for (const match of mandatoryTemplateTags) {
            const tag = match[0]

            if (!playtest.bountyContract.templateValues[tag]) {
                setTemplateIsValid(false)
                return;
            }
        }

        setTemplateIsValid(true)
    }, [playtest.bountyContract, userInfo.data])

    return (
        <div className={styles.newPlaytest}>
            <NextSeo title="Create Playtest" />

            <h1>
                Create Playtest

                <Select
                    placeholder='Copy recent playtest?'
                    options={recentPlaytests.data?.map(({ _id, ...recentPlaytest }) => ({ value: recentPlaytest, label: recentPlaytest.name })) || []}
                    value={null}
                    onChange={recentPlaytest => recentPlaytest && setDialog("This will erase all of your current unsaved changes. Are you sure?", confirm => {
                        if (confirm) setPlaytest({ ...newPlaytest, ...recentPlaytest })
                    })}
                    disabled={disabled || !recentPlaytests.data || !recentPlaytests.data.length} />
            </h1>

            <PlaytestEditor
                value={playtest}
                onChange={setPlaytest}
                disabled={disabled}
                errorPaths={errorPaths} 
                confirmBtn={
                    <button
                        disabled={disabled || !isValid || !templateIsValid}
                        onClick={ () => setDialog((
                            <div className={styles.warning}>
                                <h4>Confirm?</h4>

                                <ul>
                                    <li>
                                        <FontAwesomeIcon icon={faWarning} />
                                        You will not be able to update this playtest after posting it.
                                    </li>
                                    <li>
                                        <FontAwesomeIcon icon={faWarning} />
                                        You can only create up to 3 playtests every 24 hours.
                                    </li>
                                </ul>
                                
                                <div>Do you wish to proceed and create the playtest?</div>
                            </div>
                        ), async (confirmed) => {
                            if (confirmed) {
                                const insertedId = await createPlaytestMutation.mutateAsync(playtest)
                                await router.push(`/playtest/${insertedId}`)
                            }
                        })}>
                            { createPlaytestMutation.isLoading ? 
                                <DotSkeleton />
                            : <>
                                <FontAwesomeIcon icon={faCheck} />
                                Create
                            </>}
                    </button>
                }/>

            { !disabled && !isAllowed && (
                <Modal onCancel={() => router.push('/')}>
                    <p>You cannot create playtests until you have set up at least one proof of identity in your publisher profile.</p>
                    <p>Click <Link href="/settings">here</Link> to go to your profile.</p>
                </Modal>
            )}
        </div>
    )
}

export default NewPlaytestPage