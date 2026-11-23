export const SITE_URL = "https://noumatch.com";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/main_img.png`;
export const CONTENT_UPDATED = "2026-11-22";

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

const articleSchema = ({ headline, description, path, datePublished = CONTENT_UPDATED }) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline,
  description,
  mainEntityOfPage: `${SITE_URL}${path}`,
  url: `${SITE_URL}${path}`,
  datePublished,
  dateModified: CONTENT_UPDATED,
  inLanguage: "fr",
  author: {
    "@type": "Organization",
    name: "NouMatch",
    url: SITE_URL,
  },
  publisher: {
    "@type": "Organization",
    name: "NouMatch",
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/noumatch-logo.png`,
    },
  },
});

const breadcrumbSchema = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: `${SITE_URL}${item.path}`,
  })),
});

const guideSchema = ({ headline, description, path, faqItems }) => [
  articleSchema({ headline, description, path }),
  breadcrumbSchema([
    { name: "Accueil", path: "/" },
    { name: "Guides", path: "/guides" },
    { name: headline, path },
  ]),
  ...(faqItems?.length ? [faqSchema(faqItems)] : []),
];

const GUIDES_BREADCRUMB = [
  { name: "Accueil", path: "/" },
  { name: "Guides", path: "/guides" },
];

export const GUIDES_INDEX_FAQ = [
  {
    q: "NouMatch est-il gratuit ?",
    a: "La création d'un profil NouMatch est gratuite. Les fonctionnalités essentielles, comme la découverte de profils et la discussion après un match, sont accessibles sans payer.",
  },
  {
    q: "Comment rencontrer des personnes près de chez moi en Haïti ?",
    a: "Indiquez votre ville dans votre profil, ajoutez une photo récente et des centres d'intérêt précis. Les profils les plus complets sont aussi les plus faciles à découvrir.",
  },
  {
    q: "Que faire si une conversation me met mal à l'aise ?",
    a: "Ne partagez aucune information sensible, arrêtez l'échange et utilisez le blocage ou le signalement. Vous pouvez aussi nous contacter à support@noumatch.com.",
  },
];

