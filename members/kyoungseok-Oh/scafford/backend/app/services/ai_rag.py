from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import get_settings
from app.models.schemas import Region
from app.services.recommender import calculate_final_score, normalize_dict
from app.services.repository import RegionRepository

PRESET_LABELS = {
    "default": {
        "ko": "표준 체류형",
        "en": "Standard Stay",
        "description_ko": "생활편의, 문화·여가·디지털, 안전, 교통, 자연을 균형 있게 고려하는 기본 체류 유형입니다.",
        "description_en": "A balanced stay type that considers convenience, culture/leisure/digital, safety, transportation, and nature.",
    },
    "foreign_tourist": {
        "ko": "해외 관광객",
        "en": "Foreign Tourist",
        "description_ko": "관광숙박, 문화시설, 공공 와이파이, 교통 접근성, 안전성을 중요하게 보는 체류 유형입니다.",
        "description_en": "A stay type focused on accommodation, cultural facilities, public Wi-Fi, transportation access, and safety.",
    },
    "digital_nomad": {
        "ko": "디지털 노마드",
        "en": "Digital Nomad",
        "description_ko": "공공 와이파이, 5G 통신 품질, 생활편의, 업무와 휴식의 균형을 중요하게 보는 체류 유형입니다.",
        "description_en": "A stay type focused on public Wi-Fi, 5G quality, daily convenience, and a balance between work and leisure.",
    },
    "senior_traveler": {
        "ko": "액티브 시니어",
        "en": "Active Senior",
        "description_ko": "의료 접근성, 약국, 안전, 생활편의, 자연환경을 중요하게 보는 체류 유형입니다.",
        "description_en": "A stay type focused on medical access, pharmacies, safety, daily convenience, and nature.",
    },
    "couple_culture": {
        "ko": "나홀로 문화형",
        "en": "Solo Cultural",
        "description_ko": "문화시설, 관광숙박, 도시공원, 공공 와이파이, 도보 생활 편의성을 중요하게 보는 체류 유형입니다.",
        "description_en": "A stay type focused on cultural facilities, accommodation, urban parks, public Wi-Fi, and walkable daily life.",
    },
}

CATEGORY_LABELS = {
    "traffic": {"ko": "교통", "en": "Traffic"},
    "culture": {"ko": "문화·여가·디지털", "en": "Culture, Leisure & Digital"},
    "convenience": {"ko": "생활편의", "en": "Convenience"},
    "safety": {"ko": "안전", "en": "Safety"},
    "nature": {"ko": "자연", "en": "Nature"},
}

CATEGORY_MEANINGS = {
    "traffic": {
        "ko": "버스·철도 등 이동 접근성이 장기체류 중 생활권 이동에 주는 영향을 설명합니다.",
        "en": "Transportation access such as buses and rail affects everyday mobility during a long stay.",
    },
    "culture": {
        "ko": "숙박, 문화시설, 디지털 인프라 등 체류 중 활동성과 편의성을 높이는 요소입니다.",
        "en": "Accommodation, cultural facilities, and digital infrastructure support activity and convenience during a stay.",
    },
    "convenience": {
        "ko": "병원, 약국, 생활서비스, 행정시설 등 실제 생활에 필요한 인프라를 의미합니다.",
        "en": "Hospitals, pharmacies, everyday services, and public facilities indicate practical living convenience.",
    },
    "safety": {
        "ko": "지역안전 관련 상대점수로 안정적인 체류 환경을 판단하는 데 참고합니다.",
        "en": "Safety-related relative scores help assess how stable the stay environment may be.",
    },
    "nature": {
        "ko": "녹지, 대기환경, 기후 등 쾌적한 체류 경험과 관련된 환경 요소입니다.",
        "en": "Green space, air quality, and climate-related factors influence comfort during a long stay.",
    },
}


def _lang(value: Dict[str, str], language: str) -> str:
    return value.get(language) or value.get("ko") or next(iter(value.values()))


def _top_categories(region: Region, limit: int = 2) -> List[Dict[str, Any]]:
    return [
        {"key": key, "score": round(float(score), 1)}
        for key, score in sorted(region.categoryScores.items(), key=lambda item: item[1], reverse=True)[:limit]
    ]


