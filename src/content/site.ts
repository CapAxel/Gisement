/**
 * TOUS LES TEXTES DU SITE — fichier unique à modifier.
 *
 * Conventions d'écriture (appliquées automatiquement à l'affichage) :
 * - écrire des espaces normales : les espaces insécables françaises
 *   (avant « : ; ! ? », dans « … », entre un nombre et €, %, m²) sont ajoutées au rendu ;
 * - *mot* met un mot en italique (titres et chapeaux) ;
 * - les informations encore inconnues restent entre crochets : [E-mail], [SIRET]…
 *   (liste complète dans le README).
 */

export const site = {
  name: 'Gisement',
  baseline: "Bureau d'études en urbanisme",
  territory: '[Votre territoire]',

  contact: {
    email: '[E-mail]',
    phone: '[Téléphone]',
    address: '[Adresse postale]',
  },

  legal: {
    raisonSociale: '[Raison sociale]',
    formeJuridique: '[Forme juridique et capital social]',
    siege: '[Adresse du siège social]',
    siret: '[SIRET]',
    rcs: '[RCS / RM]',
    tva: '[N° de TVA intracommunautaire]',
    directeurPublication: '[Directeur ou directrice de la publication]',
    hebergeur: "[Hébergeur : nom, adresse et téléphone]",
    assureur: '[Assureur]',
    police: '[N° de police RC professionnelle]',
    miseAJour: '[Date de mise à jour]',
  },

  meta: {
    title: 'Gisement — Études de faisabilité réglementaire pour le foncier',
    description:
      "Bureau d'études en urbanisme : études de faisabilité réglementaire pour promoteurs, lotisseurs, aménageurs, marchands de biens et investisseurs. Savoir ce qu'un terrain permet vraiment, avant de signer.",
    ogImageAlt:
      "Axonométrie d'une parcelle et de son enveloppe constructible, dessinée à l'encre sur papier.",
  },

  nav: [
    { label: 'Pour qui', href: '#pour-qui' },
    { label: 'Offres', href: '#offres' },
    { label: 'Cas', href: '#cas' },
    { label: 'Méthode', href: '#methode' },
    { label: 'Contact', href: '#contact' },
  ],

  headerCta: { label: 'Fiche express', meta: 'dès 300 € HT', href: '#contact' },

  // ---------------------------------------------------------------- PL 01 — Hero
  hero: {
    sheet: { number: '01', title: 'Lecture réglementaire' },
    overline: 'Études de faisabilité réglementaire',
    title: "Savoir ce qu'un terrain permet *vraiment*, avant de signer.",
    audience: {
      label: 'Pour les opérateurs du foncier',
      items: ['Promoteurs', 'Lotisseurs', 'Aménageurs', 'Marchands de biens', 'Investisseurs'],
    },
    lead:
      "Règlement, OAP, servitudes, risques, contexte communal : nous lisons tout ce qui s'applique à votre terrain et chiffrons ce qu'il permet réellement — capacité constructible, prix foncier soutenable, recommandation.",
    primaryCta: {
      label: 'Commander une fiche express',
      meta: 'dès 300 € HT · 48 h ouvrées',
      href: '#contact',
    },
    secondaryCta: { label: 'Voir le cas illustratif', href: '#cas' },

    // Planche annotée : chaque note explique une contrainte visible sur le dessin.
    // Parcelle, règles et valeurs fictives. L'ordre et les numéros sont calculés
    // d'après la position des repères sur le dessin (voir src/lib/plate.ts).
    plate: {
      title: 'Lecture réglementaire d’une parcelle',
      subtitle: '21 contraintes qui dessinent un projet',
      stamp: 'Planche illustrative · parcelle, règles et valeurs fictives',
      drawingTitle:
        'Axonométrie d’un immeuble de 30 logements sur une parcelle fictive de 3 000 m², annotée des contraintes réglementaires qui l’ont façonné.',
      labels: {
        street: 'Voie publique',
        zoneU: 'UBa',
        zoneN: 'N',
        networks: 'AEP · EU · ÉLEC',
      },
      notes: {
        zonage: {
          title: 'Zonage',
          text: 'Zone UBa, et zone naturelle N au-delà de la limite arrière. Chaque sous-secteur a ses propres règles.',
        },
        destination: {
          title: 'Destination',
          text: 'Logement autorisé, commerce admis en rez-de-chaussée sur rue : le programme mixte est possible.',
        },
        hauteur: {
          title: 'Hauteur maximale',
          text: '12 m à l’acrotère, 15 m pour l’attique en retrait : R+3 et attique, pas un niveau de plus.',
        },
        emprise: {
          title: 'Emprise au sol',
          text: '635 m² bâtis, soit 21 % du terrain pour un maximum autorisé de 30 %.',
        },
        implantation: {
          title: 'Implantation sur rue',
          text: 'Recul de 5 m compté depuis l’alignement futur : tout le plan masse se cale sur cette ligne.',
        },
        limites: {
          title: 'Limites séparatives',
          text: 'Prospect L ≥ H/2 : 6 m de retrait pour 12 m de façade. Plus haut, il faudrait s’éloigner.',
        },
        stationnement: {
          title: 'Stationnement',
          text: '1 place par logement, 0,5 en social : 26 places, dont 20 en sous-sol. Local vélos de 45 m².',
        },
        acces: {
          title: 'Accès et voirie',
          text: 'Un accès unique de 5 m, avec visibilité dégagée et passage des secours : il organise toute la parcelle.',
        },
        aspect: {
          title: 'Aspect architectural',
          text: 'Attique en retrait de 2 m, toiture-terrasse, enduit et bois. Clôture : muret de 0,60 m et grille.',
        },
        espacesVerts: {
          title: 'Espaces verts',
          text: '30 % de pleine terre, soit 900 m², et 1 arbre pour 100 m² : 9 arbres à planter.',
        },
        biotope: {
          title: 'Coefficient de biotope',
          text: 'Coefficient de 0,4 atteint par la toiture végétalisée de l’aile et les places en dalles engazonnées.',
        },
        eauxPluviales: {
          title: 'Eaux pluviales',
          text: 'Infiltration à la parcelle : une noue longe l’accès, le débit de fuite vers le réseau est limité.',
        },
        reseaux: {
          title: 'Réseaux',
          text: 'Eau potable, eaux usées et électricité sous la voie : raccordements directs, sans extension à financer.',
        },
        oap: {
          title: 'OAP',
          text: 'L’OAP du secteur impose une liaison piétonne vers le quartier nord, le long de la limite ouest.',
        },
        mixite: {
          title: 'Mixité sociale',
          text: '25 % de logements sociaux au-delà de 12 logements : 8 sur 30, regroupés dans la cage ouest.',
        },
        emplacementReserve: {
          title: 'Emplacement réservé',
          text: 'Bande de 2 m réservée à l’élargissement de la voie : à céder, et à déduire de la surface utile.',
        },
        monument: {
          title: 'Abords de monument historique',
          text: 'Parcelle dans les abords d’une église classée : l’avis de l’Architecte des Bâtiments de France s’impose.',
        },
        risques: {
          title: 'Risque inondation',
          text: 'Zone bleue du plan de prévention : premier plancher 0,60 m au-dessus de la cote de référence.',
        },
        archeologie: {
          title: 'Archéologie préventive',
          text: 'Zone de présomption de prescription : un diagnostic peut être exigé. Le délai se prévoit dès l’offre.',
        },
        bruit: {
          title: 'Bruit',
          text: 'Voie classée au titre du bruit : isolation acoustique renforcée des façades sur rue.',
        },
        patrimoine: {
          title: 'Arbre protégé',
          text: 'Chêne repéré au PLU comme élément de paysage : conservé, avec un périmètre de protection du houppier.',
        },
      },
    },
  },

  // ---------------------------------------------------------------- PL 02 — Pour qui
  audiences: {
    sheet: { number: '02', title: 'Destinataires' },
    title: "Pour ceux qui engagent de l'argent *sur du foncier*.",
    items: [
      {
        name: 'Promoteurs régionaux',
        text: 'Qualifier un terrain avant de faire une offre : capacité réaliste, points de blocage, prix soutenable.',
      },
      {
        name: 'Lotisseurs et aménageurs',
        text: 'Vérifier ce que le règlement et les OAP autorisent réellement : découpage, accès, voirie, prescriptions.',
      },
      {
        name: 'Marchands de biens',
        text: "Mesurer le potentiel d'un bien — division, extension, changement de destination — avant l'acquisition.",
      },
      {
        name: 'Investisseurs et propriétaires fonciers',
        text: "Connaître la valeur constructible d'un terrain pour arbitrer, vendre ou négocier au juste prix.",
      },
    ],
    secondary: {
      name: 'Architectes',
      text: 'Une lecture réglementaire en amont de vos esquisses : gabarits, reculs, servitudes et points de vigilance, avant de dessiner.',
    },
  },

  // ---------------------------------------------------------------- PL 03 — Offres
  offers: {
    sheet: { number: '03', title: 'Offres' },
    title: 'Trois profondeurs de lecture, *un avis clair* à chaque fois.',
    note: 'Tarifs HT indicatifs, ajustés selon la complexité du terrain.',
    items: [
      {
        id: 'fiche-express',
        name: 'Fiche express',
        price: 'dès 300 €',
        delay: '48 h ouvrées',
        featured: false,
        summary: 'Le premier filtre, avant de passer du temps sur un terrain.',
        includes: [
          'Zonage et règles clés du PLU',
          'Servitudes et risques',
          'Verdict : favorable, sous conditions ou défavorable',
        ],
        cta: 'Commander une fiche express',
      },
      {
        id: 'etude-faisabilite',
        name: 'Étude de faisabilité',
        price: 'dès 2 500 €',
        delay: '7 jours ouvrés',
        featured: true,
        badge: "L'étude de référence",
        summary: 'Tout ce qu’il faut pour faire une offre au bon prix.',
        includes: [
          'Analyse complète du règlement, des OAP et des annexes',
          'Capacité constructible réaliste',
          'Contexte local : révision en cours, avis ABF, position de la commune',
          'Prix foncier soutenable et recommandation',
        ],
        cta: 'Demander une étude de faisabilité',
      },
      {
        id: 'etude-approfondie',
        name: 'Étude approfondie',
        price: 'dès 5 000 €',
        delay: '2 à 3 semaines',
        featured: false,
        summary: "Pour sécuriser une opération jusqu'au dépôt du permis.",
        includes: [
          'Scénarios de programme',
          'Pré-bilan financier',
          'Stratégie et calendrier de dépôt',
          'Accompagnement en mairie',
        ],
        cta: 'Parler de votre opération',
      },
    ],
    custom: {
      title: 'Sur devis',
      items: [
        'Forfaits multi-terrains',
        'Veille foncière sur abonnement',
        'Prospection rémunérée au succès',
      ],
    },
  },

  // ---------------------------------------------------------------- PL 04 — Cas
  // Cas construit pour illustrer la méthode. Les montants intermédiaires
  // répartissent l'écart final (250 000 €) entre les contraintes, à titre d'illustration.
  case: {
    sheet: { number: '04', title: 'Cas illustratif' },
    label: 'Cas illustratif — ne décrit pas une opération réelle',
    title: 'Un terrain à 900 000 €. *Ce que le PLU en dit vraiment.*',
    start: {
      surface: '3 000 m²',
      zone: 'Zone UB',
      programme: '30 logements espérés',
      prix: '900 000 € demandés',
    },
    steps: [
      {
        id: 'oap',
        tag: 'OAP',
        title: 'Une OAP impose une voie traversante',
        text: "L'orientation d'aménagement et de programmation prévoit une voie qui traverse la parcelle : une bande de terrain change de vocation.",
        logements: 30,
        prix: 830000,
      },
      {
        id: 'monument',
        tag: 'Patrimoine',
        title: "Le périmètre d'un monument historique",
        text: "La parcelle est dans les abords d'un monument historique : l'avis de l'Architecte des Bâtiments de France est obligatoire.",
        logements: 30,
        prix: 800000,
      },
      {
        id: 'social',
        tag: 'Mixité sociale',
        title: '25 % de logements sociaux au-delà de 12 logements',
        text: 'Le règlement impose une part de logements locatifs sociaux, cédés à un bailleur à prix encadré.',
        logements: 30,
        prix: 740000,
      },
      {
        id: 'stationnement',
        tag: 'Stationnement',
        title: 'Le stationnement en surface plafonne le programme',
        text: "Les places exigées, réalisées en surface, consomment l'emprise : l'opération tient à 24 logements.",
        logements: 24,
        prix: 650000,
      },
      {
        id: 'plui',
        tag: 'Révision',
        title: 'Le PLUi en révision abaisse les hauteurs',
        text: "Le futur PLUi réduit les hauteurs. D'ici son approbation, un permis peut se voir opposer un sursis à statuer.",
        logements: 24,
        prix: 650000,
      },
    ],
    result: {
      logements: 24,
      prix: 650000,
      ecart: 250000,
      title: '24 logements réalistes. Un prix soutenable d’environ 650 000 €.',
      ecartLabel: 'Écart avec le prix demandé',
      recommendationLabel: 'Recommandation',
      recommendation: "Négocier le prix, et déposer le permis avant l'approbation du PLUi.",
    },
    counters: { logements: 'Logements', prix: 'Prix soutenable' },
  },

  // ---------------------------------------------------------------- PL 05 — Méthode
  method: {
    sheet: { number: '05', title: 'Méthode' },
    title: 'Quatre étapes, *une recommandation chiffrée*.',
    steps: [
      {
        title: 'Transmission du terrain',
        text: "Adresse ou référence cadastrale, prix demandé, programme envisagé : quelques informations suffisent pour lancer l'étude.",
      },
      {
        title: 'Lecture réglementaire',
        text: "Règlement, OAP, annexes, servitudes, risques : tout ce qui s'applique à la parcelle, lu et croisé.",
      },
      {
        title: 'Contexte local',
        text: "Révision en cours, avis de l'ABF, position de la commune : ce que les documents ne disent pas encore.",
      },
      {
        title: 'Recommandation chiffrée',
        text: 'Capacité réaliste, prix foncier soutenable, stratégie de dépôt : un avis argumenté, prêt à servir.',
      },
    ],
  },

  // ---------------------------------------------------------------- PL 06 — Externaliser
  why: {
    sheet: { number: '06', title: 'Externaliser' },
    title: 'Pourquoi confier cette lecture *à un bureau d’études*.',
    items: [
      {
        title: "Payer à l'étude, pas un salaire",
        text: 'Une expertise mobilisée terrain par terrain, sans charge fixe ni recrutement.',
      },
      {
        title: 'Une connaissance fine du territoire',
        text: 'Documents en vigueur, procédures en cours, pratiques locales : une lecture ancrée dans [Votre territoire].',
      },
      {
        title: 'Un regard tiers qui pèse',
        text: 'Face au vendeur ou à la banque, une étude indépendante étaye votre position.',
      },
    ],
    independence: {
      title: "Engagement d'indépendance",
      text: "Gisement n'intervient jamais pour un opérateur privé sur une commune pour laquelle il élabore ou modifie un document d'urbanisme.",
    },
  },

  // ---------------------------------------------------------------- PL 07 — Contact
  contactSection: {
    sheet: { number: '07', title: 'Commande' },
    title: 'Transmettez-nous *votre terrain*.',
    intro: 'Une adresse ou une référence cadastrale suffit pour commencer.',
    fields: {
      nom: 'Nom',
      societe: 'Société',
      email: 'E-mail',
      telephone: 'Téléphone',
      terrain: 'Adresse ou référence cadastrale',
      terrainHint: 'Ex. : 12 rue des Tilleuls, 00000 Commune — ou section AB n° 123',
      typeEtude: "Type d'étude",
      programme: 'Programme envisagé',
      programmeHint: 'Nombre de logements ou de lots, surfaces, destination, calendrier…',
      required: 'obligatoire',
    },
    studyTypes: [
      'Fiche express',
      'Étude de faisabilité',
      'Étude approfondie',
      'Sur devis : multi-terrains, veille, prospection',
      'Je ne sais pas encore',
    ],
    submit: 'Envoyer la demande',
    rgpd:
      "Vos informations servent uniquement à traiter votre demande. Elles ne sont ni cédées, ni utilisées à des fins de prospection. Vous pouvez exercer vos droits d'accès, de rectification et d'effacement à tout moment.",
    rgpdLink: 'Politique de confidentialité',
    success: 'Merci, votre demande est bien partie. Nous revenons vers vous avec une proposition.',
    error: "L'envoi n'a pas abouti. Réessayez, ou écrivez-nous directement.",
    notConfigured: "L'envoi en ligne n'est pas encore activé : écrivez-nous directement.",
  },

  // ---------------------------------------------------------------- Pied de page
  footer: {
    tagline: "Savoir ce qu'un terrain permet vraiment, avant de signer.",
    legal: 'Mentions légales',
    privacy: 'Confidentialité',
  },
} as const;

export type Site = typeof site;
