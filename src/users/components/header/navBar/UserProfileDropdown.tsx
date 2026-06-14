import { useState, useRef, useCallback } from 'react';
import { FiUser, FiLock, FiLogOut, FiChevronDown, FiShoppingBag } from 'react-icons/fi';
import { Divider } from '@mui/material';
import { useClickOutside } from '../../../../hooks/useClickOutside';
import ChangePasswordModal from './ChangePasswordModal';
import MyPurchasesModal from './MyPurchasesModal';
import './UserProfileDropdown.css';

interface UserProfileDropdownProps {
  user: { name: string; email: string };
  onLogout: () => void;
}

const UserProfileDropdown = ({ user, onLogout }: UserProfileDropdownProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isPurchasesModalOpen, setIsPurchasesModalOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeDropdown = useCallback(() => setIsDropdownOpen(false), []);
  useClickOutside(dropdownRef, closeDropdown, isDropdownOpen);

  const handleChangePasswordClick = () => {
    setIsDropdownOpen(false);
    setIsPasswordModalOpen(true);
  };

  const handlePurchasesClick = () => {
    setIsDropdownOpen(false);
    setIsPurchasesModalOpen(true);
  };

  const handleLogoutClick = async () => {
    setIsDropdownOpen(false);
    await onLogout();
  };

  return (
    <>
      <div className="profile-dropdown-wrapper" ref={dropdownRef}>
        <button
          className="login-btn hide-mobile"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          title={`Perfil de ${user.name}`}
        >
          <FiUser className="icon" style={{ marginRight: '0.5rem' }} />
          {user.name}
          <FiChevronDown
            className="icon"
            style={{
              marginLeft: '0.5rem',
              transition: 'transform 0.3s ease',
              transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        {isDropdownOpen && (
          <div className="profile-dropdown-menu">
            {/* Mis compras */}
            <button
              className="profile-dropdown-item"
              onClick={handlePurchasesClick}
            >
              <FiShoppingBag size={18} />
              <span>Mis compras</span>
            </button>

            {/* Cambiar contraseña */}
            <button
              className="profile-dropdown-item"
              onClick={handleChangePasswordClick}
            >
              <FiLock size={18} />
              <span>Cambiar contraseña</span>
            </button>

            {/* Divider */}
            <Divider
              sx={{
                my: '0.25rem',
                borderColor: 'rgba(184,165,200,0.2)',
              }}
            />

            {/* Cerrar sesión */}
            <button
              className="profile-dropdown-item logout-item"
              onClick={handleLogoutClick}
            >
              <FiLogOut size={18} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
      <MyPurchasesModal
        isOpen={isPurchasesModalOpen}
        onClose={() => setIsPurchasesModalOpen(false)}
        email={user.email}
      />
    </>
  );
};

export default UserProfileDropdown;