def _weak_categories(region: Region, limit: int = 1) -> List[Dict[str, Any]]:
    return [
        {"key": key, "score": round(float(score), 1)}
        for key, score in sorted(region.categoryScores.items(), key=lambda item: item[1])[:limit]
    ]


def _top_metrics(region: Region, limit: int = 5) -> List[Dict[str, Any]]:
    return [
        {
            "metric_id": metric.metric_id,
            "name_ko": metric.metric_name_ko,
            "name_en": metric.metric_name_en,
            "category": metric.category,
            "score_100": round(float(metric.score_100), 1),
            "raw_value": metric.raw_value,
            "unit": metric.unit,
            "source": metric.source,
            "year": metric.year,
        }
        for metric in sorted(region.metrics, key=lambda item: item.score_100, reverse=True)[:limit]
    ]


def _important_weights(weights: Dict[str, float], limit: int = 2) -> List[Dict[str, Any]]:
    return [
        {"key": key, "weight": round(float(value), 4)}
        for key, value in sorted(weights.items(), key=lambda item: item[1], reverse=True)[:limit]
    ]


def build_region_rag_context(
    region: Region,
    weights: Dict[str, float],
    language: str,
    preset_id: str | None = "default",
) -> Dict[str, Any]:
    normalized_weights = normalize_dict(weights)
    final_score = calculate_final_score(region, normalized_weights)
    top_categories = _top_categories(region)
    weak_categories = _weak_categories(region)
    top_metrics = _top_metrics(region)
    important_weights = _important_weights(normalized_weights)
    preset_info = PRESET_LABELS.get(preset_id or "default", PRESET_LABELS["default"])

    evidence_items: List[Dict[str, Any]] = []
    for item in top_categories:
        key = item["key"]
        evidence_items.append(
            {
                "type": "category_score",
                "title": _lang(CATEGORY_LABELS[key], language),
                "value": item["score"],
                "content": _lang(CATEGORY_MEANINGS[key], language),
            }
        )

    for metric in top_metrics:
        evidence_items.append(
            {
                "type": "metric",
                "title": metric["name_en"] if language == "en" else metric["name_ko"],
                "value": metric["score_100"],
                "content": f"{metric['raw_value']} {metric['unit']}",
                "source": metric["source"],
                "year": metric["year"],
            }
        )

    return {
        "preset": {
        "preset_id": preset_id or "default",
        "name": preset_info["en"] if language == "en" else preset_info["ko"],
        "description": preset_info["description_en"] if language == "en" else preset_info["description_ko"],
        },
        "region": {
            "id": region.region_id,
            "name_ko": region.region_name_ko,
            "name_en": region.region_name_en,
            "level": region.region_level,
            "parent_name_ko": region.parent_region_name_ko,
        },
        "language": language,
        "weights": normalized_weights,
        "final_score": final_score,
        "category_scores": region.categoryScores,
        "top_categories": top_categories,
        "weak_categories": weak_categories,
        "important_weights": important_weights,
        "top_metrics": top_metrics,
        "tourist_spots": [spot.model_dump() for spot in region.tourist_spots[:3]],
        "evidence_items": evidence_items,
    }


