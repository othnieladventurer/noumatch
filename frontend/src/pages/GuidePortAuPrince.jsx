import React from "react";
import GuideArticle from "../components/GuideArticle.jsx";
import { GUIDE_PAGES } from "../lib/seo";

const HERO_IMAGE =
  "https://images.pexels.com/photos/3799180/pexels-photo-3799180.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1200&fit=crop";

const SECTIONS = [
  {
    id: "intentions",
    title: "Clarifier ce que vous cherchez avant d'écrire",
    intro:
      "Une rencontre réussie à Port-au-Prince commence souvent bien avant le rendez-vous, au moment où vous décidez ce que vous voulez vraiment.",
    paragraphs: [
      "Beaucoup d'échanges s'arrêtent parce que les deux personnes n'attendent pas la même chose : l'un cherche une relation suivie, l'autre veut simplement discuter. Ce n'est pas un problème en soi, mais le dire tôt évite les malentendus et les déceptions.",
      "Sur votre profil NouMatch, une phrase simple suffit : « Je cherche une relation sérieuse », « Je veux d'abord faire connaissance sans pression » ou « Je suis ouvert(e) à voir où ça mène ». Cette clarté filtre naturellement les échanges et rassure les personnes qui, comme vous, n'aiment pas perdre du temps.",
    ],
    note:
      "Une intention claire n'est pas une promesse. Vous avez le droit de changer d'avis après une première rencontre, à condition de le dire avec respect.",
  },
  {
    id: "lieu",
    title: "Choisir un lieu de rendez-vous à Port-au-Prince",
    intro:
      "La règle la plus importante reste la même partout : un lieu public, fréquenté et facile d'accès pour les deux personnes.",
    paragraphs: [
      "Port-au-Prince est une ville étendue et les trajets peuvent être longs. Le lieu du premier rendez-vous doit donc être pratique pour vous deux, et non uniquement pour la personne qui propose. Un café ou un restaurant connu dans un quartier central est souvent plus simple qu'un endroit isolé, même très agréable.",
      "Pétion-Ville, Delmas, Bois-Verna ou les abords du Champ de Mars offrent de nombreuses possibilités de cafés, pâtisseries et restaurants où l'on peut discuter tranquillement en journée. Un centre culturel, une librairie ou un parc fréquenté fonctionnent aussi très bien pour une rencontre courte.",
    ],
    list: {
      title: "Ce qui fait un bon premier lieu",
      items: [
        "Il est public, éclairé et fréquenté à l'heure choisie.",
        "Il est facile à trouver et à quitter si besoin.",
        "Il permet de s'asseoir et de parler sans crier.",
        "Vous connaissez déjà le quartier, ou vous pouvez y arriver sans dépendre de l'autre personne.",
        "Il ne vous oblige pas à dépenser beaucoup d'argent pour rester une heure.",
      ],
    },
  },
  {
    id: "invitation",
    title: "Proposer un rendez-vous sans mettre la pression",
    intro:
      "Une invitation réussie laisse toujours une porte de sortie à l'autre personne. C'est ce qui la rend facile à accepter.",
    paragraphs: [
      "Évitez les formulations fermées du type « On se voit samedi à 18h ». Préférez une proposition avec une alternative : « Ça te dirait un café samedi après-midi vers Delmas ? Sinon, dis-moi ce qui t'arrange. » Vous montrez de l'initiative sans imposer.",
      "Un premier rendez-vous court est plus facile à accepter qu'un dîner de trois heures. Proposez une heure, une heure et demie, autour d'un café ou d'une boisson. Si le courant passe, rien ne vous empêche de prolonger ou de vous revoir.",
      "Si la personne hésite ou repousse plusieurs fois sans proposer d'autre date, ne insistez pas. Une réponse claire, même négative, vaut mieux qu'un échange qui s'étire sans jamais aboutir.",
    ],
  },
  {
    id: "conversation",
    title: "Les sujets qui font une bonne conversation",
    intro:
      "On n'a pas besoin d'un plan de discussion. Quelques repères suffisent pour éviter les silences gênants et les sujets qui fâchent.",
    paragraphs: [
      "Commencez par ce que vous avez déjà en commun : la façon dont vous vous êtes trouvés sur NouMatch, votre quartier, un centre d'intérêt présent sur vos profils. Une question ouverte (« Qu'est-ce qui t'a donné envie de t'inscrire ? ») ouvre plus de portes qu'un interrogatoire.",
      "Posez des questions, mais écoutez vraiment les réponses. Une rencontre agréable, ce n'est pas une performance : c'est un échange où chacun a la place de parler. Il est normal d'être un peu nerveux, et le dire calmement détend souvent l'atmosphère.",
    ],
    list: {
      title: "À garder pour plus tard",
      items: [
        "Les détails de votre situation financière.",
        "Les conflits familiaux ou les histoires de ruptures compliquées.",
        "Les questions insistantes sur d'anciennes relations.",
        "Tout sujet qui vous met mal à l'aise : vous pouvez simplement dire que vous préférez en parler une autre fois.",
      ],
    },
  },
  {
    id: "logistique",
    title: "Transport, horaire et retour : préparez votre cadre",
    intro:
      "À Port-au-Prince, anticiper le trajet fait partie d'un rendez-vous serein, surtout en fin de journée.",
    paragraphs: [
      "Choisissez une heure qui vous laisse une marge pour arriver sans stress et repartir avant la nuit si vous ne connaissez pas bien le quartier. Prévoyez votre propre moyen de transport, ou l'argent nécessaire pour rentrer : dépendre entièrement de l'autre personne pour le retour réduit votre liberté.",
      "Prévenez une personne de confiance : le quartier, l'heure prévue et le nom du lieu. Ce n'est pas de la méfiance, c'est une habitude simple qui rassure et que beaucoup de personnes appliquent déjà.",
    ],
    note:
      "Si vous arrivez et que le lieu ne correspond pas à ce qui était prévu, ou si quelque chose vous semble anormal, vous pouvez repartir. Aucune politesse ne passe avant votre sécurité.",
  },
  {
    id: "suite",
    title: "Après le rendez-vous : la suite, sans faux-semblants",
    intro:
      "La façon de conclure compte autant que la rencontre elle-même.",
    paragraphs: [
      "Si vous avez passé un bon moment, dites-le simplement dans les heures qui suivent. Un message court et sincère (« J'ai aimé notre conversation, on se revoit bientôt ? ») est plus efficace qu'un long discours.",
      "Si vous ne souhaitez pas aller plus loin, une phrase respectueuse suffit : « Merci pour ce moment, je ne pense pas que ce soit la bonne direction pour moi. » Inutile de justifier longuement, encore moins de disparaître sans réponse : la personne en face mérite la même clarté que celle que vous attendez.",
    ],
  },
];

