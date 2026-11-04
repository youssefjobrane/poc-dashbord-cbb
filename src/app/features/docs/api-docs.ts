/**
 * Human-readable contract of the dashboard API and of the charts that consume it.
 * api-docs.spec.ts checks every documented field against the real mock API output, so this file cannot drift.
 */

export interface FieldDoc {
  name: string;
  type: string;
  desc: string;
  /** fields of the nested object / of each array item / of each map value */
  children?: FieldDoc[];
  /** `children` describe the values of a key → value map (keys listed in `type`) */
  map?: boolean;
}

export interface ParamDoc {
  name: string;
  type: string;
  required: boolean;
  desc: string;
}

export interface EndpointDoc {
  id: string;
  path: string;
  summary: string;
  params: ParamDoc[];
  response: FieldDoc[];
  usedBy: string[];
  /** path used by the "try it" button (documents/:id needs a concrete id) */
  tryPath?: string;
}

export interface ChartDoc {
  id: string;
  name: string;
  page: 'Pilotage' | 'Métiers & thématiques';
  component: string;
  rendering: string;
  endpoint: string;
  fields: string;
  interactions: string;
  states: string;
  powerBi: string;
}

const P = {
  month: { name: 'month', type: 'string YYYY-MM', required: false, desc: 'Mois analysé. Défaut : mois de la date des données (période = 1er du mois → date des données).' },
  dept: { name: 'dept', type: 'integer', required: false, desc: 'DeptID (1 à 8). Absent = tous départements.' },
  granularity: { name: 'granularity', type: "'day' | 'week' | 'month'", required: false, desc: 'Découpage de la courbe. Défaut : week (semaines commençant le lundi).' },
  metric: {
    name: 'metric',
    type: 'KpiId',
    required: false,
    desc: "Mesure tracée : activeUsers (défaut), usageRate, questions, questionsPerUser, cost, costPerQuestion, responseTime, satisfaction.",
  },
} satisfies Record<string, ParamDoc>;

const num = (name: string, desc: string, nullable = false): FieldDoc => ({ name, type: nullable ? 'number | null' : 'number', desc });
const str = (name: string, desc: string): FieldDoc => ({ name, type: 'string', desc });
const compared = (name: string, desc: string): FieldDoc => ({
  name,
  type: 'Compared',
  desc,
  children: [num('value', 'Valeur sur la période sélectionnée', true), num('previous', 'Même nombre de jours un mois plus tôt (M-1)', true)],
});

const deptMeasures: FieldDoc[] = [
  num('headcount', 'Effectif du département'),
  num('activeUsers', 'Utilisateurs distincts ayant posé au moins une question'),
  num('usageRate', 'activeUsers / headcount (0–1)'),
  num('questions', 'Nombre de questions'),
  num('questionsPerUser', 'questions / activeUsers', true),
  num('cost', 'Coût LLM en TND'),
  num('costShare', 'Part du coût total du mois (0–1)'),
  num('satisfaction', 'Votes 👍 / votes exprimés (0–1)', true),
];

export const ENVELOPE: FieldDoc[] = [
  { name: 'data', type: 'T', desc: "Contenu propre à l'endpoint (voir chaque section)" },
  {
    name: 'meta',
    type: 'object',
    desc: 'Métadonnées de la réponse',
    children: [str('endpoint', 'Méthode et chemin appelés'), num('latencyMs', 'Latence simulée (1 000 à 3 000 ms)'), str('generatedAt', 'Horodatage ISO 8601 de la réponse')],
  },
];

