export const SITE_URL = "https://noumatch.com";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/main_img.png`;

export const HOME_FAQ_ITEMS = [
  {
    q: "Comment fonctionne NouMatch ?",
    a: "NouMatch vous permet d'accéder à un tableau de profils correspondant à vos préférences. Une fois votre profil créé, vous pouvez explorer les profils des autres membres selon vos critères de recherche, comme le genre ou les intérêts communs.",
  },
  {
    q: "Comment créer un profil ?",
    a: "Pour créer un profil, rendez-vous sur la page d'inscription et remplissez les informations demandées. Un profil précis améliore la qualité des correspondances et des échanges.",
  },
  {
    q: "Puis-je contrôler qui voit mon profil ?",
    a: "Oui. NouMatch vous donne le contrôle sur la visibilité de votre profil et vous permet de bloquer les utilisateurs indésirables pour une expérience plus sûre.",
  },
  {
    q: "Comment mes informations personnelles sont-elles protégées ?",
    a: "NouMatch applique des protocoles de sécurité avancés et des règles strictes de confidentialité. Vos données sont protégées et les comportements abusifs peuvent entraîner un blocage immédiat.",
  },
  {
    q: "Puis-je supprimer mon compte ?",
    a: "Oui. Vous pouvez supprimer votre compte à tout moment, et vos informations seront supprimées conformément à notre politique de confidentialité.",
  },
];

const WAITLIST_FAQ_ITEMS = [
  {
    q: "Quand NouMatch sera-t-il disponible ?",
    a: "Nous préparons actuellement le lancement de NouMatch. Les personnes inscrites sur la liste d'attente seront informées en priorité dès l'ouverture.",
  },
  {
    q: "Pourquoi rejoindre la liste d'attente ?",
    a: "La liste d'attente permet de réserver sa place, d'être informé en priorité et de faire partie des premiers à découvrir NouMatch au lancement.",
  },
  {
    q: "Est-ce que l'inscription est payante ?",
    a: "Non. L'inscription sur la liste d'attente est entièrement gratuite.",
  },
];

const faqSchema = (items) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
});

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "NouMatch",
  url: SITE_URL,
  logo: `${SITE_URL}/noumatch-logo.png`,
  description: "NouMatch est une application de rencontres moderne pour des connexions authentiques en Haïti.",
  sameAs: [],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "NouMatch",
  url: SITE_URL,
};

const routeConfigs = [
  {
    test: (pathname) => pathname === "/",
    title: "Site de rencontres authentiques en Haïti | NouMatch",
    description:
      "NouMatch aide à faire des rencontres authentiques en Haïti grâce à des profils avec photo, une vérification email et une messagerie après match.",
    jsonLd: [organizationSchema, websiteSchema, faqSchema(HOME_FAQ_ITEMS)],
    hreflangs: [
      { hrefLang: "fr", href: `${SITE_URL}/` },
      { hrefLang: "x-default", href: `${SITE_URL}/` },
    ],
  },
  {
    test: (pathname) => pathname === "/rencontre-haiti" || pathname === "/landing/noumatch-haiti",
    title: "Site de rencontres en Haïti | NouMatch",
    description:
      "Découvrez NouMatch, un site de rencontres en Haïti pensé pour des échanges sérieux, des profils vérifiés et des connexions locales plus naturelles.",
    hreflangs: [
      { hrefLang: "fr-HT", href: `${SITE_URL}/rencontre-haiti` },
      { hrefLang: "fr", href: `${SITE_URL}/` },
      { hrefLang: "x-default", href: `${SITE_URL}/` },
    ],
  },
  {
    test: (pathname) => pathname === "/register",
    title: "Créer un profil de rencontre | NouMatch",
    description:
      "Créez votre profil NouMatch et commencez à faire des rencontres authentiques en Haïti dans une communauté plus sûre et plus sérieuse.",
  },
  {
    test: (pathname) => pathname === "/waitlist",
    title: "Liste d'attente rencontres en Haïti | NouMatch",
    description:
      "Rejoignez la liste d'attente NouMatch pour découvrir en avant-première une nouvelle expérience de rencontres en Haïti.",
    jsonLd: faqSchema(WAITLIST_FAQ_ITEMS),
  },
  {
    test: (pathname) => pathname === "/waitlist/women",
    title: "Liste d'attente femmes | NouMatch",
    description:
      "Rejoignez l'espace femmes de la liste d'attente NouMatch et soyez informée en priorité du lancement en Haïti.",
  },
  {
    test: (pathname) => pathname === "/waitlist/men",
    title: "Liste d'attente hommes | NouMatch",
    description:
      "Rejoignez l'espace hommes de la liste d'attente NouMatch et recevez les prochaines informations sur le lancement en Haïti.",
  },
  {
    test: (pathname) => pathname === "/privacy",
    title: "Politique de confidentialité | NouMatch",
    description:
      "Consultez la politique de confidentialité de NouMatch et découvrez comment vos données sont protégées.",
  },
  {
    test: (pathname) => pathname === "/terms",
    title: "Conditions d'utilisation | NouMatch",
    description:
      "Lisez les conditions d'utilisation de NouMatch pour comprendre les règles de la plateforme et de la communauté.",
  },
  {
    test: (pathname) => pathname === "/login",
    title: "Connexion | NouMatch",
    description: "Connectez-vous à NouMatch pour retrouver vos matchs, vos messages et votre profil.",
    robots: "noindex, nofollow",
  },
];

export const buildCanonicalUrl = (pathname = "/") => {
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  return `${SITE_URL}${normalizedPath}`;
};

export const getSeoConfig = (pathname = "/") => {
  const matched = routeConfigs.find((route) => route.test(pathname));
  const fallbackTitle = "Rencontres authentiques | NouMatch";
  const fallbackDescription =
    "NouMatch est un espace de rencontres moderne qui favorise des connexions authentiques dans une communauté respectueuse.";

  return {
    title: matched?.title || fallbackTitle,
    description: matched?.description || fallbackDescription,
    canonical: buildCanonicalUrl(pathname),
    ogImage: matched?.ogImage || DEFAULT_OG_IMAGE,
    robots: matched?.robots || "index, follow",
    jsonLd: matched?.jsonLd || null,
    hreflangs: matched?.hreflangs || [],
  };
};
