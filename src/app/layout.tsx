import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Monday BI Agent | Skylark Drones",
    description:
        "AI-powered business intelligence agent for Monday.com. Get instant answers about your work orders, deals pipeline, and business metrics.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>{children}</body>
        </html>
    );
}
