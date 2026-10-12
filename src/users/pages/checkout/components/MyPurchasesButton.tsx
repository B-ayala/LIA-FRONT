import { lazy, Suspense, useState } from 'react';
import { useAuthStore } from '../../../../store/authStore';

const MyPurchasesModal = lazy(() => import('../../../components/header/navBar/MyPurchasesModal'));

interface MyPurchasesButtonProps {
  className: string;
  label?: string;
}

/** "Mis compras" no es una ruta sino un modal: este botón lo abre desde el checkout/resultado. */
const MyPurchasesButton = ({ className, label = 'Ver Mis compras' }: MyPurchasesButtonProps) => {
  const email = useAuthStore((s) => s.currentUser?.email ?? '');
  const [open, setOpen] = useState(false);

  if (!email) return null;

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <Suspense fallback={null}>
          <MyPurchasesModal isOpen={open} onClose={() => setOpen(false)} email={email} />
        </Suspense>
      )}
    </>
  );
};

export default MyPurchasesButton;
