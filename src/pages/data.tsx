import Modal from "@/components/utils/modal";
import Page, { ServerSideProps } from "@/components/utils/page";
import { serverPropsGetter } from "@/components/utils/pageProps";
import { trpcClient } from "@/server/utils";
import { useClerk } from "@clerk/nextjs";
import { faWarning } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { NextSeo } from "next-seo";
import { useRouter } from "next/router";
import { FC, useState } from "react";

export const getServerSideProps = serverPropsGetter;

const DataPage: FC<{} & ServerSideProps> = ({ userCtx }) => {
    const deleteSelfMutation = trpcClient.users.deleteSelf.useMutation()
    const [showModal, setShowModal] = useState(false)
    const [verification, setVerification] = useState('')
    const { signOut } = useClerk()
    const router = useRouter()
    
    return (
        <Page userCtx={userCtx}>
            <div style={{ width: "100%", height: "100%", display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1em'}}>
                <NextSeo title="My Data" />
                
                <h1>My Data</h1>

                <p>By clicking on the button below, you will delete all of your data.</p>

                <button
                    onClick={() => { setShowModal(true); setVerification('') }}>
                        <FontAwesomeIcon icon={faWarning} />
                        Delete my data
                        <FontAwesomeIcon icon={faWarning} />
                </button>

                { showModal && (
                    <Modal onCancel={() => setShowModal(false)}>
                        <h3 style={{ marginTop: 0 }}>Warning</h3>
                        <p>You are about to delete all of your data on this website. This cannot be undone.</p>
                        <p>If you are sure you wish to proceed, type "DELETE" below:</p>
                        <input 
                            style={{ width: "100%" }} 
                            type='text' 
                            value={verification} 
                            onChange={e => setVerification(e.target.value)} />
                        <button 
                            style={{ marginTop: "1em", width: '100%' }} 
                            disabled={verification !== 'DELETE'} 
                            onClick={async () => {
                                await deleteSelfMutation.mutateAsync()
                                await signOut(() => router.push('/'))
                            }}>
                                CONFIRM
                        </button>
                    </Modal>
                )}
            </div>
        </Page>
    )
}

export default DataPage