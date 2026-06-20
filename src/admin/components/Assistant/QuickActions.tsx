import { Star } from 'lucide-react';
import { QUICK_ACTIONS } from './assistantConfig';

interface QuickActionsProps {
  favorites: string[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const QuickActions = ({ favorites, activeId, onSelect, onToggleFavorite }: QuickActionsProps) => {
  // Favoritas primero, conservando el orden del registro dentro de cada grupo.
  const ordered = [...QUICK_ACTIONS].sort(
    (a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id))
  );

  return (
    <div className="assistant-quick-grid" role="list">
      {ordered.map((action) => {
        const isFavorite = favorites.includes(action.id);
        const Icon = action.icon;
        return (
          <div
            key={action.id}
            role="listitem"
            className={`assistant-quick ${activeId === action.id ? 'active' : ''}`}
          >
            <button
              type="button"
              className="assistant-quick-btn"
              onClick={() => onSelect(action.id)}
            >
              <span className="assistant-quick-icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="assistant-quick-text">
                <span className="assistant-quick-label">{action.label}</span>
                <span className="assistant-quick-desc">{action.description}</span>
              </span>
            </button>
            <button
              type="button"
              className={`assistant-fav ${isFavorite ? 'on' : ''}`}
              onClick={() => onToggleFavorite(action.id)}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? `Quitar ${action.label} de favoritos` : `Marcar ${action.label} como favorito`}
            >
              <Star size={14} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default QuickActions;
