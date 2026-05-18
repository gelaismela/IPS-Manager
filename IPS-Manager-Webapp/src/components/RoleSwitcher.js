import React, { useState, useRef, useEffect } from "react";
import useActiveRole, { ROLE_LABELS, ROLE_ICONS } from "../hooks/useActiveRole";

function RoleSwitcher() {
  const { activeRole, roles, switchRole } = useActiveRole();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Only render if the user has more than one role
  if (!roles || roles.length <= 1) return null;

  const label = ROLE_LABELS[activeRole] || activeRole;
  const icon = ROLE_ICONS[activeRole] || "bx-user";

  return (
    <div className="role-switcher" ref={ref}>
      <button
        className="role-switcher__trigger"
        onClick={() => setOpen((o) => !o)}
        title="Switch role view"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <i className={`bx ${icon}`} />
        <span className="role-switcher__label">{label}</span>
        <i className={`bx ${open ? "bx-chevron-up" : "bx-chevron-down"} role-switcher__caret`} />
      </button>

      {open && (
        <ul className="role-switcher__dropdown" role="listbox">
          {roles.map((role) => {
            const isActive = role === activeRole;
            return (
              <li
                key={role}
                role="option"
                aria-selected={isActive}
                className={`role-switcher__option${isActive ? " role-switcher__option--active" : ""}`}
                onClick={() => {
                  if (!isActive) switchRole(role);
                  setOpen(false);
                }}
              >
                <i className={`bx ${ROLE_ICONS[role] || "bx-user"}`} />
                <span>{ROLE_LABELS[role] || role}</span>
                {isActive && <i className="bx bx-check role-switcher__check" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default RoleSwitcher;
