import PlaytestEditor from '@/components/playtest/edit'
import styles from './new.module.scss'
import { MutablePlaytest, MutablePlaytestSchema, newPlaytest } from '@/model/playtest'
import { useState } from 'react'
import { validate } from '@/model/utils'
import { trpcClient } from '@/server/utils'
import { useRouter } from 'next/router'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'
import DotSkeleton from '@/components/skeleton/dots'

function NewPlaytestPage() {
    const createPlaytestMutation = trpcClient.playtests.create.useMutation()
    const [playtest, setPlaytest] = useState<MutablePlaytest>(newPlaytest)
    const { isValid, errorPaths } = validate(playtest, MutablePlaytestSchema)
    const router = useRouter()

    return (
        <div className={styles.newPlaytest}>
            <h1>Create Playtest</h1>

            <PlaytestEditor
                value={playtest}
                onChange={setPlaytest}
                errorPaths={errorPaths} />

            <div className={styles.actions}>
                <button 
                    disabled={!isValid || createPlaytestMutation.isLoading}
                    onClick={async () => {
                        const insertedId = await createPlaytestMutation.mutateAsync(playtest)
                        await router.push(`/playtest/${insertedId}`)
                    }}>
                        { createPlaytestMutation.isLoading ? 
                            <DotSkeleton /> 
                        : <>
                            <FontAwesomeIcon icon={faCheck} />
                            Create
                        </>}
                </button>
            </div>
        </div>
    )
}

export default NewPlaytestPage