export const ENDPOINTS: EndpointDoc[] = [
  {
    id: 'overview',
    path: '/api/dashboard/overview',
    summary: 'Contexte global : date des données, mois disponibles, liste des départements, période analysée et période de comparaison.',
    params: [P.month],
    usedBy: ['Barre de filtres', 'Libellé de période', 'Pied de page « Données au … »'],
    response: [
      str('dataAsOf', 'Date des données (YYYY-MM-DD)'),
      { name: 'months', type: 'array', desc: 'Mois sélectionnables', children: [str('key', 'YYYY-MM'), str('label', 'Ex. « Octobre 2026 (en cours) »')] },
      str('defaultMonth', 'Mois par défaut (YYYY-MM)'),
      { name: 'departments', type: 'array', desc: 'Départements, dans l’ordre d’affichage', children: [num('id', 'DeptID'), str('name', 'Libellé complet'), str('short', 'Libellé court')] },
      {
        name: 'period',
        type: 'object',
        desc: 'Bornes incluses (YYYY-MM-DD)',
        children: [str('start', 'Début de période'), str('end', 'Fin de période (≤ date des données)'), str('previousStart', 'Début M-1'), str('previousEnd', 'Fin M-1 (même nombre de jours)')],
      },
    ],
  },
  {
    id: 'kpis',
    path: '/api/dashboard/kpis',
    summary: 'Les 8 indicateurs clés de la période et leur valeur M-1.',
    params: [P.month, P.dept],
    usedBy: ['Cartes KPI (Pilotage)'],
    response: [
      num('headcount', 'Effectif du périmètre (1 500 pour tous départements)'),
      {
        name: 'values',
        type: 'Record<KpiId, Compared>',
        desc: 'Clés : activeUsers, usageRate, questions, questionsPerUser, cost, costPerQuestion, responseTime (s), satisfaction',
        map: true,
        children: [num('value', 'Valeur sur la période', true), num('previous', 'Valeur M-1', true)],
      },
    ],
  },
  {
    id: 'activity',
    path: '/api/dashboard/activity',
    summary: 'Historique complet d’une mesure (le filtre mois est ignoré) : 42 jours, 12 semaines ou 8 mois.',
    params: [P.dept, P.granularity, P.metric],
    usedBy: ['Évolution — courbe (Pilotage)'],
    response: [
      str('metric', 'Mesure renvoyée (KpiId)'),
      str('granularity', 'day | week | month'),
      str('scopeLabel', 'Périmètre affiché, ex. « tous départements »'),
      {
        name: 'points',
        type: 'array',
        desc: 'Un point par jour / semaine / mois, ordre chronologique',
        children: [str('date', 'Début du bucket (YYYY-MM-DD)'), num('value', 'Valeur de la mesure'), { name: 'partial', type: 'boolean', desc: 'Bucket encore ouvert à la date des données (tracé en pointillé)' }],
      },
    ],
  },
  {
    id: 'departments',
    path: '/api/dashboard/departments',
    summary: 'Indicateurs par département pour le mois (tous départements, le département choisi est seulement mis en évidence) et ligne total.',
    params: [P.month],
    usedBy: ['Par département — barres (Pilotage)', 'Utilisation par département — tableau (Métiers)'],
    response: [
      { name: 'rows', type: 'array', desc: 'Un élément par département', children: [num('id', 'DeptID'), str('name', 'Libellé complet'), str('short', 'Libellé court'), ...deptMeasures] },
      { name: 'total', type: 'object', desc: 'Totaux tous départements', children: deptMeasures },
      num('adoptionThreshold', "Seuil d'adoption (0,40) : barre orange en dessous"),
      num('satisfactionThreshold', 'Seuil de satisfaction (0,75) : texte rouge en dessous'),
    ],
  },
  {
    id: 'budget',
    path: '/api/dashboard/budget',
    summary: 'Coût LLM du mois, projection linéaire à fin de mois et série cumulée jour par jour.',
    params: [P.month, P.dept],
    usedBy: ['Budget LLM du mois (Pilotage)'],
    response: [
      num('costToDate', 'Coût cumulé à la date des données (TND)'),
      num('projection', 'coût / jours écoulés × jours du mois (TND)'),
      num('costPerQuestion', 'TND par question', true),
      num('costPerUser', 'TND par utilisateur actif', true),
      num('monthlyBudget', 'Budget mensuel (700 TND)'),
      num('consumedRatio', 'costToDate / monthlyBudget'),
      num('projectedRatio', 'projection / monthlyBudget'),
      str('scopeLabel', 'Périmètre affiché'),
      {
        name: 'series',
        type: 'array',
        desc: 'Un point par jour du mois',
        children: [str('date', 'YYYY-MM-DD'), num('cumulative', 'Coût cumulé (null après la date des données)', true), num('projected', 'Projection (à partir de la date des données)', true)],
      },
    ],
  },
  {
    id: 'alerts',
    path: '/api/dashboard/alerts',
    summary: 'Règles d’alerte évaluées sur la période : temps de réponse, adoption, budget, satisfaction.',
    params: [P.month, P.dept],
    usedBy: ['Alertes (Pilotage)'],
    response: [
      num('active', 'Nombre d’alertes au statut ALERTE ou À SUIVRE'),
      {
        name: 'items',
        type: 'array',
        desc: 'Une ligne par règle',
        children: [
          num('id', 'Identifiant de la règle (1–4)'),
          str('category', 'Temps de réponse | Adoption | Budget | Satisfaction'),
          { name: 'status', type: "'ALERTE' | 'À SUIVRE' | 'OK'", desc: 'Statut affiché dans le badge' },
          { name: 'severity', type: "'high' | 'medium' | 'low'", desc: 'Sévérité dérivée du statut' },
          str('title', 'Titre déjà formaté, ex. « Projection budget : 82 % »'),
          str('detail', 'Détail / seuil'),
          str('date', 'Date de référence (YYYY-MM-DD)'),
        ],
      },
    ],
  },
  {
    id: 'service-quality',
    path: '/api/dashboard/service-quality',
    summary: 'Qualité de service et usage de la base documentaire.',
    params: [P.month, P.dept],
    usedBy: ['Qualité de service & documents (Pilotage)'],
    response: [
      compared('errorRate', 'Taux de réponses en erreur (0–1)'),
      compared('responseTime', 'Temps de réponse moyen (s)'),
      num('documentsUsed', 'Documents distincts cités sur la période'),
      num('documentsTotal', 'Documents de la base (420)'),
      num('documentShare', 'documentsUsed / documentsTotal'),
      compared('conversations', 'Conversations distinctes'),
      str('scopeLabel', 'Périmètre affiché'),
    ],
  },
  {
    id: 'themes',
    path: '/api/dashboard/themes',
    summary: 'Répartition des questions par thématique et matrice département × thématique.',
    params: [P.month, P.dept],
    usedBy: ['Thématiques des questions — barres (Métiers)', 'Thématiques par département — heatmap (Métiers)'],
    response: [
      {
        name: 'bars',
        type: 'array',
        desc: 'Triées par part décroissante, « Autre » en dernier',
        children: [
          num('id', 'ThemeID'),
          str('name', 'Thématique'),
          str('short', 'Libellé court'),
          str('color', 'Couleur hexadécimale de la thématique'),
          num('share', 'Part des questions (0–1)'),
          num('evolutionPt', 'Évolution de la part vs M-1, en points', true),
        ],
      },
      {
        name: 'heatmap',
        type: 'object',
        desc: 'Matrice (le filtre département ne retire pas de lignes)',
        children: [
          { name: 'columns', type: 'array', desc: '10 thématiques (hors « Autre »)', children: [num('id', 'ThemeID'), str('short', 'Libellé de colonne')] },
          {
            name: 'rows',
            type: 'array',
            desc: 'Un élément par département',
            children: [num('deptId', 'DeptID'), str('short', 'Libellé de ligne'), { name: 'values', type: 'number[]', desc: '% des questions du département, arrondi, dans l’ordre des colonnes' }],
          },
        ],
      },
    ],
  },
  {
    id: 'keywords',
    path: '/api/dashboard/keywords',
    summary: 'Mots-clés extraits des questions, avec fréquence et thématique.',
    params: [P.month, P.dept],
    usedBy: ['Nuage de mots-clés (Métiers)'],
    response: [
      str('scopeLabel', 'Périmètre affiché'),
      { name: 'words', type: 'array', desc: 'Triés par fréquence décroissante', children: [str('text', 'Mot-clé'), num('questions', 'Nombre de questions'), str('theme', 'Thématique'), str('color', 'Couleur de la thématique')] },
      { name: 'legend', type: 'array', desc: 'Thématiques affichées en légende', children: [str('theme', 'Thématique'), str('color', 'Couleur')] },
    ],
  },
  {
    id: 'documents',
    path: '/api/dashboard/documents',
    summary: 'Top 10 des documents cités par le chatbot.',
    params: [P.month, P.dept],
    usedBy: ['Documents les plus sollicités (Métiers)'],
    response: [
      {
        name: 'top',
        type: 'array',
        desc: '10 éléments, rang 1 = plus cité',
        children: [
          num('rank', 'Rang'),
          num('id', 'DocID'),
          str('title', 'Titre du document'),
          str('category', 'Catégorie (Guide, Procédure…)'),
          num('citations', 'Nombre de citations sur la période'),
          num('evolution', 'Évolution relative vs M-1 (0,12 = +12 %)', true),
        ],
      },
    ],
  },
  {
    id: 'document-detail',
    path: '/api/dashboard/documents/{id}',
    tryPath: 'documents/1',
    summary: 'Détail d’un document : citations, comparaison M-1, répartition par département et par thématique. 404 si l’id est inconnu.',
    params: [{ name: 'id', type: 'integer (chemin)', required: true, desc: 'DocID (1 à 420)' }, P.month, P.dept],
    usedBy: ['Fenêtre de détail d’un document (Métiers)'],
    response: [
      num('id', 'DocID'),
      str('title', 'Titre'),
      str('category', 'Catégorie'),
      num('citations', 'Questions citant le document sur la période'),
      num('previous', 'Même mesure en M-1'),
      { name: 'byDepartment', type: 'array', desc: 'Départements ayant cité le document, décroissant', children: [str('short', 'Département'), num('citations', 'Citations')] },
      { name: 'byTheme', type: 'array', desc: '5 thématiques principales', children: [str('name', 'Thématique'), str('color', 'Couleur'), num('citations', 'Citations')] },
    ],
  },
];

