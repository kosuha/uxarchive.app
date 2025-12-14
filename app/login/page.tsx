import { Suspense } from "react"
import type { Metadata } from "next"
import { LoginPanel } from "@/components/auth/login-panel"

export const metadata: Metadata = {
    title: "Sign in | UX Archive",
    description: "Sign in to your UX Archive account to save patterns and capture insights.",
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginPanel />
        </Suspense>
    )
}
