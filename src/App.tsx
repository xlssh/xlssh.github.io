import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LoadingState } from './components/LoadingState';
import './App.css';

// Lazy load all page components to optimize bundle sizes and speed up initial load times
const DashboardPage = React.lazy(() => import('./routes/DashboardPage').then(m => ({ default: m.DashboardPage })));
const CalendarPage = React.lazy(() => import('./routes/CalendarPage').then(m => ({ default: m.CalendarPage })));
const PromotionSchedulerPage = React.lazy(() => import('./routes/PromotionSchedulerPage').then(m => ({ default: m.PromotionSchedulerPage })));
const SearchPage = React.lazy(() => import('./routes/SearchPage').then(m => ({ default: m.SearchPage })));
const HeroesPage = React.lazy(() => import('./routes/HeroesPage').then(m => ({ default: m.HeroesPage })));
const HeroComparisonPage = React.lazy(() => import('./routes/HeroComparisonPage').then(m => ({ default: m.HeroComparisonPage })));
const HeroSfxPage = React.lazy(() => import('./routes/HeroSfxPage').then(m => ({ default: m.HeroSfxPage })));
const StatCurveAnalyticsPage = React.lazy(() => import('./routes/StatCurveAnalyticsPage').then(m => ({ default: m.StatCurveAnalyticsPage })));
const HeroDetailPage = React.lazy(() => import('./routes/HeroDetailPage').then(m => ({ default: m.HeroDetailPage })));
const ArticlesPage = React.lazy(() => import('./routes/ArticlesPage').then(m => ({ default: m.ArticlesPage })));
const FarmingPlannerPage = React.lazy(() => import('./routes/FarmingPlannerPage').then(m => ({ default: m.FarmingPlannerPage })));
const ArticleDetailPage = React.lazy(() => import('./routes/ArticleDetailPage').then(m => ({ default: m.ArticleDetailPage })));
const ZanpakutoEvolutionPage = React.lazy(() => import('./routes/ZanpakutoEvolutionPage').then(m => ({ default: m.ZanpakutoEvolutionPage })));
const ZanpakutoStatsPage = React.lazy(() => import('./routes/ZanpakutoStatsPage').then(m => ({ default: m.ZanpakutoStatsPage })));
const StoryQuestsPage = React.lazy(() => import('./routes/StoryQuestsPage').then(m => ({ default: m.StoryQuestsPage })));
const QuestChainPage = React.lazy(() => import('./routes/QuestChainPage').then(m => ({ default: m.QuestChainPage })));
const StoryQuestDetailPage = React.lazy(() => import('./routes/StoryQuestDetailPage').then(m => ({ default: m.StoryQuestDetailPage })));
const DailyQuestsPage = React.lazy(() => import('./routes/DailyQuestsPage').then(m => ({ default: m.DailyQuestsPage })));
const DailyQuestDetailPage = React.lazy(() => import('./routes/DailyQuestDetailPage').then(m => ({ default: m.DailyQuestDetailPage })));
const CitiesPage = React.lazy(() => import('./routes/CitiesPage').then(m => ({ default: m.CitiesPage })));
const WorldMapPage = React.lazy(() => import('./routes/WorldMapPage').then(m => ({ default: m.WorldMapPage })));
const CityDetailPage = React.lazy(() => import('./routes/CityDetailPage').then(m => ({ default: m.CityDetailPage })));
const StagesPage = React.lazy(() => import('./routes/StagesPage').then(m => ({ default: m.StagesPage })));
const StageDetailPage = React.lazy(() => import('./routes/StageDetailPage').then(m => ({ default: m.StageDetailPage })));
const MallItemsPage = React.lazy(() => import('./routes/MallItemsPage').then(m => ({ default: m.MallItemsPage })));
const MallItemDetailPage = React.lazy(() => import('./routes/MallItemDetailPage').then(m => ({ default: m.MallItemDetailPage })));
const MallAnalyticsPage = React.lazy(() => import('./routes/MallAnalyticsPage').then(m => ({ default: m.MallAnalyticsPage })));
const PromotionsPage = React.lazy(() => import('./routes/PromotionsPage').then(m => ({ default: m.PromotionsPage })));
const PromotionDetailPage = React.lazy(() => import('./routes/PromotionDetailPage').then(m => ({ default: m.PromotionDetailPage })));
const FormationBuilderPage = React.lazy(() => import('./routes/FormationBuilderPage').then(m => ({ default: m.FormationBuilderPage })));
const ProfessionCounterPage = React.lazy(() => import('./routes/ProfessionCounterPage').then(m => ({ default: m.ProfessionCounterPage })));
const SynergyGraphPage = React.lazy(() => import('./routes/SynergyGraphPage').then(m => ({ default: m.SynergyGraphPage })));
const TierHeatmapPage = React.lazy(() => import('./routes/TierHeatmapPage').then(m => ({ default: m.TierHeatmapPage })));
const SkillHandbookPage = React.lazy(() => import('./routes/SkillHandbookPage').then(m => ({ default: m.SkillHandbookPage })));
const BondOptimizerPage = React.lazy(() => import('./routes/BondOptimizerPage').then(m => ({ default: m.BondOptimizerPage })));
const VipPlannerPage = React.lazy(() => import('./routes/VipPlannerPage').then(m => ({ default: m.VipPlannerPage })));
const CombatSimulatorPage = React.lazy(() => import('./routes/CombatSimulatorPage').then(m => ({ default: m.CombatSimulatorPage })));
const CampaignRoadmapPage = React.lazy(() => import('./routes/CampaignRoadmapPage').then(m => ({ default: m.CampaignRoadmapPage })));
const HomeDatingPage = React.lazy(() => import('./routes/HomeDatingPage').then(m => ({ default: m.HomeDatingPage })));
const EquipmentSuitePage = React.lazy(() => import('./routes/EquipmentSuitePage').then(m => ({ default: m.EquipmentSuitePage })));
const AwakeningConsolePage = React.lazy(() => import('./routes/AwakeningConsolePage').then(m => ({ default: m.AwakeningConsolePage })));
const PetSanctuaryPage = React.lazy(() => import('./routes/PetSanctuaryPage').then(m => ({ default: m.PetSanctuaryPage })));
const AchievementTitlePage = React.lazy(() => import('./routes/AchievementTitlePage').then(m => ({ default: m.AchievementTitlePage })));
const GachaShopsPage = React.lazy(() => import('./routes/GachaShopsPage').then(m => ({ default: m.GachaShopsPage })));
const AcademyRelicsPage = React.lazy(() => import('./routes/AcademyRelicsPage').then(m => ({ default: m.AcademyRelicsPage })));
const LootTableOraclePage = React.lazy(() => import('./routes/LootTableOraclePage').then(m => ({ default: m.LootTableOraclePage })));
const PveEncounterPage = React.lazy(() => import('./routes/PveEncounterPage').then(m => ({ default: m.PveEncounterPage })));
const GuildVipPlannerPage = React.lazy(() => import('./routes/GuildVipPlannerPage').then(m => ({ default: m.GuildVipPlannerPage })));
const OrnamentsPlannerPage = React.lazy(() => import('./routes/OrnamentsPlannerPage').then(m => ({ default: m.OrnamentsPlannerPage })));
const SoulMapsPlannerPage = React.lazy(() => import('./routes/SoulMapsPlannerPage').then(m => ({ default: m.SoulMapsPlannerPage })));
const BlackMarketPage = React.lazy(() => import('./routes/BlackMarketPage').then(m => ({ default: m.BlackMarketPage })));
const BeastSoulsPlannerPage = React.lazy(() => import('./routes/BeastSoulsPlannerPage').then(m => ({ default: m.BeastSoulsPlannerPage })));
const ShrineSimulatorPage = React.lazy(() => import('./routes/ShrineSimulatorPage').then(m => ({ default: m.ShrineSimulatorPage })));
const MilitaryPage = React.lazy(() => import('./routes/MilitaryPage').then(m => ({ default: m.MilitaryPage })));
const CullingPage = React.lazy(() => import('./routes/CullingPage').then(m => ({ default: m.CullingPage })));
const ForgePlannerPage = React.lazy(() => import('./routes/ForgePlannerPage').then(m => ({ default: m.ForgePlannerPage })));
const NightmareRealmsPage = React.lazy(() => import('./routes/NightmareRealmsPage').then(m => ({ default: m.NightmareRealmsPage })));
const SevenSoulsPage = React.lazy(() => import('./routes/SevenSoulsPage').then(m => ({ default: m.SevenSoulsPage })));
const SoulHunterPage = React.lazy(() => import('./routes/SoulHunterPage').then(m => ({ default: m.SoulHunterPage })));
const WardrobePage = React.lazy(() => import('./routes/WardrobePage').then(m => ({ default: m.WardrobePage })));
const TalentsPage = React.lazy(() => import('./routes/TalentsPage').then(m => ({ default: m.TalentsPage })));
const LuckyWheelPage = React.lazy(() => import('./routes/LuckyWheelPage').then(m => ({ default: m.LuckyWheelPage })));
const FightReportPage = React.lazy(() => import('./routes/FightReportPage').then(m => ({ default: m.FightReportPage })));


