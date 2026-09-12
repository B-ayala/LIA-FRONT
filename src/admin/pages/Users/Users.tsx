import { useState, useEffect } from 'react';
import { Trash2, RefreshCw, Shield, ShieldOff, Search, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { Pagination, Box, InputAdornment, TextField } from '@mui/material';
import { useAuthStore } from '../../../store/authStore';
import { getAdminUsers, deleteAdminUser, updateUserRole, updateUserPurchaseAccess, type AdminUserData } from '../../../services/userService';
import ConfirmationModal from '../../../components/common/Modal/ConfirmationModal';
import LiaLoader from '../../../components/common/LiaLoader/LiaLoader';
import { usePagination } from '../../../hooks/usePagination';
import { extractErrorMessage } from '../../../utils/errorMessage';
import './Users.css';

const Users = () => {
    const currentUser = useAuthStore(state => state.currentUser);
    const [users, setUsers] = useState<AdminUserData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [userToDelete, setUserToDelete] = useState<AdminUserData | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [purchaseToggleTarget, setPurchaseToggleTarget] = useState<AdminUserData | null>(null);
    const [isTogglingPurchase, setIsTogglingPurchase] = useState(false);
    const [feedback, setFeedback] = useState<{
        isOpen: boolean;
        status: 'success' | 'error';
        title: string;
        message: string;
    }>({ isOpen: false, status: 'success', title: '', message: '' });

    const loadUsers = async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await getAdminUsers();
            setUsers(data);
        } catch (err) {
            setError(extractErrorMessage(err, 'Error al cargar usuarios'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const filteredUsers = users.filter((u) =>
        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const { currentPage, setCurrentPage, totalPages, paginated: paginatedUsers } = usePagination(filteredUsers, {
        itemsPerPage: 5,
        resetDeps: [searchTerm],
    });

    const handleDeleteClick = (user: AdminUserData) => {
        if (currentUser && currentUser.id === user.id) {
            setFeedback({
                isOpen: true,
                status: 'error',
                title: 'Acción no permitida',
                message: 'No puedes eliminar tu propia cuenta.',
            });
            return;
        }
        if (user.is_owner) {
            setFeedback({
                isOpen: true,
                status: 'error',
                title: 'Acción no permitida',
                message: 'No puedes eliminar al usuario principal de la tienda.',
            });
            return;
        }
        setUserToDelete(user);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;

        setIsDeleting(true);
        try {
            await deleteAdminUser(userToDelete.id);
            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
            setFeedback({
                isOpen: true,
                status: 'success',
                title: 'Usuario Eliminado',
                message: `El usuario "${userToDelete.name || userToDelete.email}" ha sido eliminado correctamente.`,
            });
        } catch (err) {
            setFeedback({
                isOpen: true,
                status: 'error',
                title: 'Error al Eliminar',
                message: extractErrorMessage(err, 'Error al eliminar el usuario'),
            });
        } finally {
            setIsDeleting(false);
            setUserToDelete(null);
        }
    };

    const handleToggleRole = async (user: AdminUserData) => {
        if (currentUser && currentUser.id === user.id) {
            setFeedback({
                isOpen: true,
                status: 'error',
                title: 'Acción no permitida',
                message: 'No puedes cambiar tu propio rol.',
            });
            return;
        }

        if (user.is_owner) {
            setFeedback({
                isOpen: true,
                status: 'error',
                title: 'Acción no permitida',
                message: 'No puedes quitarle el rol admin al usuario principal de la tienda.',
            });
            return;
        }

        const newRole = user.role === 'admin' ? 'user' : 'admin';

        if (newRole === 'admin' && !user.email_confirmed_at) {
            setFeedback({
                isOpen: true,
                status: 'error',
                title: 'Acción no permitida',
                message: `El usuario "${user.name || user.email}" no ha confirmado su email. Solo se puede dar rol admin a usuarios verificados.`,
            });
            return;
        }

        try {
            const updatedUser = await updateUserRole(user.id, newRole);
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: updatedUser.role } : u));
            setFeedback({
                isOpen: true,
                status: 'success',
                title: 'Rol Actualizado',
                message: `El usuario "${user.name || user.email}" ahora tiene rol ${newRole}.`,
            });
        } catch (err) {
            setFeedback({
                isOpen: true,
                status: 'error',
                title: 'Error al Actualizar',
                message: extractErrorMessage(err, 'Error al actualizar el rol del usuario'),
            });
        }
    };

    const restrictedModeActive = users.some((u) => u.purchase_allowed_exclusive);

    const handlePurchaseToggleClick = (user: AdminUserData) => {
        setPurchaseToggleTarget(user);
    };

    const handleConfirmPurchaseToggle = async () => {
        if (!purchaseToggleTarget) return;

        const nextAllowed = !purchaseToggleTarget.purchase_allowed_exclusive;
        setIsTogglingPurchase(true);
        try {
            const updatedUser = await updateUserPurchaseAccess(purchaseToggleTarget.id, nextAllowed);
            setUsers(prev => prev.map(u => u.id === purchaseToggleTarget.id
                ? { ...u, purchase_allowed_exclusive: updatedUser.purchase_allowed_exclusive }
                : u));
            setFeedback({
                isOpen: true,
                status: 'success',
                title: nextAllowed ? 'Compra habilitada' : 'Compra restaurada',
                message: nextAllowed
                    ? `"${purchaseToggleTarget.name || purchaseToggleTarget.email}" ahora puede comprar. Mientras siga marcado (solo o junto a otros), el resto de los usuarios no podrá comprar.`
                    : `Se le quitó el permiso exclusivo de compra a "${purchaseToggleTarget.name || purchaseToggleTarget.email}".`,
            });
        } catch (err) {
            setFeedback({
                isOpen: true,
                status: 'error',
                title: 'Error al Actualizar',
                message: extractErrorMessage(err, 'Error al actualizar el permiso de compra del usuario'),
            });
        } finally {
            setIsTogglingPurchase(false);
            setPurchaseToggleTarget(null);
        }
    };

    const getEmailStatus = (user: AdminUserData) => {
        if (user.email_confirmed_at) {
            return { label: 'Verificado', className: 'verified' };
        }
        return { label: 'Pendiente de verificación', className: 'pending' };
    };

    return (
        <div className="admin-users-page">
            <div className="admin-page-header">
                <h1 className="admin-page-title">Usuarios</h1>
                <p className="admin-page-subtitle">Administra los usuarios del sistema.</p>
            </div>

            <div className="admin-card users-toolbar">
                <div className="search-input-wrapper admin-w-full admin-max-w-md">
                    <TextField
                        placeholder="Buscar usuario por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        fullWidth
                        size="small"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search size={18} />
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                </div>
                <button 
                    className="admin-action-btn refresh" 
                    onClick={loadUsers} 
                    title="Recargar usuarios"
                    disabled={isLoading}
                >
                    <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
                </button>
            </div>

            {error && (
                <div className="admin-card error-card">
                    <p>{error}</p>
                    <button onClick={loadUsers} className="retry-btn">Reintentar</button>
                </div>
            )}

            {!isLoading && restrictedModeActive && (
                <div className="admin-card restricted-mode-banner">
                    <AlertTriangle size={18} />
                    <p>
                        Modo de compra restringida activo: solo los usuarios marcados como &quot;comprador habilitado&quot; pueden
                        comprar. El resto ve un aviso de sitio en mantenimiento al intentar pagar.
                    </p>
                </div>
            )}

            <div className="admin-card table-card">
                {isLoading ? (
                    <div className="users-loading">
                        <LiaLoader size="md" />
                        <p>Cargando usuarios...</p>
                    </div>
                ) : (
                    <>
                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Email</th>
                                    <th>Celular</th>
                                    <th>Rol</th>
                                    <th>Estado Email</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-4 text-slate-500">
                                            No se encontraron usuarios.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedUsers.map((user) => {
                                        const emailStatus = getEmailStatus(user);
                                        const isSelf = currentUser?.id === user.id;
                                        const canPromote = !!user.email_confirmed_at;
                                        const roleButtonDisabled = isSelf || user.is_owner || (user.role !== 'admin' && !canPromote);
                                        const roleButtonTitle = user.is_owner
                                            ? 'El usuario principal no puede perder el rol admin'
                                            : isSelf
                                                ? 'No puedes cambiar tu rol'
                                                : user.role !== 'admin' && !canPromote
                                                    ? 'El usuario debe confirmar su email antes de ser admin'
                                                    : `Cambiar a ${user.role === 'admin' ? 'usuario' : 'admin'}`;
                                        return (
                                            <tr key={user.id}>
                                                <td className="font-medium">{user.name || '—'}</td>
                                                <td>{user.email || '—'}</td>
                                                <td>{user.phone || '—'}</td>
                                                <td>
                                                    <span className={`role-badge ${user.role}`}>
                                                        {user.role}
                                                    </span>
                                                    {user.is_owner && (
                                                        <span className="role-badge owner" title="Usuario principal de la tienda">
                                                            Principal
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`email-status-badge ${emailStatus.className}`}>
                                                        {emailStatus.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="table-actions">
                                                        <button
                                                            onClick={() => handleToggleRole(user)}
                                                            className={`action-btn ${user.role === 'admin' ? 'demote' : 'promote'}`}
                                                            title={roleButtonTitle}
                                                            disabled={roleButtonDisabled}
                                                        >
                                                            {user.role === 'admin' ? <ShieldOff size={16} /> : <Shield size={16} />}
                                                        </button>
                                                        <button
                                                            onClick={() => handlePurchaseToggleClick(user)}
                                                            className={`admin-action-btn ${user.purchase_allowed_exclusive ? 'purchase-enabled' : 'purchase-default'}`}
                                                            title={user.purchase_allowed_exclusive
                                                                ? 'Quitar permiso exclusivo de compra'
                                                                : 'Marcar como comprador habilitado (activa el modo restringido para el resto)'}
                                                        >
                                                            {user.purchase_allowed_exclusive ? <Lock size={16} /> : <Unlock size={16} />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(user)}
                                                            className="admin-action-btn delete"
                                                            title={
                                                                isSelf
                                                                    ? 'No puedes eliminarte'
                                                                    : user.is_owner
                                                                        ? 'No puedes eliminar al usuario principal'
                                                                        : 'Eliminar usuario'
                                                            }
                                                            disabled={isSelf || user.is_owner}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <Box display="flex" justifyContent="center" alignItems="center" pt={1} pb={0.5}>
                            <Pagination
                                count={totalPages}
                                page={currentPage}
                                onChange={(_, page) => setCurrentPage(page)}
                                size="small"
                                siblingCount={1}
                                boundaryCount={1}
                                color="primary"
                            />
                        </Box>
                    )}
                    </>
                )}
            </div>

            <ConfirmationModal
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                status={isDeleting ? 'loading' : 'error'}
                title="Eliminar Usuario"
                message={`¿Estás seguro de eliminar a "${userToDelete?.name || userToDelete?.email}"?\n\nEsta acción eliminará la cuenta completamente y no se puede deshacer.`}
                actionButtonText={isDeleting ? 'Eliminando...' : 'Eliminar'}
                onActionClick={handleConfirmDelete}
            />

            <ConfirmationModal
                isOpen={!!purchaseToggleTarget}
                onClose={() => setPurchaseToggleTarget(null)}
                status={isTogglingPurchase ? 'loading' : 'info'}
                title={purchaseToggleTarget?.purchase_allowed_exclusive ? 'Quitar comprador habilitado' : 'Marcar comprador habilitado'}
                message={purchaseToggleTarget?.purchase_allowed_exclusive
                    ? `¿Estás seguro de quitarle a "${purchaseToggleTarget?.name || purchaseToggleTarget?.email}" el permiso exclusivo de compra?\n\nSi era el único usuario marcado, la compra vuelve a estar habilitada para todos.`
                    : `¿Estás seguro de marcar a "${purchaseToggleTarget?.name || purchaseToggleTarget?.email}" como comprador habilitado?\n\nMientras haya al menos un usuario marcado así, el resto de los usuarios NO podrá comprar (verán un aviso de sitio en mantenimiento).`}
                actionButtonText={isTogglingPurchase ? 'Aplicando...' : 'Confirmar'}
                cancelButtonText="Cancelar"
                onActionClick={handleConfirmPurchaseToggle}
            />

            <ConfirmationModal
                isOpen={feedback.isOpen}
                onClose={() => setFeedback(prev => ({ ...prev, isOpen: false }))}
                status={feedback.status}
                title={feedback.title}
                message={feedback.message}
            />
        </div>
    );
};

export default Users;
