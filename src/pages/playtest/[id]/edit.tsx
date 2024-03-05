import { NextSeo } from 'next-seo'
import styles from './edit.module.scss'

function EditPlaytestPage() {
    return (
        <div className={styles.editPlaytest}>
            <NextSeo title="Edit Playtest" />

        </div>
    )
}

export default EditPlaytestPage