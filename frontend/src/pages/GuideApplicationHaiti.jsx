import React from "react";
import GuideArticle from "../components/GuideArticle.jsx";
import { GUIDE_PAGES } from "../lib/seo";

const HERO_IMAGE =
  "https://images.pexels.com/photos/6146927/pexels-photo-6146927.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1200&fit=crop";

const SECTIONS = [
  {
    id: "criteres",
    title: "Les critères qui comptent vraiment",
    intro:
      "Les comparatifs d'applications se ressemblent souvent. Voici ce qui change réellement l'expérience au quotidien.",
    paragraphs: [
      "Le premier critère est local : une application utilisée par des personnes de votre région produit des rencontres réellement possibles. Une grande application internationale avec peu d'utilisateurs à Port-au-Prince ou au Cap-Haïtien donnera moins de résultats qu'une plateforme plus petite mais ancrée en Haïti.",
      "Le deuxième critère est la qualité des profils. Une photo obligatoire, une bio minimale et une vérification par email réduisent fortement le nombre de faux comptes. Ce sont des contraintes ennuyeuses à l'inscription, mais elles améliorent tout ce qui vient ensuite.",
      "Viennent enfin la modération et la sécurité : possibilité de bloquer, de signaler, et une équipe qui répond. Une application sans aucun moyen de signalement n'est pas une application gratuite, c'est une application inachevée.",
    ],
    list: {
      title: "Ce qu'il vaut mieux vérifier avant de s'inscrire",
      items: [
        "Des profils actifs dans votre ville ou votre région.",
        "Une photo et une bio demandées dès la création du profil.",
        "Une vérification de l'adresse email.",
        "Des fonctions de blocage et de signalement accessibles.",
        "Une politique de confidentialité claire sur l'usage de vos données.",
      ],
    },
  },
  {
    id: "gratuit",
    title: "Ce qui est gratuit, et ce qui ne l'est pas",
    intro:
      "Beaucoup d'applications annoncent la gratuité puis demandent un abonnement pour envoyer le premier message.",
    paragraphs: [
      "Sur NouMatch, la création du profil est gratuite, ainsi que les fonctions essentielles : découvrir des profils, exprimer un intérêt et discuter une fois l'intérêt réciproque. Aucun paiement n'est demandé pour s'inscrire ou commencer à échanger avec une personne qui vous a aussi choisi.",
      "Méfiez-vous des applications qui facturent la lecture des messages reçus ou qui affichent des profils inaccessibles sans abonnement. Ce n'est pas interdit, mais cela change complètement l'expérience, et il vaut mieux le savoir avant de créer un profil.",
    ],
    note:
      "Une application de rencontre sérieuse ne vous demandera jamais de payer des « frais de vérification » par transfert ou carte cadeau. C'est une arnaque courante.",
  },
  {
    id: "profil",
    title: "Créer un profil qui inspire confiance",
    intro:
      "Votre profil n'a pas besoin d'être parfait. Il doit surtout être honnête et lisible en quelques secondes.",
    paragraphs: [
      "Choisissez une photo récente, nette, où votre visage est bien visible. Évitez les photos de groupe, les selfies flous et les images qui ne vous ressemblent plus. Une deuxième photo dans un contexte simple — un lieu, une activité — complète bien la première.",
      "Pour la bio, trois éléments suffisent : ce que vous faites au quotidien, ce que vous aimez faire, et ce que vous cherchez ici. Deux ou trois phrases suffisent. Les profils vides ou remplis de citations génériques donnent peu envie d'écrire.",
    ],
    list: {
      title: "Un profil efficace en trois lignes",
      items: [
        "« Je travaille dans [domaine] et j'aime [activité concrète]. »",
        "« Le week-end, on me trouve souvent [lieu ou habitude]. »",
        "« Je cherche [type de relation] avec quelqu'un de [valeur importante pour vous]. »",
      ],
    },
  },
  {
    id: "premiers-echanges",
    title: "Les premiers échanges : éviter les conversations qui s'éteignent",
    intro:
      "Un « salut ça va » envoyé à vingt personnes produit rarement une conversation. Une phrase personnalisée produit beaucoup plus.",
    paragraphs: [
      "Lisez le profil avant d'écrire et reprenez un élément précis : une activité, un lieu, une photo. Une question simple et concrète (« Tu connais un bon endroit pour [activité] dans le coin ? ») donne une raison de répondre.",
      "Ne cherchez pas à écrire un long message. Deux ou trois phrases suffisent pour ouvrir la porte. Si la personne répond brièvement plusieurs fois, sans jamais poser de question, il est inutile d'insister : passez à un autre profil.",
    ],
    note:
      "La réciprocité est le meilleur indicateur. Une conversation saine ressemble à un échange, pas à un entretien.",
  },
  {
    id: "passer-au-reel",
    title: "Passer de l'application à une vraie rencontre",
    intro:
      "Discuter pendant des semaines sans jamais se voir finit par épuiser les deux personnes.",
    paragraphs: [
      "Quand l'échange est fluide et que vous vous sentez à l'aise, proposez un rendez-vous simple : un café, une boisson, une heure. L'objectif n'est pas d'impressionner, mais de vérifier si la conversation fonctionne aussi en personne.",
      "Appliquez les mêmes précautions que pour toute rencontre en ligne : lieu public, transport prévu, personne de confiance informée. Ces réflexes n'ont rien d'excessif et permettent d'aborder le rendez-vous plus détendu.",
    ],
  },
];

const FAQ = [
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
  {
    q: "Combien de temps attendre avant de proposer un rendez-vous ?",
    a: "Il n'y a pas de règle fixe. Quand l'échange est fluide et réciproque, proposer un café après quelques jours de conversation est une bonne approche.",
  },
];

const RELATED = GUIDE_PAGES.filter((page) => page.path !== "/application-rencontre-haiti");

export default function GuideApplicationHaiti() {
  return (
    <GuideArticle
      eyebrow="Choisir"
      title="Application de rencontre en Haïti : comment choisir et bien démarrer"
      lead="Les critères qui font vraiment la différence entre deux applications, ce qui est réellement gratuit, et comment créer un profil qui donne envie de vous écrire."
      readingTime="7 min"
      heroImage={HERO_IMAGE}
      heroAlt="Jeune homme consultant une application de rencontre sur son téléphone"
      summary={[
        "Une application utilisée localement produit plus de rencontres possibles qu'une application internationale vide dans votre ville.",
        "Photo obligatoire, bio minimale et vérification email réduisent fortement les faux profils.",
        "La création de profil et les fonctions essentielles de NouMatch sont gratuites.",
        "Une photo récente et trois phrases honnêtes suffisent pour un bon profil.",
      ]}
      sections={SECTIONS}
      faq={FAQ}
      related={RELATED}
      ctaTitle="Créer votre profil sur NouMatch"
      ctaText="Inscription gratuite, vérification par email et messagerie après intérêt mutuel : un cadre simple pour commencer."
    />
  );
}
