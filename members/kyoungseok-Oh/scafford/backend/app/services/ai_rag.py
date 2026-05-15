import json
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import get_settings
from app.models.schemas import Region
from app.services.recommender import calculate_final_score, normalize_dict

CATEGORY_LABELS = {
    "traffic": {"ko": "교통", "en": "Traffic"},
    "culture": {"ko": "문화·여가·디지털", "en": "Culture, Leisure & Digital"},
    "convenience": {"ko": "생활편의", "en": "Daily Convenience"},
    "safety": {"ko": "안전", "en": "Safety"},
    "nature": {"ko": "자연", "en": "Nature"},
}

CATEGORY_MEANINGS = {
    "traffic": {
        "ko": "대중교통 접근성, 지역 간 이동 편의성, 장기체류 중 이동 계획에 영향을 주는 지표입니다.",
        "en": "This reflects public transportation access and mobility for long-stay planning.",
    },
    "culture": {
        "ko": "관광숙박, 문화시설, 도시공원, 공공 와이파이, 5G 품질 등 체류 중 활동성과 디지털 편의에 영향을 주는 지표입니다.",
        "en": "This reflects accommodation, cultural facilities, parks, public Wi-Fi, and digital connectivity.",
    },
    "convenience": {
        "ko": "병원, 약국, 행정민원시설 등 일상생활 기반 시설 접근성에 영향을 주는 지표입니다.",
        "en": "This reflects access to hospitals, pharmacies, and public-service facilities.",
    },
    "safety": {
        "ko": "지역안전지수 등 체류 중 안전 체감과 관련된 지표입니다.",
        "en": "This reflects safety-related conditions such as regional safety indicators.",
    },
    "nature": {
        "ko": "녹지, 기후, 대기환경 등 장기체류의 쾌적성과 휴식 경험에 영향을 주는 지표입니다.",
        "en": "This reflects green space, climate, and environmental comfort for long stays.",
    },
}

PRESET_LABELS = {
    "default": {
        "ko": "표준 체류형",
        "en": "Standard Stay",
        "description_ko": "생활편의, 문화·여가·디지털, 안전, 교통, 자연을 균형 있게 고려하는 기본 체류 유형입니다.",
        "description_en": "A balanced stay type considering convenience, culture/leisure/digital, safety, transportation, and nature.",
    },
    "foreign_tourist": {
        "ko": "해외 관광객",
        "en": "Foreign Tourist",
        "description_ko": "관광숙박, 문화시설, 공공 와이파이, 교통 접근성, 안전성을 중요하게 보는 체류 유형입니다.",
        "description_en": "A stay type focused on accommodation, cultural facilities, public Wi-Fi, transportation access, and safety.",
    },
    "remote_worker": {
        "ko": "디지털 노마드",
        "en": "Digital Nomad",
        "description_ko": "공공 와이파이, 5G 통신 품질, 생활편의, 업무와 휴식의 균형을 중요하게 보는 체류 유형입니다.",
        "description_en": "A stay type focused on public Wi-Fi, 5G quality, daily convenience, and work-life balance.",
    },
    "digital_nomad": {
        "ko": "디지털 노마드",
        "en": "Digital Nomad",
        "description_ko": "공공 와이파이, 5G 통신 품질, 생활편의, 업무와 휴식의 균형을 중요하게 보는 체류 유형입니다.",
        "description_en": "A stay type focused on public Wi-Fi, 5G quality, daily convenience, and work-life balance.",
    },
    "active_senior": {
        "ko": "액티브 시니어",
        "en": "Active Senior",
        "description_ko": "의료 접근성, 안전, 생활편의, 자연환경과 문화 활동을 중요하게 보는 체류 유형입니다.",
        "description_en": "A stay type focused on medical access, safety, daily convenience, nature, and cultural activity.",
    },
    "senior_traveler": {
        "ko": "액티브 시니어",
        "en": "Active Senior",
        "description_ko": "의료 접근성, 안전, 생활편의, 자연환경과 문화 활동을 중요하게 보는 체류 유형입니다.",
        "description_en": "A stay type focused on medical access, safety, daily convenience, nature, and cultural activity.",
    },
    "culture_single_couple": {
        "ko": "나홀로 문화형",
        "en": "Solo Cultural",
        "description_ko": "문화시설, 관광숙박, 도시공원, 공공 와이파이, 도보 생활 편의성을 중요하게 보는 체류 유형입니다.",
        "description_en": "A stay type focused on cultural facilities, accommodation, urban parks, public Wi-Fi, and walkable daily life.",
    },
    "couple_culture": {
        "ko": "나홀로 문화형",
        "en": "Solo Cultural",
        "description_ko": "문화시설, 관광숙박, 도시공원, 공공 와이파이, 도보 생활 편의성을 중요하게 보는 체류 유형입니다.",
        "description_en": "A stay type focused on cultural facilities, accommodation, urban parks, public Wi-Fi, and walkable daily life.",
    },
}