const ALL_STATES = 'Skeleton pendant la requête · carte d’erreur + « Réessayer »';

export const CHARTS: ChartDoc[] = [
  {
    id: 'kpi',
    name: 'Cartes KPI (8)',
    page: 'Pilotage',
    component: 'features/pilotage/kpi-strip.ts',
    rendering: 'HTML / CSS',
    endpoint: 'kpis',
    fields: 'values[KpiId].value / .previous, headcount',
    interactions: 'Clic sur une carte = mesure tracée dans la courbe Évolution (badge « ANALYSE »)',
    states: ALL_STATES,
    powerBi: 'Deneb 882d08 (vega-lite)',
  },
  {
    id: 'activity',
    name: 'Évolution — courbe',
    page: 'Pilotage',
    component: 'features/pilotage/activity-chart.ts',
    rendering: 'ECharts (line + area, SVG)',
    endpoint: 'activity',
    fields: 'points[].date / value / partial',
    interactions: 'Infobulle au survol · dernier bucket partiel en pointillé · dernière valeur étiquetée',
    states: ALL_STATES,
    powerBi: 'Deneb 568c7b',
  },
  {
    id: 'dept-bars',
    name: 'Par département — barres',
    page: 'Pilotage',
    component: 'features/pilotage/dept-bars.ts',
    rendering: 'HTML / CSS',
    endpoint: 'departments',
    fields: 'rows[].short / activeUsers / usageRate',
    interactions: 'Clic = filtre département global (re-clic = retirer) · infobulle',
    states: ALL_STATES,
    powerBi: 'Graphique à barres groupées natif',
  },
  {
    id: 'budget',
    name: 'Budget LLM du mois',
    page: 'Pilotage',
    component: 'features/pilotage/budget-card.ts',
    rendering: 'HTML / CSS (jauge) + ECharts (courbe cumulée)',
    endpoint: 'budget',
    fields: 'costToDate, projection, costPerQuestion, costPerUser, consumedRatio, projectedRatio, series[]',
    interactions: 'Infobulle sur la courbe · repère de projection sur la jauge',
    states: ALL_STATES,
    powerBi: 'Deneb 5408f4 + 5b28c9',
  },
  {
    id: 'alerts',
    name: 'Alertes',
    page: 'Pilotage',
    component: 'features/pilotage/alerts-card.ts',
    rendering: 'HTML / CSS',
    endpoint: 'alerts',
    fields: 'active, items[].status / title / detail / date',
    interactions: 'Badge coloré selon le statut',
    states: ALL_STATES,
    powerBi: 'Deneb c8d51c',
  },
  {
    id: 'quality',
    name: 'Qualité de service & documents',
    page: 'Pilotage',
    component: 'features/pilotage/service-quality-card.ts',
    rendering: 'HTML / CSS',
    endpoint: 'service-quality',
    fields: 'errorRate, responseTime, documentShare, documentsUsed, conversations',
    interactions: '—',
    states: ALL_STATES,
    powerBi: 'Deneb 6e8c1f',
  },
  {
    id: 'table',
    name: 'Utilisation par département — tableau',
    page: 'Métiers & thématiques',
    component: 'features/metiers/dept-table.ts',
    rendering: 'Tableau HTML + barres CSS',
    endpoint: 'departments',
    fields: 'rows[] (toutes les mesures), total, adoptionThreshold, satisfactionThreshold',
    interactions: 'Tri par colonne · clic / Entrée sur une ligne = filtre département',
    states: ALL_STATES,
    powerBi: 'Deneb 9f0382',
  },
  {
    id: 'heatmap',
    name: 'Thématiques par département — heatmap',
    page: 'Métiers & thématiques',
    component: 'features/metiers/theme-heatmap.ts',
    rendering: 'CSS Grid, échelle de couleurs à seuils',
    endpoint: 'themes',
    fields: 'heatmap.columns[], heatmap.rows[].values[]',
    interactions: 'Infobulle par cellule · clic sur le département = filtre',
    states: ALL_STATES,
    powerBi: 'Deneb e0dfc9',
  },
  {
    id: 'theme-bars',
    name: 'Thématiques des questions — barres',
    page: 'Métiers & thématiques',
    component: 'features/metiers/theme-bars.ts',
    rendering: 'HTML / CSS',
    endpoint: 'themes',
    fields: 'bars[].name / color / share / evolutionPt',
    interactions: 'Infobulle · ▲▼ vert / rouge au-delà de ±0,55 pt',
    states: ALL_STATES,
    powerBi: 'Deneb 4cda3f',
  },
  {
    id: 'cloud',
    name: 'Nuage de mots-clés',
    page: 'Métiers & thématiques',
    component: 'features/metiers/keyword-cloud.ts + cloud-layout.ts',
    rendering: 'Placement en spirale maison (sans dépendance), mesure du texte via canvas',
    endpoint: 'keywords',
    fields: 'words[].text / questions / color, legend[]',
    interactions: 'Taille = fréquence (échelle racine carrée) · infobulle · relayout au redimensionnement',
    states: ALL_STATES,
    powerBi: 'Deneb 612651 (vega wordcloud)',
  },
  {
    id: 'documents',
    name: 'Documents les plus sollicités',
    page: 'Métiers & thématiques',
    component: 'features/metiers/top-documents.ts',
    rendering: 'HTML / CSS + <dialog> natif',
    endpoint: 'documents · documents/{id}',
    fields: 'top[].rank / title / citations / evolution ; détail : byDepartment[], byTheme[]',
    interactions: 'Clic sur un document = fenêtre de détail (requête dédiée)',
    states: ALL_STATES,
    powerBi: 'Deneb ddec33',
  },
];
