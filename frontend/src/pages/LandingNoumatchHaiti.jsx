import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaCamera,
  FaCheckCircle,
  FaComments,
  FaEnvelopeOpenText,
  FaHeart,
  FaShieldAlt,
  FaUserCheck,
} from "react-icons/fa";
import { captureAttributionFromLocation } from "../lib/attribution";
import { trackLandingCTA } from "../lib/metaPixel";
import "../styles/landing-noumatch-haiti.css";

const PX = (id, w = 900, h = 1200) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;

const heroMainImage = PX(6578953, 1200, 900);
const heroSupportImage = PX(3967023, 800, 1000);
const stepCreateImage = PX(5991144, 700, 900);
const stepDiscoverImage = PX(6146927, 700, 900);
const stepMatchImage = PX(6579102, 700, 900);
const stepChatImage = PX(6280728, 700, 900);
const trustImage = PX(6311486, 900, 1100);
const storyMessageImage = PX(1820919, 700, 900);
const storyCityImage = PX(3799180, 700, 900);
const storyWalkImage = PX(6578830, 700, 900);
const finalCtaImage = PX(6579002, 1200, 800);

const proofStats = [
  {
    value: "Profils réels",
    label: "Photos et profils plus complets dès l’inscription",
  },
  {
    value: "Matchs mutuels",
    label: "La discussion s’ouvre uniquement après un intérêt partagé",
  },
  {
    value: "Communauté active",
    label: "De nouveaux profils rejoignent Noumatch régulièrement",
  },
];

const steps = [
  {
    icon: <FaUserCheck />,
    title: "Créez votre profil",
    copy: "Ajoutez vos photos, votre bio et quelques informations pour commencer à découvrir des profils.",
    image: stepCreateImage,
    alt: "Jeune femme haïtienne qui prépare son profil Noumatch sur son téléphone",
    kicker: "Étape 1",
    position: "center 18%",
  },
  {
    icon: <FaCamera />,
    title: "Découvrez des profils",
    copy: "Explorez des profils en Haïti et trouvez des personnes qui vous intéressent vraiment.",
    image: stepDiscoverImage,
    alt: "Jeune homme haïtien qui découvre des profils sur Noumatch",
    kicker: "Étape 2",
    position: "center 15%",
  },
  {
    icon: <FaHeart />,
    title: "Obtenez un Noumatch 💓",
    copy: "Quand l’intérêt est mutuel, le Noumatch débloque automatiquement la discussion.",
    image: stepMatchImage,
    alt: "Deux utilisateurs heureux après un match sur Noumatch",
    kicker: "Étape 3",
    position: "center 20%",
  },
  {
    icon: <FaComments />,
    title: "Commencez à discuter",
    copy: "Faites connaissance naturellement et voyez où la conversation vous mène.",
    image: stepChatImage,
    alt: "Jeune femme haïtienne qui échange sur Noumatch",
    kicker: "Étape 4",
    position: "center 12%",
  },
];

const trustItems = [
  {
    icon: <FaCamera />,
    title: "Profils avec photo",
    copy: "Ajoutez une vraie photo pour rendre les échanges plus authentiques.",
  },
  {
    icon: <FaEnvelopeOpenText />,
    title: "Vérification email",
    copy: "La vérification aide à protéger la qualité de la communauté.",
  },
  {
    icon: <FaShieldAlt />,
    title: "Blocage et signalement",
    copy: "Gardez le contrôle de votre expérience à tout moment.",
  },
  {
    icon: <FaCheckCircle />,
    title: "Modération active",
    copy: "Nous surveillons les profils et activités pour garder Noumatch agréable et sécurisé.",
  },
];

const storyCards = [
  {
    title: "Des conversations qui commencent naturellement",
    copy: "Des utilisateurs en Haïti commencent déjà à discuter et créer de nouvelles connexions sur Noumatch.",
    image: storyMessageImage,
    alt: "Femme haïtienne souriante lisant un message sur Noumatch",
    position: "center 10%",
  },
  {
    title: "Une expérience plus claire et moderne",
    copy: "Noumatch offre une interface simple, rapide et pensée pour de vraies rencontres.",
    image: storyCityImage,
    alt: "Jeune homme haïtien utilisant Noumatch en ville",
    position: "center 15%",
  },
  {
    title: "Plus qu’un simple swipe",
    copy: "L’objectif est de créer de vraies connexions entre personnes qui souhaitent réellement échanger.",
    image: storyWalkImage,
    alt: "Couple haïtien après une belle rencontre grâce à Noumatch",
    position: "center 25%",
  },
];

