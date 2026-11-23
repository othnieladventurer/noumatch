import React from "react";
import GuideArticle from "../components/GuideArticle.jsx";
import { GUIDE_PAGES } from "../lib/seo";

const HERO_IMAGE =
  "https://images.pexels.com/photos/6311486/pexels-photo-6311486.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1200&fit=crop";

const SECTIONS = [
  {
    id: "signaux",
    title: "1. Apprendre à reconnaître les signaux d'alerte",
    intro:
      "La plupart des mauvaises expériences en ligne commencent par un détail que l'on aurait pu remarquer plus tôt.",
    paragraphs: [
      "Un profil qui demande de l'argent, même sous forme de prêt temporaire, est le signal le plus fiable. Personne n'a besoin de votre aide financière pour venir vous rencontrer. Les demandes de recharges téléphoniques, de transferts ou de « frais de douane » relèvent du même schéma.",
      "D'autres drapeaux rouges sont plus discrets : une personne qui refuse tout appel vidéo, qui insiste pour continuer la conversation sur une autre application dès les premiers messages, ou qui déclare une affection très forte après deux jours d'échanges. La rapidité excessive n'est pas romantique, elle est souvent stratégique.",
    ],
    list: {
      title: "Signaux qui justifient d'arrêter l'échange",
      items: [
        "Une demande d'argent, de carte cadeau ou de crypto, quelle qu'en soit la raison.",
        "Une insistance pour obtenir votre adresse exacte avant même un premier rendez-vous.",
        "Des photos qui semblent professionnelles et que vous retrouvez ailleurs sur internet.",
        "Des messages menaçants, culpabilisants ou qui refusent votre droit de dire non.",
        "Une identité qui change au fil des conversations (ville, métier, âge).",
      ],
    },
  },
  {
    id: "informations",
    title: "2. Protéger vos informations personnelles",
    intro:
      "Vous pouvez être sincère sans tout révéler dès la première semaine.",
    paragraphs: [
      "Votre adresse exacte, votre lieu de travail précis, le nom de vos enfants ou vos horaires habituels n'ont pas besoin de figurer sur un profil public. Un quartier suffit pour situer une personne, et il vaut mieux donner un point de rendez-vous public qu'une adresse privée.",
      "Ne partagez jamais vos mots de passe, vos codes de vérification reçus par SMS ou vos informations bancaires. Aucune plateforme sérieuse ne vous demandera un mot de passe par message, et aucune personne honnête n'a besoin de votre code OTP.",
    ],
    note:
      "Si un compte vous semble usurpé, changez votre mot de passe et signalez le profil. La rapidité compte plus que l'enquête personnelle.",
  },
  {
    id: "verifier",
    title: "3. Vérifier l'identité sans jouer au détective",
    intro:
      "Quelques gestes simples suffisent pour vérifier que la personne en face est bien celle qu'elle prétend être.",
    paragraphs: [
      "Proposez un appel vidéo court avant le rendez-vous. Ce n'est pas un test de beauté, c'est une confirmation : la voix, le visage et la façon de parler correspondent-ils au profil ? Une personne sincère acceptera généralement, même brièvement.",
      "Regardez aussi la cohérence du profil : plusieurs photos dans des contextes différents, une bio qui ne contredit pas les messages, et des réponses qui ne changent pas d'un jour à l'autre. La cohérence est un meilleur indicateur que l'enthousiasme.",
    ],
  },
  {
    id: "avant",
    title: "4. Préparer le premier rendez-vous",
    intro:
      "Le premier rendez-vous doit se dérouler dans un cadre que vous avez choisi en partie.",
    paragraphs: [
      "Choisissez ensemble un lieu public et fréquenté, de préférence dans un quartier que vous connaissez. Prévoyez vous-même votre transport aller et retour, et gardez de quoi rentrer même si la rencontre se passe mal.",
      "Prévenez une personne de confiance : où vous allez, avec qui, et à quelle heure vous pensez rentrer. Envoyez-lui le profil ou le nom de la personne. Cette habitude n'enlève rien à la magie du moment, elle vous donne simplement un filet de sécurité.",
    ],
    list: {
      title: "Checklist avant de partir",
      items: [
        "Téléphone chargé et moyen de transport prévu.",
        "Lieu public confirmé par écrit avec la personne.",
        "Une personne de confiance informée de l'heure et du lieu.",
        "Aucune dépendance à l'autre personne pour rentrer.",
        "La possibilité de partir à tout moment sans devoir se justifier longuement.",
      ],
    },
  },
  {
    id: "pendant",
    title: "5. Pendant le rendez-vous : rester attentif à votre ressenti",
    intro:
      "Votre malaise est une information, pas un manque de politesse.",
    paragraphs: [
      "Vous n'avez aucune obligation de rester si l'ambiance devient désagréable. Si la personne insiste pour changer de lieu, pour vous emmener ailleurs en voiture, ou si elle se montre agressive dès la première heure, vous pouvez dire que vous devez partir et le faire.",
      "Surveillez votre boisson et ne laissez pas votre verre sans surveillance. Ce conseil s'applique partout, et il n'a rien d'excessif : mieux vaut une soirée écourtée qu'une situation difficile à gérer.",
    ],
    note:
      "En cas de danger immédiat, contactez les autorités locales ou une personne proche. Votre sécurité passe avant toute considération de politesse.",
  },
  {
    id: "signaler",
    title: "6. Bloquer, signaler, et ne pas rester seul(e)",
    intro:
      "Signaler n'est pas une dénonciation excessive : c'est ce qui protège les autres membres.",
    paragraphs: [
      "Si un échange vous met mal à l'aise, arrêtez la conversation et utilisez la fonction de blocage. Vous n'avez pas à expliquer votre décision ni à négocier votre silence.",
      "Signalez le profil dans l'application et, si nécessaire, écrivez à support@noumatch.com avec les éléments utiles : captures d'écran, nom du profil, date des messages. Les signalements servent à repérer les comportements répétés, pas seulement les incidents isolés.",
      "Parlez-en aussi à une personne de confiance. Une mauvaise expérience paraît souvent plus lourde quand on la garde pour soi.",
    ],
  },
  {
    id: "apres",
    title: "7. Après le rendez-vous : garder le contrôle",
    intro:
      "La sécurité ne s'arrête pas à la fin du rendez-vous.",
    paragraphs: [
      "Vous pouvez décider de ne pas donner suite, et le dire simplement. Une phrase claire et respectueuse suffit, sans avoir à justifier votre choix. Inversement, si vous souhaitez revoir la personne, proposez vous-même le prochain rendez-vous plutôt que d'attendre.",
      "Si vous recevez des messages insistants après avoir dit non, bloquez. Une réponse polie n'est pas une obligation, surtout quand votre refus a déjà été exprimé clairement.",
    ],
  },
];

