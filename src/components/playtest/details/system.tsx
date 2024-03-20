import { Playtest } from "@/model/playtest"
import { PublicUser, SystemFamiliarityList, User } from "@/model/user"
import { FC, useMemo, useState } from "react"
import styles from './review.module.scss'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faChevronDown, faChevronUp, faDiceD20, faStar } from "@fortawesome/free-solid-svg-icons"
import Expandable from "@/components/utils/expandable"
import Markdown from "@/components/utils/markdown"

export const SystemsDisplay: FC<{ user: PublicUser, playtest: Playtest }> = ({ user, playtest }) => {
    const [collapsed, setCollapsed] = useState(true)
    const sortedSystems = useMemo(() => {
        // Sort systems known by the applicants, so that the ones useful for the playtest appear first.
        const systemsList = playtest.tags.filter(t => t.startsWith('Game: ')).map(t => t.substring('Game: '.length))
        type System = User['playerProfile']['systems'][number]
        function sortSystems(system1: System, system2: System) {
            const system1IsUseful = systemsList.includes(system1.system)
            const system2IsUseful = systemsList.includes(system2.system)

            if (system1IsUseful && system2IsUseful) return 0

            if (system1IsUseful) return -1
            if (system2IsUseful) return 1

            return 0
        }

        return user.playerProfile.systems.sort(sortSystems)
    }, [playtest.tags, user.playerProfile.systems])
    
    if (!user.playerProfile.systems.length) return null;

    return (
        <section className={styles.systems}>
            <label>
                <FontAwesomeIcon icon={faDiceD20} />

                Systems known

                { (sortedSystems.length > 3) && (
                    <button onClick={() => setCollapsed(!collapsed)}>
                        <FontAwesomeIcon icon={collapsed ? faChevronDown : faChevronUp} />
                    </button>
                )}
            </label>
            <ul>
                { (collapsed ? sortedSystems.slice(0, 3) : sortedSystems).map(({ system, details, familiarity }, i) => (
                    <li key={i} className={styles.system}>
                        <div className={styles.header}>
                            <label>{system}</label>
                            <div className={styles.stars}>
                                {[1,2,3,4,5].map(star => (
                                    <FontAwesomeIcon
                                        key={star}
                                        className={`${styles.star} ${familiarity >= star ? styles.familiar : undefined}`}
                                        icon={faStar} />
                                ))}
                            </div>
                            <span>({SystemFamiliarityList[familiarity - 1]})</span>
                        </div>

                        <Expandable lines={2}>
                            <Markdown text={details} />
                        </Expandable>
                    </li>
                ))}
            </ul>
        </section>
    )
}