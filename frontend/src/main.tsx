import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { MotionConfig } from "motion/react"
import "@fontsource/rubik/400.css"
import "@fontsource/rubik/500.css"
import "@fontsource/rubik/600.css"
import "@fontsource/rubik/700.css"
import "./index.css"
import App from "./App"
import { AuthProvider } from "./auth/AuthProvider"
import { Toaster } from "./components/ui/sonner"
import { TooltipProvider } from "./components/ui/tooltip"
import { I18nProvider } from "./i18n/I18nProvider"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      {/* reducedMotion="user" : toutes les animations Motion respectent prefers-reduced-motion */}
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <TooltipProvider>
            <App />
            <Toaster position="top-center" />
          </TooltipProvider>
        </AuthProvider>
      </MotionConfig>
    </I18nProvider>
  </StrictMode>,
)