def _lang(value: Dict[str, str], language: str) -> str:
    return value.get("en" if language == "en" else "ko", value.get("ko", ""))


def _region_name(region: Region, language: str) -> str:
    if language == "en":
        return region.region_name_en or region.region_name_ko
    parent = region.parent_region_name_ko or ""
    name = region.region_name_ko
    if parent and parent not in name:
        return f"{parent} {name}".strip()
    return name


def _sorted_categories(region: Region) -> List[Dict[str, Any]]:
    items = []
    for key, score in region.categoryScores.items():
        items.append({"key": key, "score": round(float(score), 1)})
    return sorted(items, key=lambda item: item["score"], reverse=True)


def _important_weights(weights: Dict[str, float]) -> List[Dict[str, Any]]:
    return sorted(
        [{"key": key, "weight": round(float(value), 6)} for key, value in weights.items()],
        key=lambda item: item["weight"],
        reverse=True,
    )


def _top_metrics(region: Region, limit: int = 8) -> List[Dict[str, Any]]:
    metrics = []
    for metric in region.metrics:
        metrics.append(
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
        )
    return sorted(metrics, key=lambda item: item["score_100"], reverse=True)[:limit]


def build_region_rag_context(
    region: Region,
    weights: Dict[str, float],
    language: str,
    preset_id: str | None = "default",
) -> Dict[str, Any]:
    normalized_weights = normalize_dict(weights)
    preset_key = preset_id or "default"
    preset_info = PRESET_LABELS.get(preset_key, PRESET_LABELS["default"])
    final_score = calculate_final_score(region, normalized_weights)
    top_categories = _sorted_categories(region)[:3]
    weak_categories = _sorted_categories(region)[-2:]
    top_metrics = _top_metrics(region)

    evidence_items: List[Dict[str, Any]] = []
    for item in top_categories:
        key = item["key"]
        evidence_items.append(
            {
                "type": "category_score",
                "title": _lang(CATEGORY_LABELS.get(key, {"ko": key, "en": key}), language),
                "value": item["score"],
                "content": _lang(CATEGORY_MEANINGS.get(key, {"ko": "", "en": ""}), language),
            }
        )

    for metric in top_metrics[:6]:
        evidence_items.append(
            {
                "type": "metric",
                "title": metric["name_en"] if language == "en" else metric["name_ko"],
                "category": metric["category"],
                "value": metric["score_100"],
                "content": f"{metric['raw_value']} {metric['unit']}",
                "source": metric["source"],
                "year": metric["year"],
            }
        )

    return {
        "language": language,
        "preset": {
            "preset_id": preset_key,
            "name": preset_info["en"] if language == "en" else preset_info["ko"],
            "description": preset_info["description_en"] if language == "en" else preset_info["description_ko"],
        },
        "region": {
            "id": region.region_id,
            "name": _region_name(region, language),
            "name_ko": region.region_name_ko,
            "name_en": region.region_name_en,
            "level": region.region_level,
            "parent_name_ko": region.parent_region_name_ko,
        },
        "weights": normalized_weights,
        "final_score": final_score,
        "category_scores": region.categoryScores,
        "top_categories": top_categories,
        "weak_categories": weak_categories,
        "important_weights": _important_weights(normalized_weights),
        "top_metrics": top_metrics,
        "tourist_spots": [spot.model_dump() for spot in region.tourist_spots[:3]],
        "evidence_items": evidence_items,
    }


