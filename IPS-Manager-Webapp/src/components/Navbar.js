import { logout } from "../api/api"; // or utils.js

function Navbar() {
  return (
    <nav>
      <button onClick={logout} className="logout-btn">
        Log Out
      </button>
    </nav>
  );
}

export default Navbar;
