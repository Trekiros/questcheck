import { authMiddleware } from "@clerk/nextjs";

// Clerk middleware setup
export default authMiddleware({
    publicRoutes: [
        '/',
        '/about',

        // Playtests
        '/playtest/:id',
        
        // API
        '/api/trpc/:any',

        // Legal
        "/privacy",
        "/tos",
    ],
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
