const REGION_POINT_OVERRIDES = {
  'seoul-jongno': { x: 38.6, y: 16.2 },
  'incheon-jung': { x: 30.2, y: 19.2 },
  'gyeonggi-suwon': { x: 41.8, y: 24.6 },
  'gangwon-gangneung': { x: 71.2, y: 20.6 },
  'daejeon-yuseong': { x: 46.0, y: 37.4 },
  'jeonbuk-jeonju': { x: 43.6, y: 49.2 },
  'gyeongbuk-gyeongju': { x: 73.8, y: 49.8 },
  'busan-haeundae': { x: 82.0, y: 57.4 },
  'jeonnam-yeosu': { x: 52.8, y: 65.8 },
  'jeju-jeju': { x: 22.6, y: 89.0 }
};

const LABEL_OFFSETS = {
  'seoul-jongno': { dx: -92, dy: -50, align: 'right' },
  'incheon-jung': { dx: -102, dy: -8, align: 'right' },
  'gyeonggi-suwon': { dx: 28, dy: -44, align: 'left' },
  'gangwon-gangneung': { dx: 28, dy: -38, align: 'left' },
  'daejeon-yuseong': { dx: 28, dy: 28, align: 'left' },
  'jeonbuk-jeonju': { dx: -110, dy: -16, align: 'right' },
  'gyeongbuk-gyeongju': { dx: 30, dy: 30, align: 'left' },
  'busan-haeundae': { dx: 30, dy: -4, align: 'left' },
  'jeonnam-yeosu': { dx: 28, dy: 30, align: 'left' },
  'jeju-jeju': { dx: 28, dy: -14, align: 'left' }
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function projectFromLatLng(latitude, longitude) {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);
  if (lat === null || lng === null) return null;

  // 제주도는 본 지도 이미지에서 별도 인셋으로 배치되어 있어 본토 투영과 분리한다.
  if (lat < 34.2 && lng >= 126.0 && lng <= 127.2) {
    return {
      x: clamp(14 + ((lng - 126.0) / 1.2) * 19, 12, 34),
      y: clamp(86 + ((34.05 - lat) / 0.95) * 10, 84, 96)
    };
  }

  // korea-map.png의 3D 원근/회전 배치에 맞춘 프론트 표시용 근사 투영식.
  const x = 27 + ((lng - 126.1) / 3.5) * 56 + (36.1 - lat) * 1.2;
  const y = 9 + ((38.4 - lat) / 3.9) * 54 + (lng - 127.5) * 0.55;

  return {
    x: clamp(x, 12, 88),
    y: clamp(y, 8, 76)
  };
}

export function resolveMapPosition(item) {
  if (!item) return { x: 50, y: 50 };
  const override = REGION_POINT_OVERRIDES[item.region_id];
  if (override) return override;

  const projected = projectFromLatLng(item.latitude, item.longitude);
  if (projected) return projected;

  return {
    x: clamp(toNumber(item.mapX) ?? toNumber(item.map_x) ?? 50, 0, 100),
    y: clamp(toNumber(item.mapY) ?? toNumber(item.map_y) ?? 50, 0, 100)
  };
}

export function resolveLabelOffset(item, index = 0) {
  const preset = LABEL_OFFSETS[item?.region_id];
  if (preset) return preset;

  const fallbackOffsets = [
    { dx: 28, dy: -38, align: 'left' },
    { dx: 28, dy: 30, align: 'left' },
    { dx: -108, dy: -12, align: 'right' },
    { dx: -108, dy: 28, align: 'right' },
    { dx: 28, dy: -2, align: 'left' }
  ];
  return fallbackOffsets[index % fallbackOffsets.length];
}
