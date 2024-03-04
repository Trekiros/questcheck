import { authMiddleware } from "@clerk/nextjs";

// Clerk middleware setup
export default authMiddleware({
    publicRoutes: [
        '/',

        // Playtests
        '/playtest/:id',
        
        // API
        '/api/trpc/:any',
    ],
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
