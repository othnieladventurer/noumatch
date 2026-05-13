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
const PX = (id, w = 900, h = 1200) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;

// Young Black couple embracing with balloons — hero card
const heroMainImage = PX(6578953, 1200, 900);
// Young Black couple kissing by window — secondary hero card
const heroSupportImage = PX(3967023, 800, 1000);
// Black woman smiling while on phone — Step 1: create profile
const stepCreateImage = PX(5991144, 700, 900);
// Young Black man laughing with phone in park — Step 2: discover
const stepDiscoverImage = PX(6146927, 700, 900);
// Black couple laughing together with phone on couch — Step 3: match
const stepMatchImage = PX(6579102, 700, 900);
// Black woman with tablet on city steps — Step 4: chat
const stepChatImage = PX(6280728, 700, 900);
// Young Black woman smiling in hoodie — trust section
const trustImage = PX(6311486, 900, 1100);
// Radiant Black woman laughing outdoors — story 1
const storyMessageImage = PX(1820919, 700, 900);
// Black man on phone call on street — story 2
const storyCityImage = PX(3799180, 700, 900);
// Young Black couple relaxing together at home — story 3
const storyWalkImage = PX(6578830, 700, 900);
// Black couple holding hands at a date — final CTA
const finalCtaImage = PX(6579002, 1200, 800);
import { captureAttributionFromLocation } from "../lib/attribution";
import { trackLandingCTA } from "../lib/metaPixel";
import "../styles/landing-noumatch-haiti.css";

const HAITI_FLAG = "\uD83C\uDDED\uD83C\uDDF9";

const proofStats = [
  { value: "Photo", label: "profils visuels d\u00e8s le d\u00e9part" },
  { value: "Email", label: "v\u00e9rification avant l'acc\u00e8s complet" },
  { value: "Actif", label: "mod\u00e9ration et signalement int\u00e9gr\u00e9s" },
];

const steps = [
  {
    icon: <FaUserCheck />,
    title: "Cr\u00e9e ton profil",
    copy: "Ajoute l'essentiel, une photo claire et une pr\u00e9sence qui donne envie de te d\u00e9couvrir.",
    image: stepCreateImage,
    alt: "Jeune femme ha\u00eftienne qui pr\u00e9pare son profil de rencontre sur son t\u00e9l\u00e9phone",
    kicker: "\u00c9tape 1",
    position: "center 18%",
  },
  {
    icon: <FaCamera />,
    title: "D\u00e9couvre des profils",
    copy: "Parcours des profils pens\u00e9s pour des rencontres en Ha\u00efti avec une vraie mise en confiance.",
    image: stepDiscoverImage,
    alt: "Jeune homme ha\u00eftien qui regarde des profils sur son t\u00e9l\u00e9phone depuis une terrasse",
    kicker: "\u00c9tape 2",
    position: "center 15%",
  },
  {
    icon: <FaHeart />,
    title: "Match",
    copy: "Quand l'int\u00e9r\u00eat est partag\u00e9, le match s'active et la conversation devient naturelle.",
    image: stepMatchImage,
    alt: "Deux jeunes adultes ha\u00eftiens r\u00e9agissent ensemble \u00e0 un match sur t\u00e9l\u00e9phone",
    kicker: "\u00c9tape 3",
    position: "center 20%",
  },
  {
    icon: <FaComments />,
    title: "Commence \u00e0 discuter",
    copy: "Passe du swipe \u00e0 l'\u00e9change r\u00e9el et vois vite si l'\u00e9nergie est l\u00e0.",
    image: stepChatImage,
    alt: "Jeune femme ha\u00eftienne qui marche en regardant une conversation sur son t\u00e9l\u00e9phone",
    kicker: "\u00c9tape 4",
    position: "center 12%",
  },
];

const trustItems = [
  {
    icon: <FaCamera />,
    title: "Profils avec photo",
    copy: "La premi\u00e8re impression compte. NouMatch pousse un profil plus complet d\u00e8s le d\u00e9part.",
  },
  {
    icon: <FaEnvelopeOpenText />,
    title: "V\u00e9rification email",
    copy: "La v\u00e9rification r\u00e9duit le bruit et aide \u00e0 garder une communaut\u00e9 plus s\u00e9rieuse.",
  },
  {
    icon: <FaShieldAlt />,
    title: "Blocage et signalement",
    copy: "Si quelque chose ne te convient pas, les outils de protection sont d\u00e9j\u00e0 l\u00e0.",
  },
  {
    icon: <FaCheckCircle />,
    title: "Mod\u00e9ration active",
    copy: "Le cadre reste surveill\u00e9 pour prot\u00e9ger la qualit\u00e9 des \u00e9changes et des profils.",
  },
];

const storyCards = [
  {
    title: "Des conversations qui d\u00e9marrent sans lourdeur",
    copy: "La communaut\u00e9 NouMatch grandit en Ha\u00efti. Des matchs et conversations commencent d\u00e9j\u00e0.",
    image: storyMessageImage,
    alt: "Portrait d'une femme ha\u00eftienne souriante qui lit un message sur son t\u00e9l\u00e9phone",
    position: "center 10%",
  },
  {
    title: "Une ambiance plus claire d\u00e8s la premi\u00e8re visite",
    copy: "Le mix entre profils, visuels et v\u00e9rification cr\u00e9e une impression plus s\u00e9rieuse qu'une simple page g\u00e9n\u00e9rique.",
    image: storyCityImage,
    alt: "Jeune homme ha\u00eftien qui consulte son t\u00e9l\u00e9phone avec un cadre urbain en arri\u00e8re-plan",
    position: "center 15%",
  },
  {
    title: "Du virtuel \u00e0 la vraie rencontre",
    copy: "L'objectif n'est pas juste de swiper. La page pr\u00e9pare d\u00e9j\u00e0 l'id\u00e9e d'une vraie rencontre ensuite.",
    image: storyWalkImage,
    alt: "Couple ha\u00eftien qui marche ensemble apr\u00e8s une belle premi\u00e8re rencontre",
    position: "center 25%",
  },
];

