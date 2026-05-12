import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPresets } from '../api/presets';
import { postRecommendations } from '../api/recommendations';
import { fetchRegionDetail, fetchScores } from '../api/regions';
import { fetchLatestDataVersion } from '../api/dataVersion';
import { normalizeWeights, toSliderWeights } from '../utils/normalize';
import { parseShareParams } from '../utils/share';

const DEFAULT_WEIGHTS = {
  traffic: 15,
  culture: 25,
  convenience: 28,
  safety: 17,
  nature: 15
};

export function useAppState() {
  const share = useMemo(() => parseShareParams(), []);
  const [viewMode, setViewMode] = useState(share?.viewMode || 'simple');
  const [isSeniorMode, setIsSeniorMode] = useState(Boolean(share?.isSeniorMode));
  const [language, setLanguage] = useState(share?.language || 'ko');
  const [weights, setWeights] = useState(share?.weights || DEFAULT_WEIGHTS);
  const [selectedPreset, setSelectedPreset] = useState(share?.presetId || 'default');
  const [presets, setPresets] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [scores, setScores] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [heatmapCategory, setHeatmapCategory] = useState('culture');
  const [dataVersion, setDataVersion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.allSettled([fetchPresets(), fetchScores('sigungu'), fetchLatestDataVersion()]).then(results => {
      if (results[0].status === 'fulfilled') setPresets(results[0].value);
      if (results[1].status === 'fulfilled') setScores(results[1].value);
      if (results[2].status === 'fulfilled') setDataVersion(results[2].value);
    });
  }, []);

  const runRecommendation = useCallback(async (nextWeights = weights, presetId = selectedPreset) => {
    setIsLoading(true);
    setError(null);
    try {
      const normalized = normalizeWeights(nextWeights);
      const data = await postRecommendations({
        preset_id: presetId,
        weights: normalized,
        limit: 5,
        region_level: 'sigungu',
        language
      });
      setRecommendations(data.recommendations || []);
      setDataVersion(current => current || { version: data.dataVersion });
      return data.recommendations || [];
    } catch (err) {
      setError(err.message || '추천 결과를 불러오지 못했습니다.');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [weights, selectedPreset, language]);

  useEffect(() => {
    runRecommendation(weights, selectedPreset);
    // 최초 복원 및 언어 변경에 따라 결과 문장 업데이트
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const selectPreset = useCallback((preset) => {
    setSelectedPreset(preset.preset_id);
    const slider = toSliderWeights(preset.weights);
    setWeights(slider);
  }, []);

  const resetWeights = useCallback(() => {
    setSelectedPreset('default');
    setWeights(DEFAULT_WEIGHTS);
  }, []);

  const openRegion = useCallback(async (regionId) => {
    if (!regionId) return;
    setIsDetailLoading(true);
    setError(null);
    try {
      const detail = await fetchRegionDetail(regionId);
      setSelectedRegion(detail);
    } catch (err) {
      setError(err.message || '지역 상세 정보를 불러오지 못했습니다.');
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  return {
    viewMode,
    setViewMode,
    isSeniorMode,
    setIsSeniorMode,
    language,
    setLanguage,
    weights,
    setWeights,
    selectedPreset,
    setSelectedPreset,
    presets,
    recommendations,
    scores,
    selectedRegion,
    setSelectedRegion,
    heatmapCategory,
    setHeatmapCategory,
    dataVersion,
    isLoading,
    isDetailLoading,
    error,
    setError,
    runRecommendation,
    selectPreset,
    resetWeights,
    openRegion
  };
}
