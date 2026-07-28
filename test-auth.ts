import { auth } from "./src/lib/auth";

async function test() {
    try {
        const res = await auth.api.signUpEmail({
            body: {
                email: "test_script@example.com",
                password: "password123",
                name: "Test Script User",
            }
        });
        console.log("Success:", res);
    } catch (err) {
        console.error("Error during signup:", err);
    }
}

test();
