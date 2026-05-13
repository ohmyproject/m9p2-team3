from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import get_settings
from app.models.schemas import Region
from app.services.recommender import calculate_final_score, normalize_dict
from app.services.repository import RegionRepository

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


def build_region_rag_context(region: Region, weights: Dict[str, float], language: str = "ko") -> Dict[str, Any]:
    normalized_weights = normalize_dict(weights)
    final_score = calculate_final_score(region, normalized_weights)
    top_categories = _top_categories(region)
    weak_categories = _weak_categories(region)
    top_metrics = _top_metrics(region)
    important_weights = _important_weights(normalized_weights)

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
    output_language = "English" if language == "en" else "Korean"
    system = (
        "You are MEOMUM's RAG-based recommendation explainer. "
        "Use only the provided context. Do not invent scores, sources, rankings, or facts. "
        "Explain why the selected region was recommended for a long-stay user. "
        "Avoid absolute claims such as safest, best, or guaranteed. "
        "Return valid JSON only with keys: title, summary, key_reasons, insights, metric_basis, notice. "
        f"Write in {output_language}."
    )
    user = json.dumps(context, ensure_ascii=False, indent=2)
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


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


async def explain_region(repo: RegionRepository, region_id: str, weights: Dict[str, float], language: str = "ko") -> Dict[str, Any]:
    region = await repo.get_region(region_id)
    if not region:
        raise ValueError("REGION_NOT_FOUND")
    context = build_region_rag_context(region, weights, language)
    generated = await _call_openai(context)
    is_fallback = generated is None
    explanation = generated or _fallback_explanation(context)
    return {"explanation": explanation, "rag_context": context, "is_fallback": is_fallback}


async def compare_regions(repo: RegionRepository, region_ids: List[str], weights: Dict[str, float], language: str = "ko") -> Dict[str, Any]:
    if len(region_ids) < 2:
        raise ValueError("AT_LEAST_TWO_REGIONS_REQUIRED")
    regions = []
    for region_id in region_ids[:3]:
        region = await repo.get_region(region_id)
        if not region:
            raise ValueError("REGION_NOT_FOUND")
        regions.append(region)

    contexts = [build_region_rag_context(region, weights, language) for region in regions]
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
