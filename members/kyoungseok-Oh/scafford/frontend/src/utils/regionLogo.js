const LOGO_EXTENSION = {
  Seoul: 'svg',
  Busan: 'svg',
  Daegu: 'svg',
  Incheon: 'svg',
  Gwangju: 'png',
  Daejeon: 'png',
  Ulsan: 'png',
  Sejong: 'png',
  Gyeonggi: 'svg',
  Gangwon: 'png',
  Chungcheongbuk: 'svg',
  Chungcheongnam: 'svg',
  Jeonbuk: 'svg',
  Jeollanam: 'svg',
  Gyeongsangbuk: 'svg',
  Gyeongsangnam: 'svg',
  Jeju: 'png'
};

export function getRegionLogoUrl(parentLogoKey) {
  const key = parentLogoKey || 'Seoul';
  const ext = LOGO_EXTENSION[key] || 'png';
  return `/assets/region_logo/${key}.${ext}`;
}
