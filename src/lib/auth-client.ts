import { createAuthClient } from "better-auth/react";
import { emailOTPClient, twoFactorClient } from "better-auth/client/plugins";

const getBaseURL = () => {
    if (typeof window !== "undefined") {
        return window.location.origin;
    }
    return (
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.BETTER_AUTH_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    );
};

export const authClient = createAuthClient({
    baseURL: getBaseURL(),
    plugins: [
        emailOTPClient(),
        twoFactorClient(),
    ],
});

export const {
    useSession,
    signIn,
    signUp,
    signOut,
    emailOtp,
    twoFactor,
} = authClient;
