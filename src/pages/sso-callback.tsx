import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

// Users are redirected here after linking their account with twitter or facebook
export default function SSOCallback() {
    return <AuthenticateWithRedirectCallback />
}