def _build_prompt(context: Dict[str, Any]) -> List[Dict[str, str]]:
    language = context.get("language", "ko")
    context_text = json.dumps(context, ensure_ascii=False, indent=2)

    if language == "en":
        system_prompt = """
You are MEOMUM's RAG-based long-stay region recommendation explanation AI.
Use only the provided RAG Context. Do not invent scores, rankings, indicators, sources, or attractions.
Explain the result from the selected preset and current weight perspective.
Return only a JSON object. Do not use markdown code blocks.

JSON format:
{
  "title": "Why this region was recommended",
  "preset_perspective": "Explain why this region fits the selected preset perspective.",
  "score_contribution": "Explain how category weights, category scores, and detailed indicators contributed to the final score.",
  "integrated_summary": "Summarize strengths, cautions, and overall suitability for a long stay.",
  "notice": "This is a relative recommendation based on available public data, not an absolute evaluation of the region."
}

Rules:
- preset_perspective must use preset.name and preset.description.
- score_contribution must connect important_weights, category_scores, and top_metrics.
- integrated_summary must mention both strengths and relatively weaker categories when available.
- Each field should be a natural paragraph of 2 to 4 sentences.
"""
        user_prompt = f"""
Below is the RAG Context for explaining a MEOMUM recommendation result.
Use the preset information when writing preset_perspective.

RAG Context:
{context_text}
"""
    else:
        system_prompt = """
너는 MEOMUM의 RAG 기반 장기체류 지역 추천 해설 AI이다.
반드시 제공된 RAG Context 안의 데이터만 근거로 사용한다.
새로운 점수, 순위, 지표, 출처, 관광지를 임의로 만들지 않는다.
답변은 사용자가 선택한 프리셋과 현재 가중치 관점에서 해석한다.
응답은 반드시 JSON 객체로만 작성한다. 마크다운 코드블럭은 사용하지 않는다.

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
- score_contribution 항목에서는 important_weights, category_scores, top_metrics를 연결해서 설명한다.
- integrated_summary 항목에서는 강점과 상대적으로 낮은 항목을 함께 설명한다.
- 각 항목은 2~4문장 정도의 자연스러운 문단으로 작성한다.
"""
        user_prompt = f"""
아래는 MEOMUM 추천 결과를 설명하기 위한 RAG Context이다.
특히 preset 정보를 반드시 반영해서 preset_perspective를 작성하라.

RAG Context:
{context_text}
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
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
    except Exception:
        return None


def _fallback_explanation(context: Dict[str, Any]) -> Dict[str, str]:
    language = context.get("language", "ko")
    region = context.get("region", {})
    preset = context.get("preset", {})
    top_categories = context.get("top_categories", [])
    weak_categories = context.get("weak_categories", [])
    region_name = region.get("name") or region.get("name_ko") or "선택 지역"
    preset_name = preset.get("name") or "표준 체류형"
    preset_description = preset.get("description") or "현재 가중치를 기준으로 지역을 평가합니다."

    def category_label(item: Dict[str, Any]) -> str:
        key = item.get("key", "")
        return _lang(CATEGORY_LABELS.get(key, {"ko": key, "en": key}), language)

    if language == "en":
        strong = ", ".join(f"{category_label(item)} {item.get('score')}" for item in top_categories[:2]) or "major categories"
        weak = ", ".join(category_label(item) for item in weak_categories[:1]) or "some indicators"
        return {
            "title": f"Why {region_name} was recommended",
            "preset_perspective": f"From the {preset_name} perspective, {preset_description} Based on the current weights, {region_name} shows suitability as a long-stay candidate.",
            "score_contribution": f"The final score reflects the selected weights and relative category scores. Strong areas such as {strong} contributed positively to the recommendation.",
            "integrated_summary": f"{region_name} has clear strengths under the current recommendation conditions. However, relatively weaker areas such as {weak} should be reviewed before making a final stay decision.",
            "notice": "This is a relative recommendation based on available public data, not an absolute evaluation of the region.",
        }

    strong = ", ".join(f"{category_label(item)} {item.get('score')}점" for item in top_categories[:2]) or "주요 카테고리"
    weak = ", ".join(category_label(item) for item in weak_categories[:1]) or "일부 지표"
    return {
        "title": f"{region_name} 추천 이유",
        "preset_perspective": f"{preset_name} 관점에서는 {preset_description} {region_name}은 현재 가중치 기준에서 해당 체류 목적에 부합하는 후보지로 해석할 수 있습니다.",
        "score_contribution": f"최종 점수에는 사용자가 설정한 가중치와 지역별 카테고리 상대점수가 함께 반영되었습니다. 특히 {strong} 항목이 추천 결과에 긍정적으로 작용했습니다.",
        "integrated_summary": f"{region_name}은 현재 조건에서 장기체류 후보지로 검토할 만한 지역입니다. 다만 {weak} 항목은 상대적으로 낮을 수 있으므로 실제 선택 전 이동 계획이나 생활 조건을 함께 확인하는 것이 좋습니다.",
        "notice": "이 결과는 사용 가능한 공공데이터 기반 상대 추천이며, 해당 지역에 대한 절대 평가가 아닙니다.",
    }


async def explain_region(
    repo,
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
