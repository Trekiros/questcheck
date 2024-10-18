import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
    '/',
    '/about',

    // Playtests
    '/playtest/:id',

    // API
    '/api/trpc/:any',

    // Legal
    "/privacy",
    "/tos",
])

export default clerkMiddleware((auth, req) => {
    if (!isPublicRoute(req)) auth().protect()
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