def _fallback_explanation(context: Dict[str, Any]) -> Dict[str, Any]:
    language = context.get("language", "ko")
    region_name = context["region"]["name_en" if language == "en" else "name_ko"]
    final_score = context["final_score"]
    top_categories = context["top_categories"]
    weak_categories = context["weak_categories"]
    top_metrics = context["top_metrics"]
    important_weights = context["important_weights"]

    def label(key: str) -> str:
        return _lang(CATEGORY_LABELS[key], language)

    if language == "en":
        key_reason = ", ".join(f"{label(item['key'])} ({item['score']})" for item in top_categories)
        weight_text = ", ".join(f"{label(item['key'])} {round(item['weight'] * 100)}%" for item in important_weights)
        summary = f"{region_name} has an overall suitability score of {final_score}. It was recommended mainly because {key_reason} scored strongly under the current preference settings."
        strengths = [
            f"{label(item['key'])} is a strong category with a relative score of {item['score']}. {_lang(CATEGORY_MEANINGS[item['key']], language)}"
            for item in top_categories
        ]
        metrics = [
            f"{metric['name_en']} scored {metric['score_100']} based on {metric['source']} ({metric['year']})."
            for metric in top_metrics[:3]
        ]
        caution = (
            f"{label(weak_categories[0]['key'])} is relatively lower at {weak_categories[0]['score']}. The ranking may change if that category becomes more important."
            if weak_categories
            else "There is not enough category data to identify a weaker point."
        )
        insight = f"The current recommendation reflects your selected weights, especially {weight_text}."
        notice = "This is a data-based relative recommendation, not an absolute evaluation of the region."
    else:
        key_reason = ", ".join(f"{label(item['key'])}({item['score']})" for item in top_categories)
        weight_text = ", ".join(f"{label(item['key'])} {round(item['weight'] * 100)}%" for item in important_weights)
        summary = f"{region_name}은 현재 조건에서 종합 적합도 {final_score}점으로 계산되었습니다. 특히 {key_reason} 항목이 높게 나타나 추천 결과에 크게 반영되었습니다."
        strengths = [
            f"{label(item['key'])} 상대점수가 {item['score']}로 높습니다. {_lang(CATEGORY_MEANINGS[item['key']], language)}"
            for item in top_categories
        ]
        metrics = [
            f"{metric['name_ko']} 지표는 상대점수 {metric['score_100']}이며, {metric['source']}({metric['year']}) 데이터를 근거로 합니다."
            for metric in top_metrics[:3]
        ]
        caution = (
            f"{label(weak_categories[0]['key'])} 항목은 {weak_categories[0]['score']}로 상대적으로 낮습니다. 이 항목을 더 중요하게 보면 추천 순위가 달라질 수 있습니다."
            if weak_categories
            else "낮은 항목을 판단할 수 있는 카테고리 데이터가 충분하지 않습니다."
        )
        insight = f"현재 추천은 사용자가 설정한 가중치를 반영하며, 영향이 큰 항목은 {weight_text}입니다."
        notice = "이 설명은 공공데이터 기반 상대 추천 결과이며, 지역에 대한 절대 평가가 아닙니다."

    return {
        "title": f"Why {region_name} was recommended" if language == "en" else f"{region_name} 추천 근거",
        "summary": summary,
        "key_reasons": strengths,
        "insights": [insight, caution],
        "metric_basis": metrics,
        "notice": notice,
    }


def _build_prompt(context: Dict[str, Any]) -> List[Dict[str, str]]:
    language = context.get("language", "ko")

    if language == "en":
        system_prompt = """
You are MEOMUM's RAG-based long-term stay recommendation explanation AI.

Use only the provided RAG Context.
Do not invent scores, rankings, indicators, or sources.
Explain the result from the selected preset and user-weight perspective.
Do not describe the region as absolutely good or bad. Use expressions such as "based on the current weights", "relative score", and "public-data-based recommendation".

Return only a JSON object.
Do not use markdown code blocks.

JSON format:
{
  "title": "Why this region was recommended",
  "preset_perspective": "Explain why this region fits the selected preset or user preference perspective.",
  "score_contribution": "Explain how category weights and detailed indicators contributed to the final score.",
  "integrated_summary": "Summarize strengths, cautions, and overall suitability for long-term stay.",
  "notice": "This is a relative recommendation based on available public data, not an absolute evaluation of the region."
}

Rules:
- preset_perspective must use preset.name and preset.description from the RAG Context.
- score_contribution must connect high-weight categories, category scores, and detailed indicators.
- integrated_summary must include both strengths and relatively weaker points.
- Each field should be written as a natural paragraph of 2 to 4 sentences.
"""
        user_prompt = f"""
Below is the RAG Context for explaining a MEOMUM recommendation result.
Use the preset information when writing preset_perspective.

RAG Context:
{json.dumps(context, ensure_ascii=False, indent=2)}
"""
    else:
        system_prompt = """
너는 MEOMUM의 RAG 기반 장기체류 지역 추천 해설 AI이다.

반드시 제공된 RAG Context 안의 데이터만 근거로 사용한다.
새로운 점수, 순위, 지표, 출처를 임의로 만들지 않는다.
답변은 사용자가 선택한 프리셋과 가중치 관점에서 해석한다.
지역에 대한 절대 평가처럼 말하지 말고, '현재 가중치 기준', '상대점수 기준', '공공데이터 기반'이라는 표현을 사용한다.

응답은 반드시 JSON 객체로만 작성한다.
마크다운 코드블럭은 사용하지 않는다.

JSON 형식:
{
  "title": "지역명 추천 이유",
  "preset_perspective": "프리셋 선택 관점에서 이 지역이 왜 적합한지 설명",
  "score_contribution": "가중치와 세부 지표가 최종 점수에 어떻게 기여했는지 설명",
  "integrated_summary": "강점, 주의점, 장기체류 관점의 최종 의견을 종합적으로 설명",
  "notice": "이 결과는 사용 가능한 공공데이터 기반 상대 추천이며, 해당 지역에 대한 절대 평가가 아닙니다."
}

작성 규칙:
- preset_perspective 항목에서는 반드시 RAG Context의 preset.name과 preset.description을 반영한다.
- score_contribution 항목에서는 높은 가중치 항목, 카테고리 상대점수, 세부 지표를 연결해서 설명한다.
- integrated_summary 항목에서는 강점과 상대적으로 낮은 항목을 함께 설명한다.
- 각 항목은 2~4문장 정도의 자연스러운 문단으로 작성한다.

예시 문체:
- 디지털 노마드 관점에서는 공공 와이파이, 5G 통신 품질, 생활편의 지표가 중요합니다. 현재 추천 지역은 통신 접근성과 생활 인프라가 양호해 원격근무 체류지로 적합합니다.
- 생활편의 가중치가 높게 설정되어 병원 접근성, 약국 접근성, 행정민원시설 접근성이 최종 점수에 크게 반영되었습니다.
- 다만 교통 접근성은 상대적으로 낮으므로 이동 계획을 미리 세우는 것이 좋습니다.
"""
        user_prompt = f"""
아래는 MEOMUM 추천 결과를 설명하기 위한 RAG Context이다.
특히 preset 정보를 반드시 반영해서 preset_perspective를 작성하라.

RAG Context:
{json.dumps(context, ensure_ascii=False, indent=2)}
"""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