export const GUIDE_PAGES = [
  {
    path: "/rencontres-port-au-prince",
    label: "Rencontrer à Port-au-Prince",
    description:
      "Idées de rendez-vous, lieux et conseils pour faire des rencontres à Port-au-Prince avec respect et sécurité.",
  },
  {
    path: "/securite-rencontres-en-ligne",
    label: "Sécurité des rencontres en ligne",
    description:
      "Les bons réflexes avant, pendant et après un rendez-vous pour protéger vos informations et votre tranquillité.",
  },
  {
    path: "/application-rencontre-haiti",
    label: "Choisir une application de rencontre",
    description:
      "Comment comparer les applications de rencontre en Haïti et démarrer sur NouMatch sans perdre de temps.",
  },
];

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
    test: (pathname) => pathname === "/rencontre-haiti",
    title: "Site de rencontres en Haïti | NouMatch",
    description:
      "Découvrez NouMatch, un site de rencontres en Haïti pensé pour des échanges sérieux, des profils vérifiés et des connexions locales plus naturelles.",
    canonical: `${SITE_URL}/rencontre-haiti`,
    hreflangs: [
      { hrefLang: "fr-HT", href: `${SITE_URL}/rencontre-haiti` },
      { hrefLang: "fr", href: `${SITE_URL}/` },
      { hrefLang: "x-default", href: `${SITE_URL}/` },
    ],
  },
  {
    test: (pathname) => pathname === "/landing/noumatch-haiti",
    title: "Site de rencontres en Haïti | NouMatch",
    description:
      "Découvrez NouMatch, un site de rencontres en Haïti pensé pour des échanges sérieux, des profils vérifiés et des connexions locales plus naturelles.",
    canonical: `${SITE_URL}/rencontre-haiti`,
    robots: "noindex, follow",
  },
  {
    test: (pathname) => pathname === "/guides",
    title: "Guides de rencontres en Haïti | NouMatch",
    description:
      "Conseils pratiques pour faire des rencontres en Haïti : rendez-vous à Port-au-Prince, sécurité en ligne et choix d'une application de rencontre.",
    jsonLd: [
      breadcrumbSchema(GUIDES_BREADCRUMB),
      faqSchema(GUIDES_INDEX_FAQ),
    ],
  },
  {
    test: (pathname) => pathname === "/rencontres-port-au-prince",
    title: "Rencontre à Port-au-Prince : conseils et idées de rendez-vous | NouMatch",
    description:
      "Où et comment faire une bonne première rencontre à Port-au-Prince ? Idées de rendez-vous, conseils de conversation et règles de sécurité.",
    jsonLd: guideSchema({
      headline: "Rencontre à Port-au-Prince : conseils et idées de rendez-vous",
      description:
        "Où et comment faire une bonne première rencontre à Port-au-Prince ? Idées de rendez-vous, conseils de conversation et règles de sécurité.",
      path: "/rencontres-port-au-prince",
      faqItems: [
        {
          q: "Où organiser un premier rendez-vous à Port-au-Prince ?",
          a: "Privilégiez un lieu public, fréquenté et facile d'accès : un café, un restaurant, un parc ou un centre culturel. Évitez les lieux isolés et prévenez une personne de confiance.",
        },
        {
          q: "Combien de temps doit durer un premier rendez-vous ?",
          a: "Une heure à une heure et demie suffit pour faire connaissance. Une rencontre courte laisse une bonne impression et permet de décider sereinement de la suite.",
        },
        {
          q: "Faut-il parler de NouMatch dès le premier rendez-vous ?",
          a: "Vous pouvez dire simplement que vous vous êtes rencontrés en ligne. L'important est de rester à l'aise et de ne partager que ce que vous souhaitez partager.",
        },
      ],
    }),
  },
  {
    test: (pathname) => pathname === "/securite-rencontres-en-ligne",
    title: "Sécurité des rencontres en ligne en Haïti : 10 règles | NouMatch",
    description:
      "Protégez vos informations et abordez vos rencontres en ligne plus sereinement : signaux d'alerte, premier rendez-vous, blocage et signalement.",
    jsonLd: guideSchema({
      headline: "Sécurité des rencontres en ligne en Haïti : 10 règles à connaître",
      description:
        "Protégez vos informations et abordez vos rencontres en ligne plus sereinement : signaux d'alerte, premier rendez-vous, blocage et signalement.",
      path: "/securite-rencontres-en-ligne",
      faqItems: [
        {
          q: "Quelles informations ne faut-il jamais partager en ligne ?",
          a: "Ne partagez pas votre adresse exacte, votre numéro de compte bancaire, vos mots de passe ni vos pièces d'identité avant d'avoir une confiance solide. Aucune plateforme sérieuse ne vous demandera votre mot de passe.",
        },
        {
          q: "Quand faut-il signaler un profil ?",
          a: "Signalez un profil qui demande de l'argent, insiste pour quitter la plateforme immédiatement, envoie des messages menaçants ou utilise des photos qui semblent volées.",
        },
        {
          q: "Comment annuler un rendez-vous qui ne me met pas à l'aise ?",
          a: "Vous avez le droit de partir à tout moment. Dites simplement que vous préférez arrêter, quittez le lieu et prévenez la personne qui vous accompagne ou qui sait où vous êtes.",
        },
      ],
    }),
  },
  {
    test: (pathname) => pathname === "/application-rencontre-haiti",
    title: "Application de rencontre gratuite en Haïti | NouMatch",
    description:
      "Comment choisir une application de rencontre en Haïti et bien démarrer sur NouMatch : profil, photo, premiers échanges et sécurité.",
    jsonLd: guideSchema({
      headline: "Application de rencontre en Haïti : comment choisir et bien démarrer",
      description:
        "Comment choisir une application de rencontre en Haïti et bien démarrer sur NouMatch : profil, photo, premiers échanges et sécurité.",
      path: "/application-rencontre-haiti",
      faqItems: [
        {
          q: "Quelle est la meilleure application de rencontre en Haïti ?",
          a: "Il n'existe pas une seule réponse : cherchez une application utilisée localement, avec des profils complets, une modération claire et des règles de sécurité accessibles. NouMatch est conçue pour les rencontres en Haïti.",
        },
        {
          q: "Faut-il payer pour utiliser NouMatch ?",
          a: "Non. La création de profil et les fonctions essentielles sont gratuites. Aucun paiement n'est demandé pour s'inscrire ou commencer à discuter après un match.",
        },
        {
          q: "Quelle photo choisir pour son profil ?",
          a: "Une photo récente, nette et où votre visage est bien visible. Évitez les photos de groupe, les images floues et les photos qui ne vous ressemblent pas.",
        },
      ],
    }),
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
  {
    test: (pathname) => pathname === "/404",
    title: "Page introuvable | NouMatch",
    description: "Cette page n'existe pas ou a été déplacée. Retrouvez les pages publiques de NouMatch.",
    robots: "noindex, follow",
    canonical: null,
  },
];

export const buildCanonicalUrl = (pathname = "/") => {
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  return `${SITE_URL}${normalizedPath}`;
};

export const getSeoConfig = (pathname = "/") => {
  // Hosts and visitors both produce "/guides/" as well as "/guides"; match on
  // the normalized path so a trailing slash never falls back to 404 metadata.
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";
  const matched = routeConfigs.find((route) => route.test(normalizedPath));
  const fallbackTitle = "Page introuvable | NouMatch";
  const fallbackDescription =
    "Cette page n'existe pas ou a été déplacée. Retrouvez les pages publiques et les guides de NouMatch.";

  return {
    title: matched?.title || fallbackTitle,
    description: matched?.description || fallbackDescription,
    canonical: matched?.canonical === null
      ? null
      : matched?.canonical || (matched ? buildCanonicalUrl(normalizedPath) : null),
    ogImage: matched?.ogImage || DEFAULT_OG_IMAGE,
    // Known public routes are indexable unless they opt out; only unknown
    // paths fall back to noindex.
    robots: matched ? matched.robots || "index, follow" : "noindex, follow",
    jsonLd: matched?.jsonLd || null,
    hreflangs: matched?.hreflangs || [],
  };
};
