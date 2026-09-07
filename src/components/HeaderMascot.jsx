export default function HeaderMascot({ active = true }) {
  return (
    <span className={`header-mascot-inline${active ? ' is-active' : ''}`} aria-hidden="true">
      <span className="header-mascot-sleeper">
        <img src="/mascot/billy-sleeping.png" alt="" draggable="false" />
        <span className="header-mascot-snooze">
          <span>Z</span><span>Z</span><span>Z</span>
        </span>
      </span>
    </span>
  );
}