const FAQ = [
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
  {
    q: "Un appel vidéo avant le rendez-vous, est-ce trop demander ?",
    a: "Non, c'est une précaution raisonnable et courante. Une personne sincère acceptera un échange vidéo court, même maladroit, avant une première rencontre.",
  },
];

const RELATED = GUIDE_PAGES.filter((page) => page.path !== "/securite-rencontres-en-ligne");

export default function GuideSecurite() {
  return (
    <GuideArticle
      eyebrow="Sécurité"
      title="Sécurité des rencontres en ligne : 10 règles à connaître"
      lead="Protéger ses informations, reconnaître les signaux d'alerte, préparer un premier rendez-vous et savoir dire non : les bons réflexes pour aborder les rencontres en ligne plus sereinement en Haïti."
      readingTime="8 min"
      heroImage={HERO_IMAGE}
      heroAlt="Jeune femme souriante assise dans un café"
      summary={[
        "Une demande d'argent, quelle qu'en soit la raison, met fin à la conversation.",
        "Votre adresse exacte et vos informations bancaires n'ont rien à faire dans un profil.",
        "Un appel vidéo court et un lieu public sont les deux meilleures précautions avant un premier rendez-vous.",
        "Bloquer et signaler protège aussi les autres membres de la communauté.",
      ]}
      sections={SECTIONS}
      faq={FAQ}
      related={RELATED}
      ctaTitle="Des rencontres plus sereines, dès le départ"
      ctaText="Un profil complet, une photo réelle et une messagerie après match : NouMatch met un cadre clair autour de vos échanges."
    />
  );
}
