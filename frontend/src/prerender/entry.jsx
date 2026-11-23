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
import ApplicationMobile from "../pages/ApplicationMobile.jsx";
import Guides from "../pages/Guides.jsx";
import GuidePortAuPrince from "../pages/GuidePortAuPrince.jsx";
import GuideSecurite from "../pages/GuideSecurite.jsx";
import GuideApplicationHaiti from "../pages/GuideApplicationHaiti.jsx";
import Waitlist from "../pages/Waitlist.jsx";
import WaitlistWomen from "../pages/WaitlistWomen.jsx";
import WaitlistMen from "../pages/WaitlistMen.jsx";
import PrivacyPolicy from "../pages/PrivacyPolicy.jsx";
import Terms from "../pages/Terms.jsx";
import Login from "../pages/Login.jsx";
import Register from "../pages/Register.jsx";
import NotFound from "../pages/NotFound.jsx";

// Mirrors App.jsx: routes listed in hidePublicLayoutRoutes render without
// the public navbar/footer, so the prerendered markup matches the client.
export const PUBLIC_ROUTES = [
  { path: "/", element: <Home />, withLayout: true },
  { path: "/rencontre-haiti", element: <LandingNoumatchHaiti />, withLayout: true },
  { path: "/landing/noumatch-haiti", element: <LandingNoumatchHaiti />, withLayout: true },
  { path: "/application-mobile", element: <ApplicationMobile />, withLayout: true },
  { path: "/guides", element: <Guides />, withLayout: true },
  { path: "/rencontres-port-au-prince", element: <GuidePortAuPrince />, withLayout: true },
  { path: "/securite-rencontres-en-ligne", element: <GuideSecurite />, withLayout: true },
  { path: "/application-rencontre-haiti", element: <GuideApplicationHaiti />, withLayout: true },
  { path: "/waitlist", element: <Waitlist />, withLayout: true },
  { path: "/waitlist/women", element: <WaitlistWomen />, withLayout: true },
  { path: "/waitlist/men", element: <WaitlistMen />, withLayout: true },
  { path: "/privacy", element: <PrivacyPolicy />, withLayout: true },
  { path: "/terms", element: <Terms />, withLayout: true },
  { path: "/login", element: <Login />, withLayout: false },
  { path: "/register", element: <Register />, withLayout: false },
];

const renderPage = (pathname, content, withLayout) =>
  renderToString(
    <I18nProvider>
      <MemoryRouter initialEntries={[pathname]}>
        <div className="App">
          {withLayout && <Navbar />}
          <main>{content}</main>
          {withLayout && <Footer />}
        </div>
      </MemoryRouter>
    </I18nProvider>
  );

export function renderRoute(pathname) {
  const route = PUBLIC_ROUTES.find((item) => item.path === pathname);
  if (!route) {
    throw new Error(`No prerender route registered for ${pathname}`);
  }

  const content = (
    <Routes>
      {PUBLIC_ROUTES.map((item) => (
        <Route key={item.path} path={item.path} element={item.element} />
      ))}
    </Routes>
  );

  return renderPage(pathname, content, route.withLayout);
}

// Served as dist/404.html by the static host; also used by the client
// catch-all route so unknown URLs no longer show the homepage.
export function renderNotFound(pathname = "/404") {
  return renderPage(
    pathname,
    <Routes>
      <Route path="*" element={<NotFound />} />
    </Routes>,
    true
  );
}
