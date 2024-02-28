"use client";

import { FC, useEffect, useState } from "react";
import styles from './rgpd.module.scss'
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from '@vercel/analytics/react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartSimple, faGear, faUser } from "@fortawesome/free-solid-svg-icons";
import Checkbox from "./checkbox";

type PropType = {}

type Preferences = {
    useLocalStorage?: boolean,
    useSpeedInsights?: boolean,
    useAnalytics?: boolean,
}

const RGPD: FC<PropType> = () => {
    const [visible, setVisible] = useState(false)
    const [collapsed, setCollapsed] = useState(true)
    const [preferences, setPreferences] = useState<Preferences>({})
    const [suggestedPrefs, setSuggestedPrefs] = useState<Preferences>({
        useLocalStorage: true,
        useSpeedInsights: true,
        useAnalytics: true,
    })
    
    useEffect(() => {
        if (!localStorage) return

        const preferenceStr = localStorage.getItem('preferences')

        if (preferenceStr === null) {
            setVisible(true)
        } else {
            setPreferences(JSON.parse(preferenceStr))
        }
    }, [])

    function update(callback: (pref: Preferences) => void) {
        return () => {
            const clone = structuredClone(suggestedPrefs)
            callback(clone)
            setSuggestedPrefs(clone)
        }
    }

    function handleAgree() {
        setVisible(false)
        
        setPreferences(suggestedPrefs)

        if (suggestedPrefs.useLocalStorage) localStorage.setItem('preferences', JSON.stringify(suggestedPrefs))
    }

    function handleDisagree() {
        setVisible(false)
    }

    if (visible) {
        let some = false
        let all = true
        for (let pref in suggestedPrefs) {
            if (suggestedPrefs[pref as keyof Preferences]) some = true
            else all = false
        }

        return (
            <div className={styles.rgpd}>
                <div className={styles.header}>
                    <h3>Cookies & Data</h3>
                    <div>
                        Some cookies are necessary to use this website, but we can also use non-essential cookies to improve your experience.
                    </div>
                </div>

                {!collapsed && (
                    <div className={styles.choices}>
                        <div>Please tell us how you would prefer this website use your data:</div>

                        <div className={styles.choice}>
                            <Checkbox value={!!suggestedPrefs.useSpeedInsights} onToggle={update(v => v.useSpeedInsights = !v.useSpeedInsights)}>
                                <span>
                                    Collect anonymized insights data about how long it takes to render the page, so we can identify and fix performance issues. 
                                </span>
                                <FontAwesomeIcon icon={faChartSimple} className={styles.icon} />
                            </Checkbox>
                        </div>

                        <div className={styles.choice}>
                            <Checkbox value={!!suggestedPrefs.useAnalytics} onToggle={update(v => v.useAnalytics = !v.useAnalytics)}>
                                <span>
                                    Collect anonymized analytics data about the pages you visit, so we can know how many people visit this website.
                                </span>
                                <FontAwesomeIcon icon={faUser} />
                            </Checkbox>
                        </div>

                        <div className={styles.choice}>
                            <Checkbox value={!!suggestedPrefs.useLocalStorage} onToggle={update(v => v.useLocalStorage = !v.useLocalStorage)}>
                                <span>
                                    Use your browser's local storage to save your cookie & data preferences, so you don't have to answer this form every time you come back.
                                </span>
                                <FontAwesomeIcon icon={faGear} className={styles.icon} />
                            </Checkbox>
                        </div>
                    </div>
                )}

                <div className={styles.buttons}>
                    <button onClick={handleDisagree}>Reject Non-Essential</button>
                    { collapsed && (
                        <button onClick={() => setCollapsed(false)}>
                            Customize Preferences
                        </button>
                    )}
                    <button onClick={handleAgree} disabled={!some} className={styles.accept}>
                        {all ? 'Accept All' : 'Accept Selected'}
                    </button>
                </div>
            </div>
        )
    }

    return <>
        { preferences.useSpeedInsights && <SpeedInsights /> }
        { preferences.useAnalytics && <Analytics />}
    </>
}

export default RGPD