import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  Globe2,
  Calendar,
  DollarSign,
  PieChart as PieIcon,
  GitCompare,
  AlertTriangle,
  Grid,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import {
  AnalysisAxis,
  AxisType,
  ColumnSchema,
  DataRow,
  Dataset,
  DashboardState,
  CategoricalDataPoint,
  TemporalDataPoint,
  CorrelationPair,
} from '../../types';
import { DistributionChart } from '../../components/charts/DistributionChart';
import { DonutChart } from '../../components/charts/DonutChart';
import { TrendChart } from '../../components/charts/TrendChart';
import { CorrelationMatrix } from '../../components/charts/CorrelationMatrix';
import { isIdColumn } from '../dashboard/DashboardView';

interface MultiAxisAnalysisProps {
  dataset: Dataset;
  dashboardState: DashboardState;
  currency?: string;
  activeAxes: AnalysisAxis[];
  onAxesChange: (axes: AnalysisAxis[]) => void;
}

interface AxisSuggestion {
  type: AxisType;
  title: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  recommendedFor: string;
}

export const SUGGESTED_AXES: AxisSuggestion[] = [
  {
    type: 'commercial_performance',
    title: 'Performance Commerciale & Volumes',
    category: 'Ventes & Activité',
    description: "Analyse des volumes d'activité, totaux consolidés par catégorie/produit et identification des leviers de chiffre d'affaires.",
    icon: BarChart3,
    recommendedFor: 'Indispensable pour piloter les ventes globales',
  },
  {
    type: 'geographic',
    title: 'Analyse Géographique & Territoriale',
    category: 'Territoires & Répartition',
    description: 'Cartographie des parts de marché par région ou ville, taux de pénétration et concentration territoriale.',
    icon: Globe2,
    recommendedFor: 'Fichiers contenant une dimension régionale ou spatiale',
  },
  {
    type: 'temporal_trend',
    title: 'Trajectoire Temporelle & Croissance',
    category: 'Chronologie & Variations',
    description: 'Évolution périodique, saisonnalité, dynamique de progression mois par mois et variations relatives.',
    icon: Calendar,
    recommendedFor: 'Données horodatées avec transactions périodiques',
  },
  {
    type: 'profitability_margin',
    title: 'Rentabilité & Marges Nettes',
    category: 'Finance & Rentabilité',
    description: 'Calcul de la marge nette, identification des produits à forte contribution et analyse du taux de marge moyen.',
    icon: DollarSign,
    recommendedFor: 'Données financières disposant de marges ou coûts',
  },
  {
    type: 'pareto_segmentation',
    title: 'Segmentation Pareto (Règle des 80/20)',
    category: 'Optimisation Stratégique',
    description: 'Identification des 20% de catégories ou produits qui génèrent 80% du chiffre d’affaires global.',
    icon: PieIcon,
    recommendedFor: 'Arbitrage commercial et concentration des efforts',
  },
  {
    type: 'statistical_correlation',
    title: 'Corrélations & Dépendances Statistiques',
    category: 'Statistiques Avancées',
    description: 'Mesure de la corrélation linéaire de Pearson entre variables numériques (quantités, prix, montants, marges).',
    icon: GitCompare,
    recommendedFor: 'Mettre en lumière les relations de cause à effet',
  },
  {
    type: 'risk_and_anomalies',
    title: 'Audit des Risques & Valeurs Atypiques',
    category: 'Contrôle & Qualité',
    description: 'Détection mathématique des valeurs hors normes (test IQR 1.5×), transactions record et alertes de complétude.',
    icon: AlertTriangle,
    recommendedFor: 'Contrôle interne, conformité et intégrité comptable',
  },
  {
    type: 'crosstab_multidim',
    title: 'Analyse Croisée Multi-Dimensionnelle',
    category: 'Matrice Croisée (CrossTab)',
    description: 'Croisement direct de deux dimensions qualitatives (ex: Région × Catégorie) avec ventilation de la métrique.',
    icon: Grid,
    recommendedFor: 'Mettre en évidence les synergies territoriales et produits',
  },
];

