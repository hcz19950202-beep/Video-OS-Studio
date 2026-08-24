import type {Metadata} from "next";
import "./globals.css";
import "./timeline.css";
import "./effects.css";
import "./polish.css";
import "./script.css";
import "./m4.css";
import "./m5.css";
import "./v21.css";
import "./v21-layout.css";
import "./v21-inspector.css";
import "./v21-a11y.css";
import "./v21-completion.css";
import "./v22-workflow.css";

export const metadata:Metadata={title:"Video OS Studio",description:"Local-first AI-native universal video production workspace"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><body>{children}</body></html>;}
