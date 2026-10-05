import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import {
    getVariantsTutorialDismissed,
    setVariantsTutorialDismissed,
} from '../../../services/adminPreferencesService';

/**
 * Controla el tutorial de la pestaña "Variantes".
 * - Se abre solo la primera vez que el admin entra a la sección (por apertura del
 *   formulario) y únicamente si no marcó "No volver a mostrar".
 * - La preferencia vive en la base, por usuario: sobrevive a logout y dispositivos.
 * - Si no se puede leer la preferencia NO se abre solo (no molestar con un dato
 *   desconocido); el botón "Ver guía" siempre funciona.
 */
export const useVariantsTutorial = (isSectionActive: boolean, isFormOpen: boolean) => {
    const userId = useAuthStore((state) => state.currentUser?.id);
    const [isOpen, setIsOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const autoCheckDone = useRef(false);

    useEffect(() => {
        if (!isFormOpen) autoCheckDone.current = false;
    }, [isFormOpen]);

    useEffect(() => {
        if (!isFormOpen || !isSectionActive || !userId || autoCheckDone.current) return;
        autoCheckDone.current = true;
        let cancelled = false;
        getVariantsTutorialDismissed(userId)
            .then((dismissed) => { if (!cancelled && !dismissed) setIsOpen(true); })
            .catch(() => { autoCheckDone.current = false; });
        return () => { cancelled = true; };
    }, [isFormOpen, isSectionActive, userId]);

    const open = useCallback(() => {
        setSaveError('');
        setIsOpen(true);
    }, []);

    const close = useCallback(async (dontShowAgain: boolean) => {
        if (saving) return;
        if (!dontShowAgain || !userId) {
            setIsOpen(false);
            return;
        }
        setSaving(true);
        setSaveError('');
        try {
            await setVariantsTutorialDismissed(userId, true);
            setIsOpen(false);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'No pudimos guardar tu preferencia.');
        } finally {
            setSaving(false);
        }
    }, [saving, userId]);

    return { isOpen, saving, saveError, open, close };
};
