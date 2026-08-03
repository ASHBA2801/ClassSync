export function AppBackground() {
  return (
    <div className="app-background" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/login-bg.jpg" alt="" className="app-background__image" />
      <div className="app-background__overlay" />
      <div className="app-background__vignette" />
    </div>
  );
}
