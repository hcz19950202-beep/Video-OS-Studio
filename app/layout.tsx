import type {Metadata} from "next";
import "./globals.css";
import "./timeline.css";
import "./effects.css";
import "./polish.css";
import "./script.css";

export const metadata:Metadata={title:"Video OS Studio",description:"Local-first AI talking-head video production workspace"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><body>{children}</body></html>;}