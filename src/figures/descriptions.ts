import type { Archetype, Faction } from '../types';

export interface FigureInfo {
  label: string;
  /** Époque ou période d'activité (approximative). */
  era: string;
  /** 3 à 5 lignes : qui, équipement ou signes distinctifs, rôle historique. */
  text: string;
}

export const FACTION_INFO: Record<Faction, FigureInfo> = {
  romains: {
    label: 'Romains',
    era: 'VIIIe s. av. J.-C. – Ve s. apr. J.-C.',
    text: "Les légionnaires de Rome, citoyens-soldats puis professionnels à partir de la réforme de Marius. Ils portent le casque, la cotte de mailles ou la cuirasse segmentée, le grand bouclier rectangulaire (scutum), deux javelots (pila) et le glaive. Leur force tient à la discipline, à l'organisation en manipules puis en cohortes et à l'art de camper et de bâtir des routes. Ils ont fait d'une cité du Latium la maîtresse de la Méditerranée.",
  },
  latins: {
    label: 'Latins',
    era: 'VIIe – IVe s. av. J.-C.',
    text: "Les peuples du Latium, voisins et parents de Rome, réunis dans la Ligue latine. Leurs fantassins sont équipés comme les premiers Romains : casque de bronze, cuirasse simple, lance et bouclier rond. Alliés puis rivaux de Rome, ils se révoltent en 341-338 av. J.-C. Leur défaite met fin à la ligue, et leurs cités sont absorbées ou liées à Rome par des statuts inégaux.",
  },
  samnites: {
    label: 'Samnites',
    era: 'VIe – Ier s. av. J.-C.',
    text: "Montagnards de l'Apennin central, organisés en tribus fédérées. Ils combattent avec un grand bouclier ovale, des javelots, un casque à panache et parfois une cuirasse à trois disques de bronze. Ils tiennent tête à Rome pendant trois guerres (343-290 av. J.-C.), dont l'humiliation romaine des Fourches Caudines en 321. Ils soutiennent encore Pyrrhus et Hannibal, puis se révoltent pendant la guerre sociale.",
  },
  carthaginois: {
    label: 'Carthaginois',
    era: 'VIe – IIe s. av. J.-C.',
    text: "L'armée de Carthage combine des citoyens et surtout des mercenaires recrutés autour de la Méditerranée : Libyens, Ibères, Gaulois, cavaliers numides. Les chefs, comme Hamilcar ou Hannibal, tiennent ces troupes composites par leur prestige. Les éléphants de guerre marquent les esprits. La puissance carthaginoise repose aussi sur sa flotte et son commerce. Elle est vaincue par Rome en trois guerres puniques.",
  },
  gaulois: {
    label: 'Gaulois',
    era: 'Ve s. av. J.-C. – Ier s. apr. J.-C.',
    text: "Guerriers des peuples celtes de Gaule et d'Italie du Nord. Ils combattent avec une longue épée de fer, un grand bouclier ovale, des javelots et, pour l'élite, un casque et une cotte de mailles. Les chefs sont suivis de leurs clients. Ils saccagent Rome vers 390 av. J.-C., puis cèdent peu à peu devant les légions. La guerre des Gaules, menée par César de 58 à 51 av. J.-C., s'achève avec la reddition de Vercingétorix à Alésia.",
  },
  'grecs-macedoniens': {
    label: 'Grecs et Macédoniens',
    era: 'Ve – IIe s. av. J.-C.',
    text: "Les hoplites des cités grecques combattent en phalange, avec le casque, la cuirasse, le grand bouclier rond (hoplon) et la lance. Les Macédoniens de Philippe II et d'Alexandre y ajoutent la sarisse, pique de plus de cinq mètres, et une cavalerie d'élite. Ces armées vainquent la Perse et fondent des royaumes hellénistiques. La phalange est finalement battue par la légion romaine, à Cynoscéphales (197) puis à Pydna (168 av. J.-C.).",
  },
  germains: {
    label: 'Germains',
    era: 'Ier s. av. J.-C. – Ve s. apr. J.-C.',
    text: "Peuples de la Germanie, du Rhin à la Vistule : Chérusques, Suèves, Marcomans, Alamans, Francs, et d'autres. Le guerrier libre se bat avec une lance (framée), un bouclier de bois, parfois une épée. L'équipement défensif est rare, et seule une élite porte casque ou mailles. Ils infligent aux Romains le désastre de la forêt de Teutoburg en 9 apr. J.-C. Leurs migrations et leurs royaumes contribuent à la fin de l'Empire d'Occident.",
  },
  'parthes-perses': {
    label: 'Parthes et Perses',
    era: 'IIIe s. av. J.-C. – VIIe s. apr. J.-C.',
    text: "Les empires iraniens successifs : Parthes arsacides, puis Perses sassanides. Leur force est la cavalerie, avec des archers montés qui tirent en se repliant (le « trait du Parthe ») et des cavaliers cuirassés, les cataphractaires. Ils ont écrasé Crassus à Carrhes en 53 av. J.-C. Pendant des siècles, ils sont le seul grand rival de Rome et de Byzance à l'est, jusqu'à la conquête arabe.",
  },
  egyptiens: {
    label: 'Égyptiens',
    era: 'IIIe millénaire av. J.-C. – Ier s. av. J.-C.',
    text: "Les troupes du royaume pharaonique, puis de l'Égypte lagide. Les soldats portent la jupe de lin, un bouclier et une arme courte ; l'arc et le char de guerre dominent au Nouvel Empire. Sous les Ptolémées, l'armée suit le modèle macédonien avec des phalangites et des mercenaires. L'Égypte reste, par ses récoltes, le grenier du monde antique. La défaite d'Actium en 31 av. J.-C. la fait passer sous la domination romaine.",
  },
  daces: {
    label: 'Daces',
    era: 'Ier s. av. J.-C. – IIe s. apr. J.-C.',
    text: "Peuple thrace des Carpates et du Danube, uni sous Burebista puis Décébale. Les Daces se reconnaissent à leur bonnet phrygien, à leur grand bouclier ovale et surtout à la falx, une arme d'hast à lame courbe capable de briser un casque. Ils défient Domitien, puis Trajan les soumet lors de deux guerres (101-102 et 105-106). La Dacie devient province romaine, et la colonne Trajane à Rome en raconte la conquête.",
  },
  'goths-vandales': {
    label: 'Goths et Vandales',
    era: 'IIIe – VIe s. apr. J.-C.',
    text: "Peuples germaniques orientaux entrés dans l'Empire romain. Ils combattent à pied et à cheval avec lance, épée, bouclier, et pour les chefs une cotte de mailles et un casque. Les Wisigoths écrasent l'armée de Valens à Andrinople en 378 et pillent Rome en 410. Les Vandales gagnent l'Afrique du Nord et prennent Rome en 455. Les Ostrogoths de Théodoric règnent sur l'Italie. Ces royaumes sont ensuite repris par Byzance ou par d'autres peuples.",
  },
  arabes: {
    label: 'Arabes',
    era: 'VIIe – XIIIe s.',
    text: "Les armées des califats, nées de l'unification de l'Arabie autour de l'islam. Elles reposent sur des cavaliers et des fantassins légers mobiles, armés de sabres, de lances et d'arcs, avec cotte de mailles pour les chefs. En un siècle, elles conquièrent la Syrie, l'Égypte, la Perse, l'Afrique du Nord et la plus grande partie de l'Espagne. Elles sont arrêtées devant Constantinople en 718 et à Poitiers en 732.",
  },
  'turcs-seldjoukides': {
    label: 'Turcs seldjoukides',
    era: 'XIe – XIIIe s.',
    text: "Dynastie turque sunnite qui domine le Proche-Orient au XIe siècle. Leur arme maîtresse est l'archer à cheval, qui harcèle l'ennemi avant de le charger au sabre. Le sultan Alp Arslan bat l'empereur byzantin Romain Diogène à Manzikert en 1071, ce qui ouvre l'Anatolie aux Turcs. Cette poussée est l'une des causes de l'appel à la première croisade.",
  },
  'croises-latins': {
    label: 'Croisés latins',
    era: 'XIe – XIIIe s.',
    text: "Chevaliers et fantassins d'Europe occidentale partis en Terre sainte à l'appel de la papauté. Le chevalier est protégé d'un haubert de mailles, d'un heaume, d'un grand écu et d'une surcotte frappée d'une croix. Ils fondent les États latins du Levant, dont le royaume de Jérusalem (1099). Ils détournent la quatrième croisade vers Constantinople, prise en 1204. Saladin reprend Jérusalem en 1187, et les derniers bastions tombent avec Acre en 1291.",
  },
  ottomans: {
    label: 'Ottomans',
    era: 'XIVe – XIXe s.',
    text: "L'armée de la dynastie d'Osman combine la cavalerie des sipahis et des troupes régulières, dont les janissaires, fantassins d'élite recrutés par la devchirmé, porteurs d'armes à feu et coiffés du bonnet à pan. Les canons du sultan Mehmed II font tomber Constantinople en 1453. L'armée ottomane conquiert les Balkans, le Proche-Orient et l'Afrique du Nord, et assiège Vienne en 1529 et 1683.",
  },
  byzantins: {
    label: 'Byzantins',
    era: 'IVe – XVe s.',
    text: "Les soldats de l'Empire romain d'Orient, héritier direct de Rome. Les cavaliers cuirassés (cataphractes) et les fantassins en cotte de mailles ou lamelles, avec casque, lance, bouclier et arc, sont complétés par des mercenaires, dont la garde varangienne. Sous Justinien, Bélisaire reprend l'Afrique et l'Italie. Face aux Arabes, aux Slaves et aux Turcs, l'armée s'organise en thèmes. Constantinople tombe en 1453.",
  },
  francais: {
    label: 'Français',
    era: '1792 – 1815',
    text: "L'armée de la Révolution puis de l'Empire, issue de la levée en masse et de la conscription. Le fantassin porte l'habit bleu à parements, le shako ou le bicorne, le fusil à silex et la baïonnette. Les corps d'armée de la Grande Armée marchent vite et vivent sur le pays. Menée par Napoléon, elle domine l'Europe de la victoire d'Austerlitz (1805) jusqu'aux défaites de Russie (1812), Leipzig (1813) et Waterloo (1815).",
  },
  britanniques: {
    label: 'Britanniques',
    era: 'XVIIIe – XIXe s.',
    text: "L'infanterie britannique, reconnaissable à sa veste rouge, est de petite taille mais bien entraînée, très disciplinée et redoutable par son feu de mousquets en ligne de deux rangs. Wellington, commandant en Espagne puis à Waterloo, privilégie les positions défensives en pente inverse. Sur mer, la Royal Navy domine l'Atlantique depuis Trafalgar (1805) et finance les coalitions contre la France.",
  },
  autrichiens: {
    label: 'Autrichiens',
    era: 'XVIIIe – XIXe s.',
    text: "L'armée des Habsbourg, vêtue de l'habit blanc, est une armée multinationale où se côtoient Allemands, Hongrois, Tchèques, Croates et Italiens. Elle est nombreuse mais lente à manœuvrer et dépend de conseils de guerre. Elle subit de lourdes défaites à Ulm et à Austerlitz (1805) puis à Wagram (1809), avant de rejoindre la sixième coalition. Le prince de Schwarzenberg la conduit à Leipzig en 1813.",
  },
  prussiens: {
    label: 'Prussiens',
    era: 'XVIIIe – XIXe s.',
    text: "L'armée du royaume de Prusse, en habit bleu foncé, est célèbre depuis Frédéric II pour sa rigueur et sa cadence de tir. Écrasée à Iéna et Auerstedt en 1806, elle est profondément réformée par Scharnhorst et Gneisenau : service national, état-major, initiative des officiers. Elle revient en 1813 et décide de la campagne de Waterloo grâce à l'arrivée de Blücher.",
  },
  russes: {
    label: 'Russes',
    era: 'XVIIIe – XIXe s.',
    text: "L'infanterie russe, en uniforme vert foncé, est recrutée par une conscription de longue durée parmi les serfs. Elle est réputée endurante, solide à la baïonnette et appuyée par une forte artillerie, et la cavalerie cosaque harcèle les arrières. Battue à Austerlitz et à Friedland, elle résiste à Borodino (1812). La retraite de la Grande Armée, le froid et la guerre d'usure décident de la campagne de Russie.",
  },
  espagnols: {
    label: 'Espagnols',
    era: '1808 – 1814',
    text: "Les troupes régulières d'Espagne, souvent mal équipées et battues en bataille rangée, se joignent aux guérillas (le mot vient de cette guerre) menées par les paysans et le clergé après le soulèvement du 2 mai 1808 à Madrid. Elles remportent Bailén (1808), première capitulation d'une armée impériale. La guerre d'Espagne, soutenue par les Britanniques, immobilise des centaines de milliers de soldats français.",
  },
  portugais: {
    label: 'Portugais',
    era: '1807 – 1814',
    text: "L'armée portugaise est réorganisée en 1809 par le général britannique Beresford. Entraînée à l'anglaise, elle sert côte à côte avec les Britanniques sous Wellington, avec des miliciens (ordenanças) et des troupes régulières en uniforme brun et bleu. Les lignes de Torres Vedras (1810) arrêtent Masséna. Les Portugais participent à la reconquête de la péninsule jusqu'à la campagne de France.",
  },
  polonais: {
    label: 'Polonais',
    era: '1797 – 1815',
    text: "Les légions polonaises se forment en Italie dès 1797 aux côtés de la France, dans l'espoir de rétablir la Pologne, partagée entre Russie, Prusse et Autriche. Le duché de Varsovie (1807) leur donne un État allié de Napoléon. Les lanciers polonais, avec leur schapska (casque carré) et leur lance à flamme, sont une cavalerie d'élite. Le prince Poniatowski, maréchal d'Empire, meurt à Leipzig en 1813.",
  },
  chinois: {
    label: 'Chinois',
    era: 'IIe millénaire av. J.-C. – XIXe s.',
    text: "Les soldats des dynasties chinoises successives, depuis les chars de Shang et de Zhou jusqu'aux armées de conscrits des Qin et des Han. Armure de lamelles ou de cuir, arbalète, hallebarde, lance et épée droite (jian) caractérisent l'infanterie ; la cavalerie se développe face aux nomades. Sous les Song, la poudre fait son apparition. Les armées sont organisées par des généraux-lettrés et sont souvent engagées sur les marches du nord.",
  },
  xiongnu: {
    label: 'Xiongnu',
    era: 'IIIe s. av. J.-C. – Ier s. apr. J.-C.',
    text: "Confédération de nomades de la steppe, rivale des Han sous le chanyu Modun (v. 209 av. J.-C.). Leurs cavaliers armés de l'arc composite attaquent en essaims rapides, sans protection lourde. Ils extorquent des tributs à la Chine par les traités de « paix et parenté ». Les campagnes de l'empereur Wudi les repoussent vers l'ouest et leur empire éclate au Ier siècle.",
  },
  mongols: {
    label: 'Mongols',
    era: 'XIIIe – XIVe s.',
    text: "Les armées de Gengis Khan et de ses héritiers, organisées en unités décimales (dizaines, centaines, milliers, tumens). L'archer monté, vêtu d'un manteau de cuir et d'un bonnet de fourrure, dispose de plusieurs chevaux et d'un arc composite. Discipline, coordination, feintes et usage d'ingénieurs chinois et persans pour les sièges leur permettent de conquérir la Chine, la Perse et la Russie. L'empire s'étend de la Corée à la Hongrie.",
  },
  jurchens: {
    label: 'Jurchens',
    era: 'XIIe – XIIIe s.',
    text: "Peuple de Mandchourie, ancêtre des Mandchous. Sous Aguda, les Jurchens renversent les Khitans (1125) et fondent la dynastie Jin, puis prennent Kaifeng et le nord de la Chine aux Song (1127). Leur armée associe cavalerie lourde cuirassée, archers montés et unités organisées en meng-an et mouke. Les Jin sont détruits par les Mongols en 1234.",
  },
  mandchous: {
    label: 'Mandchous',
    era: 'XVIe – XIXe s.',
    text: "Descendants des Jurchens, organisés par Nurhaci en huit bannières (qi), unités militaires et sociales regroupant guerriers, familles et artisans. Ils sont de redoutables archers à cheval, portant le crâne rasé et la natte. Avec l'aide de généraux chinois ralliés, ils prennent Pékin en 1644 et établissent la dynastie Qing, qui règne sur la Chine jusqu'en 1912.",
  },
  japonais: {
    label: 'Japonais',
    era: 'XIIe – XIXe s.',
    text: "Les guerriers du Japon féodal, samouraïs au service d'un daimyo puis du shogun. Ils portent l'armure de lamelles laquées, le casque orné d'un cimier (kabuto) et le sabre (katana), complétés par l'arc, la lance et, dès 1543, le mousquet. Le shogunat de Kamakura résiste aux invasions mongoles en 1274 et 1281. Après la période des Provinces en guerre, Tokugawa Ieyasu unifie le pays en 1600.",
  },
  coreens: {
    label: 'Coréens',
    era: 'Ier – XIXe s.',
    text: "Soldats des royaumes de Koguryŏ, Silla, Koryŏ puis Chosŏn. L'arc court coréen et la cavalerie légère sont leurs armes traditionnelles, avec des armures de lamelles et de cuir. Les forteresses de montagne jouent un rôle clé. Les Coréens résistent aux Chinois Sui et Tang, aux Mongols, puis aux Japonais de Hideyoshi en 1592-1598, où l'amiral Yi Sun-sin remporte des victoires navales avec ses navires-tortues.",
  },
  tibetains: {
    label: 'Tibétains',
    era: 'VIIe – IXe s.',
    text: "Armée de l'empire du Tibet, fondé par Songtsen Gampo. Les soldats portent des cuirasses de plaques ou de cuir, des casques et des armes de mêlée, appuyés par une cavalerie rapide formée dans les hauts plateaux. L'empire dispute aux Tang l'Asie centrale et le bassin du Tarim, prend brièvement la capitale chinoise Chang'an en 763 et signe en 821-822 un traité de paix gravé sur pierre à Lhassa.",
  },
  vietnamiens: {
    label: 'Vietnamiens',
    era: 'Xe – XIXe s.',
    text: "Soldats du Dai Viet et des dynasties successives, qui ont repoussé à plusieurs reprises les armées chinoises et mongoles. Ils combattent en terrain de rivières, de forêts et de marais avec des lances, des arbalètes, des éléphants de guerre et des pieux plantés dans le lit des fleuves, comme à Bach Dang en 938 et 1288. Les Vietnamiens sont réputés pour leur guérilla et leur attachement à l'indépendance.",
  },
  'turcs-gokturks': {
    label: 'Turcs gökturks',
    era: 'VIe – VIIIe s.',
    text: "Premier empire turc de la steppe, fondé en 552 par Bumin (Tumen) et étendu de la Mandchourie à la mer Noire. Ses cavaliers sont armés de l'arc, du sabre et de la lance, avec cotte de mailles pour les chefs. Les inscriptions de l'Orkhon, en écriture runique turque, sont les plus anciens textes turcs connus. L'empire, divisé en deux qaghanats, est dominé par les Tang puis renaît brièvement avant de s'effondrer en 744.",
  },
  khitans: {
    label: 'Khitans',
    era: 'Xe – XIIe s.',
    text: "Peuple de la steppe orientale qui fonde la dynastie Liao (916-1125) et contrôle la Mandchourie, la Mongolie et seize préfectures du nord de la Chine. Cavaliers cuirassés et archers montés forment l'armée, dont la mobilité est entretenue par de grands troupeaux. Après le traité de Shanyuan (1005), les Song leur versent un tribut annuel. Les Jurchens renversent les Liao ; une partie des Khitans fuit vers l'ouest et fonde les Qara Khitai.",
  },
  ouighours: {
    label: 'Ouïghours',
    era: 'VIIIe – IXe s.',
    text: "Peuple turc de Mongolie qui succède aux Gökturks. Le khanat ouïghour (744-840) s'allie aux Tang et aide à réprimer la rébellion d'An Lushan. Ses cavaliers sont des archers expérimentés, protégés par une cuirasse de lamelles. Les Ouïghours adoptent le manichéisme, puis le bouddhisme, et se sédentarisent. Écrasé par les Kirghiz en 840, le peuple se replie vers le Turkestan oriental.",
  },
  tangoutes: {
    label: 'Tangoutes (Xia occidentaux)',
    era: '1038 – 1227',
    text: "Peuple tibéto-birman qui fonde l'empire des Xia occidentaux dans le Gansu et l'Ordos, entre les Song et les Liao puis les Jin. Ses soldats portent un casque à oreillettes et une armure de lamelles, et manient lance et arc ; la cavalerie lourde est réputée. Le royaume possède une écriture propre et un bouddhisme florissant. Gengis Khan le ravage en six campagnes et meurt pendant le siège final, en 1227.",
  },
  khwarezmiens: {
    label: 'Khwarezmiens',
    era: '1077 – 1231',
    text: "Dynastie turque musulmane qui domine l'Asie centrale et l'Iran oriental vers 1200, de Samarcande à Boukhara et Nichapour. Ses cavaliers portent turban sur casque pointu, cotte de mailles, sabre et bouclier rond. Le massacre d'une caravane mongole à Otrar (1218) déclenche l'invasion de Gengis Khan. Le chah Muhammad II fuit et meurt en 1220 ; son fils Djalal ad-Din résiste jusqu'en 1231.",
  },
  rus: {
    label: "Guerriers de la Rus'",
    era: 'XIIIe s.',
    text: "Fantassins et druzhina des princes de Kiev, Riazan, Vladimir ou Tchernigov. Ils portent un casque conique à nasal, une cotte de mailles, un bouclier en amande et manient la lance. Divisés entre principautés rivales, les Russes sont battus à la Kalka (1223), puis écrasés en 1237-1240 : Riazan, Vladimir et Kiev tombent. Les princes deviennent tributaires de la Horde d'or, le « joug tatar ».",
  },
  'chevaliers-europeens': {
    label: 'Chevaliers européens',
    era: 'XIIIe s.',
    text: "Cavaliers lourds d'Europe centrale, en heaume fermé, cotte de mailles, surcot armorié, écu et épée longue. En 1241, une armée polono-allemande est battue à Legnica, puis les Hongrois à la Sajó : les Mongols dévastent la Pologne et la Hongrie. Les chevaliers, faits pour le combat en ligne, subissent les feintes et les volées de flèches. Les Mongols se retirent en 1242, à la mort du grand khan Ögödei.",
  },
  mamelouks: {
    label: 'Mamelouks',
    era: '1250 – 1517',
    text: "Esclaves-soldats d'origine turque ou caucasienne devenus maîtres de l'Égypte et de la Syrie. Le cavalier mamelouk, casque à pointe et turban, caftan de couleur, tire à l'arc monté et charge au sabre après un long entraînement. Sous Qutuz et Baybars, ils arrêtent les Mongols à Aïn Djalout (1260), première grande défaite de l'armée mongole en campagne.",
  },
};