const FAQ = [
  {
    q: "Où organiser un premier rendez-vous à Port-au-Prince ?",
    a: "Privilégiez un lieu public, fréquenté et facile d'accès : un café, un restaurant, un parc ou un centre culturel. Évitez les lieux isolés et prévenez une personne de confiance.",
  },
  {
    q: "Combien de temps doit durer un premier rendez-vous ?",
    a: "Une heure à une heure et demie suffit pour faire connaissance. Une rencontre courte laisse une bonne impression et permet de décider sereinement de la suite.",
  },
  {
    q: "Qui doit proposer le lieu du rendez-vous ?",
    a: "La personne qui invite peut proposer deux options, puis laisser l'autre choisir. Le lieu doit rester pratique et rassurant pour les deux, pas seulement pour celle qui organise.",
  },
  {
    q: "Faut-il parler de NouMatch dès le premier rendez-vous ?",
    a: "Vous pouvez dire simplement que vous vous êtes rencontrés en ligne. L'important est de rester à l'aise et de ne partager que ce que vous souhaitez partager.",
  },
];

const RELATED = GUIDE_PAGES.filter((page) => page.path !== "/rencontres-port-au-prince");

export default function GuidePortAuPrince() {
  return (
    <GuideArticle
      eyebrow="Rencontrer à Port-au-Prince"
      title="Rencontre à Port-au-Prince : conseils et idées de rendez-vous"
      lead="Comment organiser une première rencontre simple, respectueuse et agréable à Port-au-Prince : le bon lieu, la bonne invitation, les sujets qui font la différence et les réflexes à garder en tête."
      readingTime="8 min"
      heroImage={HERO_IMAGE}
      heroAlt="Jeune homme souriant consultant son téléphone en ville"
      summary={[
        "Un premier rendez-vous se prépare : lieu public, horaire clair, transport prévu et personne de confiance prévenue.",
        "Une invitation qui laisse une alternative est toujours plus facile à accepter qu'une proposition ferme.",
        "Une rencontre d'une heure autour d'un café suffit pour savoir si vous avez envie de vous revoir.",
        "La clarté après le rendez-vous vaut mieux qu'une longue période de messages ambigus.",
      ]}
      sections={SECTIONS}
      faq={FAQ}
      related={RELATED}
      ctaTitle="Prêt(e) à rencontrer quelqu'un près de vous ?"
      ctaText="Créez un profil gratuit, précisez votre ville et découvrez des personnes qui partagent vos intentions en Haïti."
    />
  );
}