function App() {
  return (
    <BrowserRouter>
      <Layout>
        <React.Suspense fallback={<LoadingState message="Loading page components…" />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/calendar/schedules" element={<PromotionSchedulerPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/heroes" element={<HeroesPage />} />
            <Route path="/heroes/compare" element={<HeroComparisonPage />} />
            <Route path="/heroes/sounds" element={<HeroSfxPage />} />
            <Route path="/heroes/stats" element={<StatCurveAnalyticsPage />} />
            <Route path="/heroes/:id" element={<HeroDetailPage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/articles/farming" element={<FarmingPlannerPage />} />
            <Route path="/articles/:id" element={<ArticleDetailPage />} />
            <Route path="/weapons/evolution" element={<ZanpakutoEvolutionPage />} />
            <Route path="/weapons/stats" element={<ZanpakutoStatsPage />} />
            <Route path="/story-quests" element={<StoryQuestsPage />} />
            <Route path="/story-quests/tree" element={<QuestChainPage />} />
            <Route path="/story-quests/:id" element={<StoryQuestDetailPage />} />
            <Route path="/daily-quests" element={<DailyQuestsPage />} />
            <Route path="/daily-quests/:id" element={<DailyQuestDetailPage />} />
            <Route path="/cities" element={<CitiesPage />} />
            <Route path="/cities/map" element={<WorldMapPage />} />
            <Route path="/cities/:id" element={<CityDetailPage />} />
            <Route path="/stages" element={<StagesPage />} />
            <Route path="/stages/:id" element={<StageDetailPage />} />
            <Route path="/mall-items" element={<MallItemsPage />} />
            <Route path="/mall-items/:id" element={<MallItemDetailPage />} />
            <Route path="/mall/analytics" element={<MallAnalyticsPage />} />
            <Route path="/promotions" element={<PromotionsPage />} />
            <Route path="/promotions/:id" element={<PromotionDetailPage />} />
            {/* Formation & Team Tools */}
            <Route path="/tools/formation" element={<FormationBuilderPage />} />
            <Route path="/tools/counters" element={<ProfessionCounterPage />} />
            <Route path="/tools/synergy" element={<SynergyGraphPage />} />
            <Route path="/tools/tier-heatmap" element={<TierHeatmapPage />} />
            <Route path="/tools/skills" element={<SkillHandbookPage />} />
            <Route path="/tools/bond-optimizer" element={<BondOptimizerPage />} />
            <Route path="/tools/vip-planner" element={<VipPlannerPage />} />
            <Route path="/tools/combat-simulator" element={<CombatSimulatorPage />} />
            <Route path="/tools/campaign-roadmap" element={<CampaignRoadmapPage />} />
            <Route path="/tools/dating" element={<HomeDatingPage />} />
            <Route path="/tools/equipment" element={<EquipmentSuitePage />} />
            <Route path="/tools/awakening" element={<AwakeningConsolePage />} />
            <Route path="/tools/pets" element={<PetSanctuaryPage />} />
            <Route path="/tools/achievements" element={<AchievementTitlePage />} />
            <Route path="/tools/shops" element={<GachaShopsPage />} />
            <Route path="/tools/academy" element={<AcademyRelicsPage />} />
            <Route path="/tools/loot-oracle" element={<LootTableOraclePage />} />
            <Route path="/tools/pve-campaign" element={<PveEncounterPage />} />
            <Route path="/tools/guild-vip" element={<GuildVipPlannerPage />} />
            <Route path="/tools/ornaments" element={<OrnamentsPlannerPage />} />
            <Route path="/tools/soul-maps" element={<SoulMapsPlannerPage />} />
            <Route path="/tools/black-market" element={<BlackMarketPage />} />
            <Route path="/tools/beast-souls" element={<BeastSoulsPlannerPage />} />
            <Route path="/tools/shrine-simulator" element={<ShrineSimulatorPage />} />
            <Route path="/tools/military" element={<MilitaryPage />} />
            <Route path="/tools/culling-tower" element={<CullingPage />} />
            <Route path="/tools/forge-planner" element={<ForgePlannerPage />} />
            <Route path="/tools/nightmare-realms" element={<NightmareRealmsPage />} />
            <Route path="/tools/seven-souls" element={<SevenSoulsPage />} />
            <Route path="/tools/soul-hunter" element={<SoulHunterPage />} />
            <Route path="/tools/wardrobe" element={<WardrobePage />} />
            <Route path="/tools/talents" element={<TalentsPage />} />
            <Route path="/tools/lucky-wheel" element={<LuckyWheelPage />} />
            <Route path="/tools/fight-report" element={<FightReportPage />} />
          </Routes>
        </React.Suspense>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
