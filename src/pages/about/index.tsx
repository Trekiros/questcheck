import Page, { ServerSideProps } from "@/components/utils/page";
import { NextSeo } from "next-seo";
import { FC } from "react";
import styles from './about.module.scss'
import { serverPropsGetter } from "@/components/utils/pageProps";

export const getServerSideProps = serverPropsGetter;

const AboutPage: FC<ServerSideProps> = ({ userCtx }) => {
    return (
        <Page userCtx={userCtx}>
            <NextSeo title="About" />

            <div className={styles.about}>
                <h1>What is QuestCheck?</h1>

                <section>
                    <p>
                        This website's goal is to facilitate the organization of playtests for TTRPGs (Table-Top Role-Playing Games).
                        Publishers post offers for playtesting gigs, and playtesters apply to them.
                    </p>

                    <p>
                        <b>For publishers:</b> this website helps you by providing templates for playtesting agreements,
                        and showing your playtest gigs to a whole community of players and game masters.
                    </p>

                    <p>
                        <b>For playtesters:</b> this website helps you by allowing you to set up notifications on Discord,
                        so you never miss a gig that might be interesting for you.
                    </p>
                </section>

                <section>
                    <h3>Credits</h3>

                    <p>
                        QuestCheck was created by <a href="https://youtube.com/@trekiros">Trekiros</a>,
                        and is open source on <a href="https://github.com/trekiros/questcheck">GitHub</a>.
                    </p>

                    <p>
                        <b>Additional Thanks:</b> Thank you to all of these wonderful people for giving feedback about the website:
                    </p>

                    <ul>
                        <li>Dale Critchley (Wyrmworks Publishing)</li>
                        <li>Spencer Hibnick (Pesto Publications)</li>
                        <li>Tom Kambouris (Homie and the Dude)</li>
                        <li>M.T.Black</li>
                        <li>Michael3mod</li>
                        <li>JayPea</li>
                        <li>hotandspicyweiss</li>
                        <li>nstav13</li>
                        <li>Eiti3</li>
                        <li>Gith Enjoyer</li>
                    </ul>
                </section>
            </div>
        </Page>
    )
}

export default AboutPage