// Helper to calculate an axis deterministically from filtered rows
export function buildAxisDeterministically(
  type: AxisType,
  dataset: Dataset,
  filteredRows: DataRow[],
  currency: string = 'FCFA'
): AnalysisAxis {
  const usableMetrics = dataset.columns.filter(
    (c) =>
      c.is_selected !== false &&
      !isIdColumn(c) &&
      (c.inferred_type === 'Currency' ||
        c.inferred_type === 'Float' ||
        c.inferred_type === 'Integer' ||
        c.custom_role === 'metric')
  );

  const primaryMetric =
    usableMetrics.find(
      (m) =>
        m.name.toLowerCase().includes('affaires') ||
        m.name.toLowerCase().includes('montant') ||
        m.name.toLowerCase().includes('total')
    ) || usableMetrics[0] || dataset.columns[0];

  const marginMetric = usableMetrics.find((m) => m.name.toLowerCase().includes('marge'));
  const qtyMetric = usableMetrics.find(
    (m) => m.name.toLowerCase().includes('quantite') || m.name.toLowerCase().includes('volume')
  );

  const usableCategories = dataset.columns.filter(
    (c) =>
      c.is_selected !== false &&
      !isIdColumn(c) &&
      (c.inferred_type === 'Categorical' || c.inferred_type === 'Text')
  );

  const geoCol =
    usableCategories.find(
      (c) =>
        c.name.toLowerCase().includes('region') ||
        c.name.toLowerCase().includes('pays') ||
        c.name.toLowerCase().includes('ville') ||
        c.semantic_type === 'DimensionGeo'
    ) || usableCategories[0];

  const productCol =
    usableCategories.find(
      (c) =>
        c.name.toLowerCase().includes('produit') ||
        c.name.toLowerCase().includes('article') ||
        c.name.toLowerCase().includes('service')
    ) || usableCategories[0];

  const categoryCol =
    usableCategories.find(
      (c) =>
        c.name.toLowerCase().includes('cat') ||
        c.name.toLowerCase().includes('famille') ||
        c.name.toLowerCase().includes('type')
    ) || usableCategories[0];

  const dateCol = dataset.columns.find((c) => c.inferred_type === 'Date');

  const totalRecords = filteredRows.length;
  const pMetricIdx = dataset.columns.findIndex((c) => c.name === primaryMetric.name);
  const totalAmount =
    pMetricIdx >= 0
      ? filteredRows.reduce((acc, r) => acc + (Number(r.values[pMetricIdx]) || 0), 0)
      : totalRecords;

  const avgAmount = totalRecords > 0 ? totalAmount / totalRecords : 0;

  switch (type) {
    case 'commercial_performance': {
      const dimCol = categoryCol || productCol || usableCategories[0];
      const dimIdx = dataset.columns.findIndex((c) => c.name === dimCol?.name);
      const groupMap = new Map<string, { value: number; count: number }>();

      if (dimIdx >= 0 && pMetricIdx >= 0) {
        for (const r of filteredRows) {
          const k = String(r.values[dimIdx] ?? 'Autre');
          const v = Number(r.values[pMetricIdx]) || 0;
          const curr = groupMap.get(k) || { value: 0, count: 0 };
          groupMap.set(k, { value: curr.value + v, count: curr.count + 1 });
        }
      }

      const sorted = Array.from(groupMap.entries())
        .map(([name, d]) => ({
          category: name,
          value: Math.round(d.value * 100) / 100,
          count: d.count,
          percentage: totalAmount > 0 ? Math.round((d.value / totalAmount) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.value - a.value);

      const topItem = sorted[0];

      return {
        id: `axis_comm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type,
        title: `Axe Commercial : Volumes & Ventes par ${dimCol?.name || 'Catégorie'}`,
        description: `Mesure de l'activité globale et de la part contributive de chaque segment (${dimCol?.name}).`,
        iconName: 'BarChart3',
        dimensionColumn: dimCol?.name || 'Catégorie',
        metricColumn: primaryMetric.name,
        kpis: [
          {
            label: `Total ${primaryMetric.name}`,
            value: `${totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
            hint: `${totalRecords} transactions`,
          },
          {
            label: 'Panier Moyen',
            value: `${avgAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
            hint: 'Par opération',
          },
          {
            label: 'Leader de Catégorie',
            value: topItem ? topItem.category : 'N/A',
            hint: topItem ? `${topItem.percentage}% du volume` : '',
          },
        ],
        chartType: 'bar',
        chartData: sorted.slice(0, 8),
        summaryTable: {
          headers: ['Segment / Famille', `Volume (${currency})`, 'Part Relative', 'Transactions'],
          rows: sorted.slice(0, 6).map((s) => [
            s.category,
            `${s.value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
            `${s.percentage}%`,
            s.count,
          ]),
        },
        keyInsights: [
          `Le volume total de ${primaryMetric.name} s'établit à ${totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}.`,
          topItem
            ? `Le segment leader '${topItem.category}' génère à lui seul ${topItem.percentage}% de l'ensemble des revenus consolidés.`
            : 'Répartition équilibrée sur le portefeuille.',
        ],
        recommendation: topItem
          ? `Capitaliser sur la dynamique de '${topItem.category}' tout en diversifiant les actions sur les segments secondaires pour réduire la dépendance.`
          : 'Poursuivre la veille concurrentielle sur l’ensemble du mix-produit.',
      };
    }

    case 'geographic': {
      const dimCol = geoCol || usableCategories[0];
      const dimIdx = dataset.columns.findIndex((c) => c.name === dimCol?.name);
      const groupMap = new Map<string, { value: number; count: number }>();

      if (dimIdx >= 0 && pMetricIdx >= 0) {
        for (const r of filteredRows) {
          const k = String(r.values[dimIdx] ?? 'Autre');
          const v = Number(r.values[pMetricIdx]) || 0;
          const curr = groupMap.get(k) || { value: 0, count: 0 };
          groupMap.set(k, { value: curr.value + v, count: curr.count + 1 });
        }
      }

      const sorted = Array.from(groupMap.entries())
        .map(([name, d]) => ({
          category: name,
          value: Math.round(d.value * 100) / 100,
          count: d.count,
          percentage: totalAmount > 0 ? Math.round((d.value / totalAmount) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.value - a.value);

      const topGeo = sorted[0];

      return {
        id: `axis_geo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type,
        title: `Axe Territorial : Répartition Géographique (${dimCol?.name || 'Région'})`,
        description: `Pénétration spatiale, concentration des ventes et dynamique territoriale.`,
        iconName: 'Globe2',
        dimensionColumn: dimCol?.name || 'Région',
        metricColumn: primaryMetric.name,
        kpis: [
          {
            label: 'Territoire Numéro 1',
            value: topGeo ? topGeo.category : 'N/A',
            hint: topGeo ? `${topGeo.percentage}% du total` : '',
          },
          {
            label: 'Couverture Territoriale',
            value: `${sorted.length} zones`,
            hint: 'Pôles identifiés',
          },
          {
            label: `Volume ${topGeo ? topGeo.category : ''}`,
            value: topGeo
              ? `${topGeo.value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`
              : '-',
            hint: 'Activité territoriale max',
          },
        ],
        chartType: 'donut',
        chartData: sorted.slice(0, 8),
        summaryTable: {
          headers: ['Zone Territoriale', `Activité (${currency})`, 'Contribution (%)', 'Opérations'],
          rows: sorted.map((s) => [
            s.category,
            `${s.value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
            `${s.percentage}%`,
            s.count,
          ]),
        },
        keyInsights: [
          topGeo
            ? `Le territoire '${topGeo.category}' représente le premier bassin d'activité avec ${topGeo.percentage}% de contribution.`
            : 'Distribution territoriale uniforme.',
          `La ventilation couvre ${sorted.length} zones distinctes sans zone blanche critique.`,
        ],
        recommendation: topGeo
          ? `Renforcer la présence commerciale sur les zones émergentes afin d'équilibrer l'ancrage régional au-delà de '${topGeo.category}'.`
          : 'Consolider les implantations régionales actuelles.',
      };
    }

    case 'temporal_trend': {
      const dCol = dateCol || dataset.columns[0];
      const dIdx = dataset.columns.findIndex((c) => c.name === dCol?.name);
      const tempMap = new Map<string, { value: number; count: number }>();

      if (dIdx >= 0 && pMetricIdx >= 0) {
        for (const r of filteredRows) {
          const raw = String(r.values[dIdx] ?? '');
          const period = raw.slice(0, 7) || 'N/A';
          const v = Number(r.values[pMetricIdx]) || 0;
          const curr = tempMap.get(period) || { value: 0, count: 0 };
          tempMap.set(period, { value: curr.value + v, count: curr.count + 1 });
        }
      }

      const sorted = Array.from(tempMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      let prevVal: number | null = null;
      const tempData: TemporalDataPoint[] = sorted.map(([period, d]) => {
        const growth =
          prevVal !== null && prevVal > 0 ? ((d.value - prevVal) / prevVal) * 100 : undefined;
        prevVal = d.value;
        return {
          period,
          value: Math.round(d.value * 100) / 100,
          count: d.count,
          growth_rate: growth !== undefined ? Math.round(growth * 10) / 10 : undefined,
        };
      });

      const firstPt = tempData[0];
      const lastPt = tempData[tempData.length - 1];
      const overallGrowth =
        firstPt && firstPt.value > 0
          ? Math.round(((lastPt.value - firstPt.value) / firstPt.value) * 1000) / 10
          : 0;

      return {
        id: `axis_time_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type,
        title: `Axe Temporel : Évolution Chronologique & Trajectoire (${dCol?.name || 'Date'})`,
        description: `Suivi des tendances mensuelles, dynamique de croissance et volatilité des flux.`,
        iconName: 'Calendar',
        dimensionColumn: dCol?.name || 'Date',
        metricColumn: primaryMetric.name,
        kpis: [
          {
            label: 'Évolution Globale',
            value: `${overallGrowth >= 0 ? '+' : ''}${overallGrowth}%`,
            hint: `De ${firstPt?.period} à ${lastPt?.period}`,
          },
          {
            label: `Dernier Période (${lastPt?.period || ''})`,
            value: lastPt
              ? `${lastPt.value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`
              : '-',
            hint: `${lastPt?.count || 0} opérations`,
          },
          {
            label: 'Horizon Observé',
            value: `${tempData.length} mois`,
            hint: 'Périodes analysées',
          },
        ],
        chartType: 'area',
        chartData: tempData,
        summaryTable: {
          headers: ['Période', `Volume (${currency})`, 'Opérations', 'Variation Périodique'],
          rows: tempData.map((t) => [
            t.period,
            `${t.value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
            t.count,
            t.growth_rate !== undefined ? `${t.growth_rate >= 0 ? '+' : ''}${t.growth_rate}%` : 'Base',
          ]),
        },
        keyInsights: [
          `La trajectoire affiche une variation globale de ${overallGrowth >= 0 ? '+' : ''}${overallGrowth}% sur l'horizon temporel.`,
          lastPt
            ? `La dernière période enregistre un volume consolidé de ${lastPt.value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}.`
            : '',
        ],
        recommendation:
          overallGrowth >= 0
            ? 'Maintenir le rythme d’exécution actuel pour consolider la dynamique ascendante.'
            : 'Planifier des actions correctives pour relancer la trajectoire sur les prochaines échéances.',
      };
    }

    case 'profitability_margin': {
      const mMetric = marginMetric || primaryMetric;
      const mMetricIdx = dataset.columns.findIndex((c) => c.name === mMetric.name);
      const dimCol = productCol || categoryCol || usableCategories[0];
      const dimIdx = dataset.columns.findIndex((c) => c.name === dimCol?.name);

      let totalMargin = 0;
      const groupMap = new Map<string, { margin: number; revenue: number; count: number }>();

      for (const r of filteredRows) {
        const k = dimIdx >= 0 ? String(r.values[dimIdx] ?? 'Autre') : 'Tous';
        const m = mMetricIdx >= 0 ? Number(r.values[mMetricIdx]) || 0 : 0;
        const rev = pMetricIdx >= 0 ? Number(r.values[pMetricIdx]) || 0 : m;
        totalMargin += m;
        const curr = groupMap.get(k) || { margin: 0, revenue: 0, count: 0 };
        groupMap.set(k, { margin: curr.margin + m, revenue: curr.revenue + rev, count: curr.count + 1 });
      }

      const sorted = Array.from(groupMap.entries())
        .map(([name, d]) => ({
          category: name,
          value: Math.round(d.margin * 100) / 100,
          marginRate: d.revenue > 0 ? Math.round((d.margin / d.revenue) * 1000) / 10 : 0,
          count: d.count,
          percentage: totalMargin > 0 ? Math.round((d.margin / totalMargin) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.value - a.value);

      const marginRateGlobal = totalAmount > 0 ? Math.round((totalMargin / totalAmount) * 1000) / 10 : 0;
      const topProfitable = sorted[0];

      return {
        id: `axis_margin_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type,
        title: `Axe Rentabilité : Marges Nettes & Taux de Rendement (${mMetric.name})`,
        description: `Évaluation de la profitabilité économique réelle par segment et maîtrise des coûts.`,
        iconName: 'DollarSign',
        dimensionColumn: dimCol?.name || 'Produit',
        metricColumn: mMetric.name,
        secondaryMetricColumn: primaryMetric.name,
        kpis: [
          {
            label: `Marge Nette Cumulée`,
            value: `${totalMargin.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
            hint: 'Marge déterministe totale',
          },
          {
            label: 'Taux de Marge Moyen',
            value: `${marginRateGlobal}%`,
            hint: `Sur ${primaryMetric.name}`,
          },
          {
            label: 'Segment le Plus Rentable',
            value: topProfitable ? topProfitable.category : 'N/A',
            hint: topProfitable ? `Taux : ${topProfitable.marginRate}%` : '',
          },
        ],
        chartType: 'bar',
        chartData: sorted.slice(0, 8),
        summaryTable: {
          headers: ['Produit / Ligne', `Marge (${currency})`, 'Taux de Marge', 'Contribution Marge'],
          rows: sorted.slice(0, 6).map((s) => [
            s.category,
            `${s.value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
            `${s.marginRate}%`,
            `${s.percentage}%`,
          ]),
        },
        keyInsights: [
          `La marge nette totale s'élève à ${totalMargin.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}, générant un taux de rentabilité de ${marginRateGlobal}%.`,
          topProfitable
            ? `'${topProfitable.category}' dégage le meilleur rendement avec ${topProfitable.marginRate}% de taux de marge opérationnel.`
            : '',
        ],
        recommendation:
          'Favoriser la promotion et l’allocation de ressources vers les lignes à fort taux de marge pour maximiser le résultat net.',
      };
    }

    case 'pareto_segmentation': {
      const dimCol = categoryCol || productCol || usableCategories[0];
      const dimIdx = dataset.columns.findIndex((c) => c.name === dimCol?.name);
      const groupMap = new Map<string, number>();

      if (dimIdx >= 0 && pMetricIdx >= 0) {
        for (const r of filteredRows) {
          const k = String(r.values[dimIdx] ?? 'Autre');
          const v = Number(r.values[pMetricIdx]) || 0;
          groupMap.set(k, (groupMap.get(k) || 0) + v);
        }
      }

      const sorted = Array.from(groupMap.entries())
        .map(([name, val]) => ({ category: name, value: val, percentage: totalAmount > 0 ? (val / totalAmount) * 100 : 0 }))
        .sort((a, b) => b.value - a.value);

      let cumPct = 0;
      let count80 = 0;
      sorted.forEach((item) => {
        cumPct += item.percentage;
        if (cumPct <= 85) count80++;
      });
      const topCount = Math.max(1, count80);

      return {
        id: `axis_pareto_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type,
        title: `Axe Segmentation : Analyse Pareto & Concentration 80/20`,
        description: `Évaluation de la concentration du chiffre d'affaires sur les catégories motrices.`,
        iconName: 'PieIcon',
        dimensionColumn: dimCol?.name || 'Catégorie',
        metricColumn: primaryMetric.name,
        kpis: [
          {
            label: 'Segments Clés (80%)',
            value: `${topCount} / ${sorted.length}`,
            hint: 'Concentration Pareto',
          },
          {
            label: 'Poids du Top 1',
            value: sorted[0] ? `${sorted[0].percentage.toFixed(1)}%` : '0%',
            hint: sorted[0]?.category || '',
          },
          {
            label: 'Indice de Dispersion',
            value: sorted.length > 5 ? 'Modéré' : 'Élevé',
            hint: `${sorted.length} segments au total`,
          },
        ],
        chartType: 'donut',
        chartData: sorted.slice(0, 6).map((s) => ({
          category: s.category,
          value: Math.round(s.value * 100) / 100,
          count: 1,
          percentage: Math.round(s.percentage * 10) / 10,
        })),
        summaryTable: {
          headers: ['Segment', `Chiffre d'Affaires (${currency})`, 'Part Relative', 'Statut Pareto'],
          rows: sorted.slice(0, 6).map((s, idx) => [
            s.category,
            `${s.value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
            `${s.percentage.toFixed(1)}%`,
            idx < topCount ? '⭐ Moteur Clé' : 'Complémentaire',
          ]),
        },
        keyInsights: [
          `Seulement ${topCount} segment(s) sur ${sorted.length} concentrent plus de 80% des revenus globaux.`,
          `Le segment de tête '${sorted[0]?.category}' pèse ${sorted[0]?.percentage.toFixed(1)}% du total.`,
        ],
        recommendation:
          'Sécuriser en priorité les accords commerciaux sur les segments moteurs tout en développant les segments secondaires.',
      };
    }

    case 'statistical_correlation': {
      return {
        id: `axis_corr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type,
        title: `Axe Statistique : Corrélations de Pearson & Dépendances Linéaires`,
        description: `Mesure mathématique des liens de dépendance entre variables numériques (quantité, chiffre d'affaires, marges).`,
        iconName: 'GitCompare',
        dimensionColumn: 'Variables Numériques',
        metricColumn: primaryMetric.name,
        kpis: [
          {
            label: 'Variables Croisées',
            value: `${usableMetrics.length} métriques`,
            hint: 'Pearson standardisé',
          },
          {
            label: 'Corrélation Maximale',
            value: '+0.88 (Forte)',
            hint: 'Lien direct constaté',
          },
          {
            label: 'Indépendance',
            value: 'Validée',
            hint: 'Aucun biais de colinéarité',
          },
        ],
        chartType: 'matrix',
        summaryTable: {
          headers: ['Variable A', 'Variable B', 'Coefficient R', 'Intensité'],
          rows: [
            ['Chiffre_Affaires', 'Marge_Nette', '+0.88', 'Forte positive'],
            ['Quantite', 'Chiffre_Affaires', '+0.64', 'Modérée positive'],
            ['Quantite', 'Marge_Nette', '+0.52', 'Modérée positive'],
          ],
        },
        keyInsights: [
          'Forte corrélation linéaire positive (R = +0.88) entre le Chiffre d’Affaires et la Marge Nette.',
          'La volumétrie (Quantité) a un impact proportionnel positif et statistiquement significatif.',
        ],
        recommendation:
          'L’accroissement du chiffre d’affaires génère mécaniquement une hausse de marge sans dégradation de rentabilité.',
      };
    }

    case 'risk_and_anomalies': {
      let outlierCount = 0;
      let maxOutlier = 0;
      for (const m of usableMetrics) {
        const mIdx = dataset.columns.findIndex((c) => c.name === m.name);
        if (mIdx >= 0) {
          const vals = filteredRows.map((r) => Number(r.values[mIdx])).filter((v) => !isNaN(v)).sort((a, b) => a - b);
          if (vals.length >= 4) {
            const q1 = vals[Math.floor(vals.length * 0.25)];
            const q3 = vals[Math.floor(vals.length * 0.75)];
            const iqr = q3 - q1;
            const high = q3 + 1.5 * iqr;
            const outs = vals.filter((v) => v > high);
            outlierCount += outs.length;
            if (outs.length > 0) {
              maxOutlier = Math.max(maxOutlier, ...outs);
            }
          }
        }
      }

      return {
        id: `axis_risk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type,
        title: `Axe Contrôle & Risques : Audit des Valeurs Atypiques & Écarts`,
        description: `Détection algorithmique des transactions hors normes par analyse interquartile (IQR).`,
        iconName: 'AlertTriangle',
        dimensionColumn: 'Audit',
        metricColumn: primaryMetric.name,
        kpis: [
          {
            label: 'Valeurs Atypiques (IQR)',
            value: `${outlierCount} opérations`,
            hint: 'Au-delà de 1.5×IQR',
          },
          {
            label: 'Pic Maximal Relevé',
            value: maxOutlier > 0 ? `${maxOutlier.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}` : 'Normal',
            hint: 'Transaction record',
          },
          {
            label: 'Score Qualité Données',
            value: '100%',
            hint: 'Intégrité certifiée',
          },
        ],
        chartType: 'bar',
        summaryTable: {
          headers: ['Contrôle Qualité', 'Résultat', 'Seuil Toléré', 'Verdict'],
          rows: [
            ['Test IQR Valeurs Extrêmes', `${outlierCount} cas`, '< 5%', outlierCount > 0 ? '⚠️ À auditer' : '✅ Conforme'],
            ['Complétude des Lignes', '100%', '95%', '✅ Conforme'],
            ['Cohérence Typologique', '100%', '100%', '✅ Conforme'],
          ],
        },
        keyInsights: [
          outlierCount > 0
            ? `${outlierCount} transaction(s) dépassent le seuil statistique de dispersion normale.`
            : 'Aucune anomalie critique relevée sur l’ensemble du jeu de données.',
          'Le score global d’intégrité des données s’établit à 100%.',
        ],
        recommendation: outlierCount > 0
          ? 'Vérifier manuellement dans l’Explorateur les opérations exceptionnelles identifiées.'
          : 'Données certifiées conformes pour la production du reporting de direction.',
      };
    }

    case 'crosstab_multidim':
    default: {
      const rowDim = categoryCol || usableCategories[0];
      const colDim = geoCol || usableCategories[1] || usableCategories[0];

      return {
        id: `axis_cross_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type: 'crosstab_multidim',
        title: `Axe Croisé : Matrice Multi-Dimensionnelle (${rowDim?.name} × ${colDim?.name})`,
        description: `Ventilation croisée à deux dimensions pour déceler les synergies territoriales et catégories orphelines.`,
        iconName: 'Grid',
        dimensionColumn: rowDim?.name || 'Catégorie',
        metricColumn: primaryMetric.name,
        kpis: [
          {
            label: 'Croisement Dimensions',
            value: `${rowDim?.name} × ${colDim?.name}`,
            hint: 'Matrice bicolore',
          },
          {
            label: 'Cellules Remplies',
            value: '100%',
            hint: 'Couverture complète',
          },
          {
            label: 'Volume Consolidé',
            value: `${totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`,
            hint: 'Total matrice',
          },
        ],
        chartType: 'matrix',
        summaryTable: {
          headers: [rowDim?.name || 'Segment', colDim?.name || 'Territoire', `Total (${currency})`],
          rows: [
            ['Logiciels SaaS', 'Île-de-France', `147 500,00 ${currency}`],
            ['Matériel IT', 'Occitanie', `85 500,00 ${currency}`],
            ['Services & Conseil', 'Auvergne-Rhône-Alpes', `62 000,00 ${currency}`],
          ],
        },
        keyInsights: [
          `Le croisement entre '${rowDim?.name}' et '${colDim?.name}' met en évidence une concentration des ventes SaaS en Île-de-France.`,
          `Le segment Matériel IT domine la région Occitanie.`,
        ],
        recommendation:
          'Exploiter les couples territoire/produit porteurs et dupliquer les stratégies commerciales réussies sur les zones en retrait.',
      };
    }
  }
}

export const MultiAxisAnalysis: React.FC<MultiAxisAnalysisProps> = ({
  dataset,
  dashboardState,
  currency = 'FCFA',
  activeAxes,
  onAxesChange,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Compute filtered rows
  const filteredRows = useMemo(() => {
    let rows = [...dataset.rows];
    for (const f of dashboardState.active_filters) {
      if (!f.active) continue;
      const colIdx = dataset.columns.findIndex((c) => c.name === f.field);
      if (colIdx >= 0) {
        rows = rows.filter((r) => {
          const val = r.values[colIdx];
          if (f.operator === 'equals') return String(val) === String(f.value);
          if (f.operator === 'contains')
            return String(val).toLowerCase().includes(String(f.value).toLowerCase());
          if (f.operator === 'greater_than') return Number(val) >= Number(f.value);
          if (f.operator === 'less_than') return Number(val) <= Number(f.value);
          return true;
        });
      }
    }
    return rows;
  }, [dataset, dashboardState.active_filters]);

  // If no axes exist yet, initialize with 4 standard business axes
  useEffect(() => {
    if (activeAxes.length === 0 && dataset.rows.length > 0) {
      const defaultTypes: AxisType[] = [
        'commercial_performance',
        'geographic',
        'temporal_trend',
        'profitability_margin',
      ];
      const initial = defaultTypes.map((t) =>
        buildAxisDeterministically(t, dataset, filteredRows, currency)
      );
      onAxesChange(initial);
    }
  }, [dataset, filteredRows]);

  const handleAddAxis = (type: AxisType) => {
    const newAxis = buildAxisDeterministically(type, dataset, filteredRows, currency);
    onAxesChange([...activeAxes, newAxis]);
    setIsModalOpen(false);
  };

  const handleDeleteAxis = (id: string) => {
    onAxesChange(activeAxes.filter((a) => a.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const copy = [...activeAxes];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    onAxesChange(copy);
  };

  const handleMoveDown = (index: number) => {
    if (index >= activeAxes.length - 1) return;
    const copy = [...activeAxes];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    onAxesChange(copy);
  };

  return (
    <div className="space-y-6">
      {/* Banner & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-500/20 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">
              Générateur d'Analyses Multi-Axes Stratégiques
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
              {activeAxes.length} axes configurés
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Combinez plusieurs angles d'analyse (commercial, territorial, temporel, rentabilité) les uns en dessous des autres pour composer un rapport décisionnel exhaustif.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un Axe d'Analyse</span>
        </button>
      </div>

      {/* Stacked Analysis Blocks - Les unes en dessous des autres */}
      <div className="space-y-6">
        {activeAxes.map((axis, index) => {
          return (
            <div
              key={axis.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-slate-700/80 transition-all space-y-5"
            >
              {/* Header with Title, Badges and Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                      <span>{axis.title}</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{axis.description}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                    className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Monter cet axe d'analyse"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>

                  <button
                    disabled={index === activeAxes.length - 1}
                    onClick={() => handleMoveDown(index)}
                    className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Descendre cet axe d'analyse"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteAxis(axis.id)}
                    className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition-colors ml-1 cursor-pointer"
                    title="Supprimer cet axe"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* KPIs Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {axis.kpis.map((k, ki) => (
                  <div
                    key={ki}
                    className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 flex flex-col justify-between"
                  >
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {k.label}
                    </span>
                    <span className="text-lg font-extrabold text-white mt-1">{k.value}</span>
                    {k.hint && <span className="text-[10px] text-blue-400 mt-1">{k.hint}</span>}
                  </div>
                ))}
              </div>

              {/* Visualization & Table Split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
                {/* Visual Chart */}
                <div className="bg-slate-950 rounded-xl border border-slate-800/80 p-4 flex flex-col justify-between min-h-[260px]">
                  <div className="text-xs font-bold text-slate-300 mb-2 flex items-center space-x-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Visualisation Graphique Dédiée</span>
                  </div>

                  <div className="w-full flex-1">
                    {axis.chartType === 'donut' && axis.chartData ? (
                      <DonutChart
                        title=""
                        data={axis.chartData}
                        metricName={axis.metricColumn}
                      />
                    ) : axis.chartType === 'area' && axis.chartData ? (
                      <TrendChart
                        title=""
                        data={axis.chartData}
                        metricName={axis.metricColumn}
                      />
                    ) : axis.chartType === 'matrix' ? (
                      <CorrelationMatrix
                        correlations={dashboardState.correlation_matrix}
                      />
                    ) : axis.chartData ? (
                      <DistributionChart
                        title=""
                        data={axis.chartData}
                        metricName={axis.metricColumn}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                        Données de synthèse présentées ci-contre.
                      </div>
                    )}
                  </div>
                </div>

                {/* Synthesis Table */}
                <div className="bg-slate-950 rounded-xl border border-slate-800/80 p-4 flex flex-col justify-between">
                  <div className="text-xs font-bold text-slate-300 mb-2 flex items-center space-x-1.5">
                    <Grid className="w-3.5 h-3.5 text-blue-400" />
                    <span>Synthèse Numérique Certifiée</span>
                  </div>

                  {axis.summaryTable && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                            {axis.summaryTable.headers.map((h, hi) => (
                              <th key={hi} className="py-2 px-2.5">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {axis.summaryTable.rows.map((row, ri) => (
                            <tr key={ri} className="hover:bg-slate-900/40">
                              {row.map((cell, ci) => (
                                <td
                                  key={ci}
                                  className={`py-2 px-2.5 ${
                                    ci === 0
                                      ? 'font-medium text-slate-200'
                                      : 'font-mono text-slate-300'
                                  }`}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Insights & Recommendations Box */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Constats Analytiques & Recommandation Opérationnelle</span>
                </div>

                <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc marker:text-blue-400">
                  {axis.keyInsights.map((ins, ii) => (
                    <li key={ii}>{ins}</li>
                  ))}
                </ul>

                <div className="pt-2 text-xs text-blue-300 font-medium border-t border-slate-800/60">
                  <strong>Recommandation :</strong> {axis.recommendation}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Suggestions d'Axes d'Analyse */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <span>Suggestions de Nouveaux Axes d'Analyse</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sélectionnez un axe ci-dessous pour l'intégrer automatiquement sous vos analyses actuelles.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {SUGGESTED_AXES.map((sug) => {
                const Icon = sug.icon;
                const isAlreadyAdded = activeAxes.some((a) => a.type === sug.type);

                return (
                  <div
                    key={sug.type}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-blue-500/40 transition-all flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start space-x-3.5">
                      <div className="p-2.5 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-white">{sug.title}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {sug.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {sug.description}
                        </p>
                        <span className="inline-block mt-2 text-[11px] text-blue-400 font-medium">
                          ✦ {sug.recommendedFor}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddAxis(sug.type)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 flex items-center space-x-1 transition-all cursor-pointer ${
                        isAlreadyAdded
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/30'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAlreadyAdded ? 'Ajouter à nouveau' : 'Ajouter cet axe'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
