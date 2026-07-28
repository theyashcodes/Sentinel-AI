import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

export async function POST(req: Request) {
    try {
        return await handler.POST(req);
    } catch (err) {
        console.error("========== AUTH ERROR ==========");
        console.error(err);

        if (err instanceof Error) {
            console.error("MESSAGE:", err.message);
            console.error("STACK:", err.stack);
        }

        console.error("FULL ERROR:");
        console.dir(err, { depth: null });

        throw err;
    }
}

export const GET = handler.GET;