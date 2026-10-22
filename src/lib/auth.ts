import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP, twoFactor } from "better-auth/plugins";
import { db } from "@/lib/db";
import { send2FAEmail } from "@/lib/email";

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
            async sendVerificationOTP({ email, otp }) {
                await send2FAEmail({
                    to: email,
                    userName: "Operator",
                    otp,
                });
            },
        }),
        twoFactor({
            issuer: "Sentinel AI",
            skipVerificationOnEnable: true,
            otpOptions: {
                async sendOTP({ user, otp }) {
                    await send2FAEmail({
                        to: user.email,
                        userName: user.name || "Operator",
                        otp,
                    });
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
