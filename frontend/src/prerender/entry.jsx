// Build-time prerender entry: renders the public pages to static HTML so
// crawlers and AI agents that do not execute JavaScript receive real content.
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { I18nProvider } from "../context/I18nContext.jsx";

import Home from "../pages/Home.jsx";
import LandingNoumatchHaiti from "../pages/LandingNoumatchHaiti.jsx";
import Waitlist from "../pages/Waitlist.jsx";
import WaitlistWomen from "../pages/WaitlistWomen.jsx";
import WaitlistMen from "../pages/WaitlistMen.jsx";
import PrivacyPolicy from "../pages/PrivacyPolicy.jsx";
import Terms from "../pages/Terms.jsx";
import Register from "../pages/Register.jsx";

// Mirrors App.jsx: routes listed in hidePublicLayoutRoutes render without
// the public navbar/footer, so the prerendered markup matches the client.
export const PUBLIC_ROUTES = [
  { path: "/", element: <Home />, withLayout: true },
  { path: "/rencontre-haiti", element: <LandingNoumatchHaiti />, withLayout: true },
  { path: "/landing/noumatch-haiti", element: <LandingNoumatchHaiti />, withLayout: true },
  { path: "/waitlist", element: <Waitlist />, withLayout: true },
  { path: "/waitlist/women", element: <WaitlistWomen />, withLayout: true },
  { path: "/waitlist/men", element: <WaitlistMen />, withLayout: true },
  { path: "/privacy", element: <PrivacyPolicy />, withLayout: true },
  { path: "/terms", element: <Terms />, withLayout: true },
  { path: "/register", element: <Register />, withLayout: false },
];

export function renderRoute(pathname) {
  const route = PUBLIC_ROUTES.find((item) => item.path === pathname);
  if (!route) {
    throw new Error(`No prerender route registered for ${pathname}`);
  }

  const page = (
    <I18nProvider>
      <MemoryRouter initialEntries={[pathname]}>
        <div className="App">
          {route.withLayout && <Navbar />}
          <main>
            <Routes>
              {PUBLIC_ROUTES.map((item) => (
                <Route key={item.path} path={item.path} element={item.element} />
              ))}
            </Routes>
          </main>
          {route.withLayout && <Footer />}
        </div>
      </MemoryRouter>
    </I18nProvider>
  );

  return renderToString(page);
}
