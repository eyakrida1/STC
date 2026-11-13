import { createBrowserRouter, Navigate, RouterProvider } from "react-router"
import { RequireAuth } from "@/auth/RequireAuth"
import { useAuth } from "@/auth/context"
import { AppShell } from "@/components/shell/AppShell"
import { useT } from "@/i18n/context"
import { homePathFor, ROUTE_ROLES } from "@/lib/access"
import { LoginPage } from "@/pages/LoginPage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { PlaceholderPage } from "@/pages/PlaceholderPage"
import { ProfilePage } from "@/pages/ProfilePage"
import { ChildrenPage } from "@/pages/children/ChildrenPage"
import { ChildPage } from "@/pages/child/ChildPage"
import { StyleguidePage } from "@/pages/StyleguidePage"

function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? homePathFor(user.role) : "/connexion"} replace />
}

function DashboardPlaceholder() {
  const t = useT()
  return <PlaceholderPage title={t.pages.dashboard.title} description={t.pages.dashboard.description} />
}

const router = createBrowserRouter([
  { path: "/connexion", element: <LoginPage /> },
  { path: "/login", element: <Navigate to="/connexion" replace /> }, // ancienne adresse
  { path: "/styleguide", element: <StyleguidePage /> }, // public : revue design
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      {
        path: "enfants",
        element: (
          <RequireAuth roles={ROUTE_ROLES.children}>
            <ChildrenPage />
          </RequireAuth>
        ),
      },
      {
        path: "enfants/:childId/:tab?/:section?",
        element: (
          <RequireAuth roles={ROUTE_ROLES.childFile}>
            <ChildPage />
          </RequireAuth>
        ),
      },
      {
        path: "tableau-de-bord",
        element: (
          <RequireAuth roles={ROUTE_ROLES.dashboard}>
            <DashboardPlaceholder />
          </RequireAuth>
        ),
      },
      { path: "profil", element: <ProfilePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
