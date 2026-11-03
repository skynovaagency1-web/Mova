import React from "react";
import ReactDOM from "react-dom/client";
import Legal from "@/pages/legal";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import ResetPassword from "@/pages/reset-password";
import NotFound from "@/pages/not-found";
import "./index.css";

// One entry for the legal pages, the password-reset page and the 404 page; each HTML file names its page with <body data-page="…">.
const PAGES = { legal: Legal, terms: Terms, privacy: Privacy, reset: ResetPassword, notfound: NotFound } as const;
const Page = PAGES[(document.body.dataset.page as keyof typeof PAGES) ?? "legal"] ?? Legal;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>,
);
