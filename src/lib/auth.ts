import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP, twoFactor } from "better-auth/plugins";
import { db } from "@/lib/db";

const getBaseURL = () => {
    if (process.env.BETTER_AUTH_URL && !process.env.BETTER_AUTH_URL.includes("localhost")) {
        return process.env.BETTER_AUTH_URL;
    }
    if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")) {
        return process.env.NEXT_PUBLIC_APP_URL;
    }
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    }
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    return process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
};

const baseURL = getBaseURL();

export const auth = betterAuth({
    baseURL,
    trustedOrigins: [
        baseURL,
        "https://sentinel-ai-omega-two.vercel.app",
        "http://localhost:3000",
        ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
        ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
        ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ],
    database: prismaAdapter(db, {
        provider: "postgresql",
    }),
    account: {
        accountLinking: {
            enabled: true,
            trustedProviders: ["google"],
            requireLocalEmailVerified: false,
        },
    },
    plugins: [
        emailOTP({
            async sendVerificationOTP({ email, otp, type }) {
                if (process.env.NODE_ENV === "production") {
                    throw new Error("Email delivery is not configured for this environment.");
                }

                // Local development only: avoid sending a real email while making
                // the one-time password available to the developer.
                console.log(`\n\n========================================`);
                console.log(`🔒 EMAIL OTP MOCK`);
                console.log(`To: ${email}`);
                console.log(`Type: ${type}`);
                console.log(`OTP Code: ${otp}`);
                console.log(`========================================\n\n`);
            },
        }),
        twoFactor({
            issuer: "Sentinel AI",
            skipVerificationOnEnable: true,
            otpOptions: {
                async sendOTP({ user, otp }) {
                    console.log(`\n\n========================================`);
                    console.log(`🔒 SENTINEL 2FA EMAIL OTP`);
                    console.log(`User: ${user.name} <${user.email}>`);
                    console.log(`2FA Security Code: ${otp}`);
                    console.log(`Valid for: 3 minutes`);
                    console.log(`========================================\n\n`);
                },
            },
        }),
    ],
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ? {
                  google: {
                      clientId: process.env.GOOGLE_CLIENT_ID,
                      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                  },
              }
            : {}),
    },
    advanced: {
        database: {
            generateId: "uuid"
        }
    }
});
