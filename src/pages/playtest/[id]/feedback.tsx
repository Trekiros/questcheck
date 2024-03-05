import { NextSeo } from 'next-seo'
import styles from './feedback.module.scss'

function PlaytestFeedbackPage() {
    return (
        <div className={styles.playtestFeedback}>
            <NextSeo title="Feedback" />

        </div>
    )
}

export default PlaytestFeedbackPage