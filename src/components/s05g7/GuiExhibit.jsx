import { useState } from "react";

function themeToCssVars(theme) {
  if (!theme) return undefined;
  return {
    "--main-bg-color": theme.mainBg,
    "--main-bg-image": theme.mainBgImage,
    "--header-bg": theme.headerBg,
    "--header-border-style": theme.headerBorderStyle,
  };
}

export default function MacGuiExhibit({ appleLogoSrc, eras }) {
  const [activeId, setActiveId] = useState(eras[0]?.id);
  const active = eras.find((era) => era.id === activeId) ?? eras[0];

  return (
    <div className="s05g7-main-container" style={themeToCssVars(active.theme)}>
      <header className="s05g7-header">
        <div className="s05g7-header-left">
          <a href="/csarch2-virtual-exhibits/s05g7" aria-label="Return to Home" style={{ display:'flex', alignItems: 'center' }}>
            <img src={appleLogoSrc} alt="Apple Logo" className="s05g7-apple-logo-img" />
          </a>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>History of the Macintosh Computer</span>
            <div><h3>Read Time: 30 minutes</h3></div>
          </div>
        </div>
        <div className="s05g7-header-right">
          <div>S05 Group 7</div>
          <div>Aguirre, Ching, Cruz, Guarin, Papa</div>
        </div>
      </header>

      <div className="s05g7-workspace">
        <nav className="s05g7-sidebar">
          {/* TRY LANG: nav buttons now render an icon instead of text */}
          {eras.map((era) => (
            <button
              key={era.id}
              type="button"
              className={era.id === activeId ? "s05g7-active" : ""}
              onClick={() => setActiveId(era.id)}
              title={era.navLabel}
            >
              {era.icon ? (
                <img src={era.icon} alt={era.navLabel} className="s05g7-nav-icon" />
              ) : (
                era.navLabel
              )}
            </button>
          ))}
        </nav>

        <main className="s05g7-content-window">
          <div className="s05g7-window-header">{active.title}</div>
          <div className="s05g7-window-body">
            {active.body.map((block, index) => {
              if (block.type === "img") {
                return (
                  <div key={index}>
                    <img src={block.src} alt={block.alt} className="s05g7-body-img" />
                    <h5>{block.caption}</h5>
                  </div>
                );
              }
              if (block.type === "placeholder") {
                return (
                  <p key={index} className="s05g7-placeholder-note">
                    {block.text}
                  </p>
                );
              }
              if (block.type === "subheading") {
                return (
                  <p key={index} className="s05g7-subheading">
                    {block.text}
                  </p>
                );
              }
              return <p key={index}>{block.text}</p>;
            })}
          </div>
        </main>
      </div>
    </div>
  );
}

