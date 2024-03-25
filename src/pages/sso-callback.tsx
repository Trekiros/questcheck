import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

// Users are redirected here after linking their account with twitter or google
export default function SSOCallback() {
    return <AuthenticateWithRedirectCallback />
}