export default function LandingNoumatchHaiti() {
  const navigate = useNavigate();

  useEffect(() => {
    captureAttributionFromLocation(
      window.location.pathname,
      window.location.search
    );
  }, []);

  const handlePrimaryCta = () => {
    trackLandingCTA();
    navigate("/register");
  };

  return (
    <div className="nm-campaign-landing">
      <section className="nm-campaign-hero">
        <div className="nm-campaign-container">
          <div className="nm-campaign-hero__grid">
            <div className="nm-campaign-hero__copy">
              <span className="nm-campaign-pill">
                Disponible en Haïti 🇭🇹
              </span>

              <span className="nm-campaign-eyebrow">
                Rencontres • Matchs • Conversations
              </span>

              <h1>Rencontrez de nouvelles personnes sur Noumatch 💓</h1>

              <p className="nm-campaign-subheadline">
                Des hommes et femmes en Haïti matchent déjà et commencent à
                discuter sur Noumatch.
              </p>

              <p className="nm-campaign-supporting">
                Créez votre profil gratuitement, découvrez des profils près de
                vous et commencez à faire des rencontres dans une expérience
                simple et sécurisée.
              </p>

              <div className="nm-campaign-hero__actions">
                <button
                  type="button"
                  className="nm-campaign-btn nm-campaign-btn--primary"
                  onClick={handlePrimaryCta}
                >
                  Commencer gratuitement
                </button>

                <a
                  className="nm-campaign-btn nm-campaign-btn--ghost"
                  href="#comment-ca-marche"
                >
                  Comment ça marche ?
                </a>
              </div>

              <div className="nm-campaign-hero__inline-proof">
                <span>100% gratuit</span>
                <span>Profils avec photo</span>
                <span>Discussion après match</span>
              </div>
            </div>

            <div className="nm-campaign-hero__visual">
              <article className="nm-campaign-hero-card nm-campaign-hero-card--main">
                <img
                  src={heroMainImage}
                  alt="Couple haïtien dans un café animé"
                  fetchPriority="high"
                  decoding="async"
                />
              </article>

              <article className="nm-campaign-hero-card nm-campaign-hero-card--support">
                <img
                  src={heroSupportImage}
                  alt="Jeune couple haïtien profitant d’un moment ensemble"
                  decoding="async"
                />

                <div className="nm-campaign-hero-card__caption">
                  <span>
                    De nouvelles rencontres commencent chaque jour sur
                    Noumatch.
                  </span>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="nm-campaign-proofband">
        <div className="nm-campaign-container nm-campaign-proofband__grid">
          {proofStats.map((item) => (
            <div key={item.label} className="nm-campaign-stat">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="comment-ca-marche" className="nm-campaign-section">
        <div className="nm-campaign-container">
          <div className="nm-campaign-heading">
            <span className="nm-campaign-pill">Comment ça marche</span>

            <h2>Commencez à matcher en quelques étapes simples</h2>

            <p>
              Noumatch vous aide à rencontrer de nouvelles personnes en Haïti
              dans une expérience rapide, simple et naturelle.
            </p>
          </div>

          <div className="nm-campaign-steps">
            {steps.map((step) => (
              <article
                key={step.title}
                className="nm-campaign-step"
                style={{ "--nm-image-position": step.position }}
              >
                <div className="nm-campaign-step__image">
                  <img
                    src={step.image}
                    alt={step.alt}
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                <div className="nm-campaign-step__body">
                  <span>{step.kicker}</span>

                  <div className="nm-campaign-step__icon">{step.icon}</div>

                  <h3>{step.title}</h3>

                  <p>{step.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="nm-campaign-section nm-campaign-section--warm">
        <div className="nm-campaign-container nm-campaign-split">
          <div className="nm-campaign-split__media">
            <img
              src={trustImage}
              alt="Jeune femme haïtienne souriante utilisant Noumatch"
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="nm-campaign-split__copy">
            <span className="nm-campaign-pill">Confiance et sécurité</span>

            <h2>
              Une expérience pensée pour des rencontres plus rassurantes
            </h2>

            <p>
              Noumatch met l’accent sur des profils plus authentiques, des
              échanges plus sérieux et une meilleure expérience pour tous.
            </p>

            <div className="nm-campaign-trust">
              {trustItems.map((item) => (
                <article
                  key={item.title}
                  className="nm-campaign-trust__item"
                >
                  <div className="nm-campaign-trust__icon">{item.icon}</div>

                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="nm-campaign-section">
        <div className="nm-campaign-container">
          <div className="nm-campaign-heading nm-campaign-heading--compact">
            <span className="nm-campaign-pill">Communauté Noumatch</span>

            <h2>
              Des utilisateurs commencent déjà à matcher sur Noumatch 💓
            </h2>
          </div>

          <div className="nm-campaign-stories">
            {storyCards.map((card) => (
              <article
                key={card.title}
                className="nm-campaign-story"
                style={{ "--nm-image-position": card.position }}
              >
                <img
                  src={card.image}
                  alt={card.alt}
                  loading="lazy"
                  decoding="async"
                />

                <div className="nm-campaign-story__body">
                  <h3>{card.title}</h3>
                  <p>{card.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="nm-campaign-section nm-campaign-section--final">
        <div className="nm-campaign-container">
          <div className="nm-campaign-final">
            <div className="nm-campaign-final__image">
              <img
                src={finalCtaImage}
                alt="Couple haïtien profitant d’un rendez-vous après un match"
                loading="lazy"
                decoding="async"
              />
            </div>

            <div className="nm-campaign-final__copy">
              <span className="nm-campaign-pill">
                Prêt(e) à rejoindre Noumatch ?
              </span>

              <h2>Commencez gratuitement aujourd’hui</h2>

              <p>
                Créez votre profil, découvrez de nouvelles personnes et
                commencez à matcher sur Noumatch.
              </p>

              <button
                type="button"
                className="nm-campaign-btn nm-campaign-btn--primary"
                onClick={handlePrimaryCta}
              >
                Créer mon profil gratuitement
                <FaArrowRight />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

