import { NextSeo } from 'next-seo'
import styles from './list.module.scss'

function PlaytestListPage() {
    return (
        <div className={styles.playtestList}>
            <NextSeo title="My Playtests" />

        </div>
    )
}

export default PlaytestListPage