export const ARCHETYPE_INFO: Record<Archetype, FigureInfo> = {
  senateur: {
    label: 'Sénateur romain',
    era: 'République et Empire romains',
    text: "Le sénateur porte la toge blanche à bande de pourpre (laticlave) et les chaussures rouges des patriciens. Le Sénat, composé d'anciens magistrats, conseille les consuls, vote les crédits, dirige la politique étrangère et reçoit les ambassadeurs. Sous l'Empire, il perd l'essentiel de son pouvoir réel au profit du prince, mais garde un grand prestige.",
  },
  consul: {
    label: 'Consul romain',
    era: 'République romaine',
    text: "Les deux consuls sont élus pour un an et se partagent le pouvoir suprême : ils convoquent le Sénat, président les assemblées et commandent les légions. Ils sont précédés de licteurs portant les faisceaux, symbole de leur autorité. Ils portent la toge bordée de pourpre ou, au combat, la cuirasse et le manteau rouge du général (paludamentum).",
  },
  empereur: {
    label: 'Empereur romain',
    era: 'Ier – Ve s. apr. J.-C.',
    text: "Depuis Auguste, le prince cumule les pouvoirs de magistrat, de chef des armées (imperator) et de grand pontife. Il porte la toge ou le manteau pourpre, une couronne de laurier puis un diadème. Il distribue le blé, finance les jeux, nomme les gouverneurs et garantit la paix. L'Empire d'Occident disparaît officiellement en 476.",
  },
  'empereur-byzantin': {
    label: 'Empereur byzantin',
    era: 'IVe – XVe s.',
    text: "Le basileus règne depuis Constantinople comme lieutenant du Christ sur terre. Il porte le diadème perlé et la chlamyde pourpre brodée d'or, et il siège sous les mosaïques de Sainte-Sophie. Chef de l'armée, de l'administration et gardien de l'orthodoxie, il est entouré d'un cérémonial strict. Justinien, Basile II ou Alexis Ier Comnène en sont les figures les plus célèbres.",
  },
  roi: {
    label: 'Roi',
    era: 'Moyen Âge',
    text: "Le roi médiéval, sacré par l'Église, règne avec la couronne, le sceptre et le manteau doublé d'hermine. Il est à la fois chef de guerre, juge suprême et seigneur de ses vassaux, auxquels il demande conseil et service militaire. Son pouvoir réel dépend de la puissance de son domaine et de sa capacité à imposer son autorité aux grands.",
  },
  pape: {
    label: 'Pape',
    era: 'Antiquité tardive – Époque moderne',
    text: "L'évêque de Rome, chef de l'Église catholique, se reconnaît à la tiare (puis à la mitre blanche), à la chape et au pallium. Il couronne les empereurs, arbitre les conflits entre princes et appelle aux croisades. Gouvernant aussi les États pontificaux, il est un acteur politique majeur, de Léon Ier face à Attila à Innocent III, qui domine la chrétienté.",
  },
  'chef-barbare': {
    label: 'Chef barbare',
    era: 'IIIe – VIe s.',
    text: "Les chefs de guerre des peuples germaniques et des steppes sont élus ou acclamés par leurs guerriers. Cheveux longs, fourrures, torque d'or et armes ornées marquent leur rang. Certains, comme Alaric, Attila ou Clovis, obtiennent des titres romains, fondent des royaumes ou bouleversent l'Empire par leurs raids. Ils sont à la fois ennemis, alliés et héritiers de Rome.",
  },
  calife: {
    label: 'Calife',
    era: 'VIIe – XIIIe s.',
    text: "Le calife (« successeur ») dirige la communauté musulmane après Mahomet. Vêtu d'un long manteau et coiffé d'un turban, il réunit autorité religieuse et politique. Les Omeyyades règnent depuis Damas, les Abbassides depuis Bagdad, fondée en 762. Leur cour attire savants, poètes et traducteurs ; Bagdad tombe devant les Mongols en 1258.",
  },
  sultan: {
    label: 'Sultan',
    era: 'XIe – XIXe s.',
    text: "Titre de pouvoir porté par les souverains musulmans : Seldjoukides, Mamelouks, Ottomans. Le sultan, vêtu d'une longue robe et coiffé d'un turban à aigrette, tient l'armée et l'administration, souvent au nom du calife. Mehmed II conquiert Constantinople, Soliman le Magnifique porte l'Empire ottoman à son apogée au XVIe siècle.",
  },
  doge: {
    label: 'Doge de Venise',
    era: 'VIIIe – XVIIIe s.',
    text: "Élu à vie par le patriciat vénitien, le doge porte le corno, bonnet de forme particulière, et un manteau de brocart. Son pouvoir est étroitement encadré par les conseils de la République, afin d'éviter toute tyrannie. Il symbolise une puissance maritime et marchande, dont l'épisode majeur est le détournement de la quatrième croisade par Enrico Dandolo, en 1204.",
  },
  'empereur-napoleon': {
    label: 'Napoléon Ier',
    era: '1804 – 1815',
    text: "Général de la Révolution, Premier consul puis empereur des Français, sacré à Notre-Dame le 2 décembre 1804. On le reconnaît à son bicorne porté en bataille, à sa redingote grise ou à son habit de colonel des chasseurs à cheval de la Garde. Il réorganise l'État (Code civil, préfectures, Banque de France) et domine l'Europe par ses victoires, jusqu'à l'exil à Sainte-Hélène après Waterloo.",
  },
  general: {
    label: 'Général',
    era: 'XVIIIe – XIXe s.',
    text: "Officier supérieur en grand uniforme brodé, portant le bicorne à plumes, l'écharpe et le sabre. Les généraux et maréchaux de Napoléon sont issus d'origines très diverses, du fils d'aubergiste au noble rallié. Ils commandent les corps d'armée, mènent les charges ou la défense et appliquent la manœuvre décidée par l'Empereur. Beaucoup deviennent ducs et princes de l'Empire.",
  },
  'roi-moderne': {
    label: 'Roi moderne',
    era: 'XVIIIe – XIXe s.',
    text: "Souverain de l'Europe des monarchies : habit d'apparat, ordres et décorations, manteau d'hermine. À l'époque napoléonienne, les rois sont tantôt des princes d'ancienne dynastie, tantôt des membres de la famille impériale placés à la tête d'États satellites, comme Joseph en Espagne ou Murat à Naples. Beaucoup perdent leur trône en 1814-1815.",
  },
  tsar: {
    label: 'Tsar',
    era: 'XVIe – XXe s.',
    text: "Titre de l'empereur de Russie, issu du latin « César ». Le tsar porte la couronne impériale, la pelisse fourrée et les décorations des ordres. Alexandre Ier, vainqueur de Napoléon en 1812, est un souverain à la fois réformateur et autocrate. Il joue un rôle central au congrès de Vienne et fonde la Sainte-Alliance.",
  },
  diplomate: {
    label: 'Diplomate',
    era: 'XVIIIe – XIXe s.',
    text: "Ministres et ambassadeurs en habit sombre brodé ou en frac, portant parfois un portefeuille de dépêches. Talleyrand, Metternich, Castlereagh ou Nesselrode négocient les traités et alliances qui font et défont les coalitions. Au congrès de Vienne (1814-1815), ils redessinent la carte de l'Europe selon l'équilibre des puissances.",
  },
  amiral: {
    label: 'Amiral',
    era: 'XVIIIe – XIXe s.',
    text: "Officier supérieur de marine, en habit bleu foncé à galons dorés et bicorne. L'amiral dirige une escadre ou une flotte et en assure la tactique et la discipline. Nelson, à Trafalgar le 21 octobre 1805, détruit la flotte franco-espagnole et garantit la suprématie britannique sur les mers. Il meurt au combat pendant la bataille.",
  },
  'empereur-chinois': {
    label: 'Empereur de Chine',
    era: 'IIIe s. av. J.-C. – 1912',
    text: "Le « Fils du Ciel » règne en vertu du mandat céleste, qu'il perd en cas de désordre. Il porte la robe jaune brodée de dragons et le bonnet à pendeloques de perles. Il préside les rites, le calendrier et l'administration, appuyée sur des fonctionnaires lettrés. La fonction naît avec Qin Shi Huangdi en 221 av. J.-C. et prend fin avec Puyi, en 1912.",
  },
  sage: {
    label: 'Sage',
    era: 'Toutes époques',
    text: "Philosophe, savant ou conseiller réputé pour sa connaissance : Confucius en Chine, Aristote en Grèce, Ibn Sina en Perse. Longue barbe, robe sobre et livre à la main, il enseigne, conseille les souverains et transmet le savoir d'une génération à l'autre. Dans l'Atlas, c'est aussi le guide qui répond à vos questions.",
  },
  'lettre-mandarin': {
    label: 'Lettré mandarin',
    era: 'Han – Qing',
    text: "Fonctionnaire formé par l'étude des classiques confucéens et recruté par concours (examens impériaux, systématisés sous les Sui et les Tang). Il porte une longue robe et un bonnet de gaze, tient un pinceau ou une tablette. Ces lettrés administrent les provinces, collectent l'impôt, rédigent les chroniques et conseillent l'empereur, souvent en tension avec les eunuques et les militaires.",
  },
  'general-chinois': {
    label: 'Général chinois',
    era: 'Zhou – Qing',
    text: "Chef militaire en armure de lamelles ou de plaques, casque à panache, parfois cape et étendard. Des stratèges comme Sun Zi, Han Xin ou Yue Fei ont nourri la littérature militaire. Les généraux défendent la frontière nord, soumettent des rebelles et fondent même des dynasties, mais le pouvoir civil se méfie de leur influence.",
  },
  khan: {
    label: 'Khan',
    era: 'Steppes, VIe – XVIe s.',
    text: "Chef suprême des peuples de la steppe, élu par un conseil (quriltai) ou acclamé par ses guerriers. Le khan porte la tunique doublée de fourrure, le bonnet de feutre ou de peau et l'arc à la ceinture. Gengis Khan unifie les Mongols en 1206, et ses descendants, dont Kubilai, règnent sur le plus vaste empire terrestre de l'histoire.",
  },
  shogun: {
    label: 'Shogun',
    era: '1185 – 1868',
    text: "Chef militaire héréditaire qui gouverne le Japon au nom de l'empereur. Il porte l'armure de samouraï, le casque à cimier et deux sabres, ou la tenue officielle de cour. Minamoto no Yoritomo fonde le premier shogunat à Kamakura. Plus tard, Ashikaga puis Tokugawa dirigent le pays, jusqu'à la restauration de Meiji en 1868.",
  },
  'moine-bouddhiste': {
    label: 'Moine bouddhiste',
    era: 'Ier – XIXe s.',
    text: "Le moine, au crâne rasé et à la robe safran ou grise, tient un bâton de pèlerin ou un chapelet. Venu d'Inde, le bouddhisme se répand par les routes de la soie en Chine, en Corée, au Japon et au Tibet. Des moines comme Xuanzang, parti en Inde chercher des textes sacrés, ou Jianzhen, passé au Japon, jouent un rôle de passeurs de cultures et de conseillers des souverains.",
  },
  imperatrice: {
    label: 'Impératrice',
    era: 'Han – Qing',
    text: "Épouse ou mère d'empereur, coiffée d'un diadème à pendeloques et vêtue de soie brodée. Certaines exercent la régence ou le pouvoir : l'impératrice Lü sous les Han, Wu Zetian, seule femme à avoir régné en son nom sur la Chine (690-705), ou Cixi à la fin des Qing. Elles s'appuient sur la cour, l'administration et leur famille.",
  },  'general-mongol': {
    label: 'Général mongol',
    era: '1206 – 1368',
    text: "Commandant d'un tumen (dix mille cavaliers), en armure lamellaire de cuir ou de fer, casque à pointe et plumet, bâton de commandement. Des chefs comme Subötai, Djebé ou Muqali mènent des campagnes coordonnées sur des milliers de kilomètres, selon des plans arrêtés au quriltai. Ils appliquent la feinte, l'encerclement et un renseignement très étendu.",
  },
  khatoun: {
    label: 'Khatoun',
    era: '1206 – 1368',
    text: "Reine ou princesse mongole, coiffée de la haute boqta, vêtue d'une robe brodée et d'un ample manteau. Les khatouns gèrent les campements, les troupeaux et parfois la régence : Töregene gouverne l'empire (1241-1246), Sorgaqtani Beki éduque ses fils, Möngke, Kubilai, Hülegü et Ariq Böke. Doquz Khatoun, chrétienne nestorienne, protège les églises de l'Ilkhanat.",
  },
};