export default function LandingNoumatchHaiti() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Site de rencontres en Ha\u00efti | NouMatch";
    captureAttributionFromLocation(window.location.pathname, window.location.search);
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
              <span className="nm-campaign-pill">{"Rencontres en Ha\u00efti"}</span>
              <span className="nm-campaign-eyebrow">{"Une landing page pens\u00e9e pour Facebook et Instagram"}</span>
              <h1>{`Site de rencontres en Ha\u00efti ${HAITI_FLAG}`}</h1>
              <p className="nm-campaign-subheadline">
                {"Des utilisateurs matchent d\u00e9j\u00e0 et commencent \u00e0 discuter sur NouMatch."}
              </p>
              <p className="nm-campaign-supporting">
                {"Une exp\u00e9rience mobile-first, plus claire et plus rassurante pour transformer un clic publicitaire en vraie inscription."}
              </p>

              <div className="nm-campaign-hero__actions">
                <button type="button" className="nm-campaign-btn nm-campaign-btn--primary" onClick={handlePrimaryCta}>
                  {"Cr\u00e9er mon profil gratuitement"}
                </button>
                <a className="nm-campaign-btn nm-campaign-btn--ghost" href="#comment-ca-marche">
                  {"Voir comment \u00e7a marche"}
                </a>
              </div>

              <div className="nm-campaign-hero__inline-proof">
                <span>Photo requise</span>
                <span>{"V\u00e9rification email"}</span>
                <span>{"Messagerie apr\u00e8s match"}</span>
              </div>
            </div>

            <div className="nm-campaign-hero__visual">
              <article className="nm-campaign-hero-card nm-campaign-hero-card--main">
                <img
                  src={heroMainImage}
                  alt={"Couple ha\u00eftien dans un caf\u00e9 anim\u00e9 l'apr\u00e8s-midi"}
                  fetchPriority="high"
                  decoding="async"
                />
              </article>
              <article className="nm-campaign-hero-card nm-campaign-hero-card--support">
                <img
                  src={heroSupportImage}
                  alt={"Couple ha\u00eftien debout devant un caf\u00e9 avec une ambiance l\u00e9g\u00e8re"}
                  decoding="async"
                />
                <div className="nm-campaign-hero-card__caption">
                  <span>{"Des rencontres qui commencent dans de vrais lieux, avec une vraie \u00e9nergie."}</span>
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
            <span className="nm-campaign-pill">{"Comment \u00e7a marche"}</span>
            <h2>{"Un parcours simple pour passer du profil au match, puis \u00e0 la discussion."}</h2>
            <p>{"Le produit existe d\u00e9j\u00e0. Cette page vend mieux l'entr\u00e9e dans le parcours sans toucher au flow interne."}</p>
          </div>

          <div className="nm-campaign-steps">
            {steps.map((step) => (
              <article key={step.title} className="nm-campaign-step" style={{ "--nm-image-position": step.position }}>
                <div className="nm-campaign-step__image">
                  <img src={step.image} alt={step.alt} loading="lazy" decoding="async" />
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
              alt={"Jeune femme ha\u00eftienne assise sereinement dans un caf\u00e9 lumineux"}
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="nm-campaign-split__copy">
            <span className="nm-campaign-pill">{"Confiance et s\u00e9curit\u00e9"}</span>
            <h2>{"Une premi\u00e8re impression plus s\u00e9rieuse qu'une page d'accueil g\u00e9n\u00e9raliste."}</h2>
            <p>
              {"Ici, le visiteur comprend tout de suite que NouMatch n'est pas juste une autre app. Les profils, la v\u00e9rification et la mod\u00e9ration sont visibles d\u00e8s l'entr\u00e9e."}
            </p>

            <div className="nm-campaign-trust">
              {trustItems.map((item) => (
                <article key={item.title} className="nm-campaign-trust__item">
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
            <span className="nm-campaign-pill">Preuve sociale</span>
            <h2>{"La communaut\u00e9 NouMatch grandit en Ha\u00efti. Des matchs et conversations commencent d\u00e9j\u00e0."}</h2>
          </div>

          <div className="nm-campaign-stories">
            {storyCards.map((card) => (
              <article key={card.title} className="nm-campaign-story" style={{ "--nm-image-position": card.position }}>
                <img src={card.image} alt={card.alt} loading="lazy" decoding="async" />
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
                alt={"Couple ha\u00eftien qui marche ensemble apr\u00e8s une belle premi\u00e8re rencontre"}
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="nm-campaign-final__copy">
              <span className="nm-campaign-pill">{"Pr\u00eat(e) \u00e0 rejoindre NouMatch"}</span>
              <h2>Rejoindre NouMatch gratuitement</h2>
              <p>
                {"Si le clic vient d'une pub Meta, la page doit donner envie de continuer sans h\u00e9sitation. C'est exactement le r\u00f4le de ce parcours."}
              </p>
              <button type="button" className="nm-campaign-btn nm-campaign-btn--primary" onClick={handlePrimaryCta}>
                {"Rejoindre NouMatch gratuitement"}
                <FaArrowRight />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