async def _call_openai(context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    settings = get_settings()
    if not settings.openai_api_key:
        return None

    payload = {
        "model": settings.openai_model,
        "messages": _build_prompt(context),
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
    except Exception:
        return None


async def explain_region(
    repo: RegionRepository,
    region_id: str,
    weights: Dict[str, float],
    language: str = "ko",
    preset_id: str | None = "default",
) -> Dict[str, Any]:
    region = await repo.get_region(region_id)
    if not region:
        raise ValueError("REGION_NOT_FOUND")

    context = build_region_rag_context(region, weights, language, preset_id)

    generated = await _call_openai(context)
    is_fallback = generated is None
    explanation = generated or _fallback_explanation(context)

    return {
        "explanation": explanation,
        "rag_context": context,
        "is_fallback": is_fallback,
    }


async def compare_regions(
    repo: RegionRepository,
    region_ids: List[str],
    weights: Dict[str, float],
    language: str = "ko",
    preset_id: str | None = "default",
) -> Dict[str, Any]:
    if len(region_ids) < 2:
        raise ValueError("AT_LEAST_TWO_REGIONS_REQUIRED")
    regions = []
    for region_id in region_ids[:3]:
        region = await repo.get_region(region_id)
        if not region:
            raise ValueError("REGION_NOT_FOUND")
        regions.append(region)

    contexts = [build_region_rag_context(region, weights, language, preset_id) for region in regions]
    sorted_contexts = sorted(contexts, key=lambda item: item["final_score"], reverse=True)

    if language == "en":
        names = [item["region"]["name_en"] for item in sorted_contexts]
        summary = f"Based on the current weights, {names[0]} is slightly more suitable than {', '.join(names[1:])}."
        recommendation = "Use this comparison as a relative data-based guide, and check detailed indicators before making a final decision."
    else:
        names = [item["region"]["name_ko"] for item in sorted_contexts]
        summary = f"현재 가중치 기준으로는 {names[0]}이(가) {', '.join(names[1:])}보다 종합 적합도에서 더 높게 나타났습니다."
        recommendation = "이 비교는 공공데이터 기반 상대 비교이므로, 최종 선택 전 세부 지표와 출처를 함께 확인하는 것이 좋습니다."

    return {
        "summary": summary,
        "regions": contexts,
        "recommendation": recommendation,
        "is_fallback": True,
    }
