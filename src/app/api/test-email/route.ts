import { NextRequest, NextResponse } from "next/server";
import { send2FAEmail, getGmailCredentials } from "@/lib/email";

export async function GET(req: NextRequest) {
    const to = req.nextUrl.searchParams.get("to") || "iamyash.200@gmail.com";
    const { gmailUser, gmailPass } = getGmailCredentials();

    console.log(`[API /test-email] Request to send email to: ${to}`);
    console.log(`[API /test-email] Resolved sender: ${gmailUser}`);

    const result = await send2FAEmail({
        to,
        userName: "Sentinel Operator",
        otp: Math.floor(100000 + Math.random() * 900000).toString(),
        type: "2fa",
    });

    return NextResponse.json({
        to,
        sender: gmailUser ? `${gmailUser.slice(0, 4)}***@gmail.com` : null,
        hasPassword: Boolean(gmailPass),
        nodeEnv: process.env.NODE_ENV,
        result,
    });
}
