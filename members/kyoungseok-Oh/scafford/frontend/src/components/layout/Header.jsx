export function Header({ language, setLanguage, viewMode, setViewMode, isSeniorMode, setIsSeniorMode }) {
  return (
    <header className="top-header">
      <div className="brand-block" aria-label="MEOMUM brand">
        <img src="/assets/meomum-logo.png" alt="머묾 MEOMUM 서비스 로고" className="brand-logo" />
      </div>

      <nav className="header-actions" aria-label="화면 모드 및 언어 설정">
        <div className="segmented" role="group" aria-label="간편 상세 모드 전환">
          <button className={viewMode === 'simple' ? 'active' : ''} onClick={() => setViewMode('simple')}>
            {language === 'en' ? 'Simple' : '간편'}
          </button>
          <button className={viewMode === 'detail' ? 'active' : ''} onClick={() => setViewMode('detail')}>
            {language === 'en' ? 'Detail' : '상세'}
          </button>
        </div>

        <button
          className={`mode-button ${isSeniorMode ? 'active' : ''}`}
          onClick={() => setIsSeniorMode(value => !value)}
          aria-pressed={isSeniorMode}
        >
          {language === 'en' ? 'Senior' : '시니어'}
        </button>

        <button
          className="mode-button"
          onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}
          aria-label="언어 전환"
        >
          {language === 'ko' ? 'English' : '한국어'}
        </button>
      </nav>
    </header>
  );
}
