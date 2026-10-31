import { Plus, X } from 'lucide-react';
import { SIZE_GUIDE_INFO_LIMITS } from '../../../types/sizeGuideContent';

interface NotesListEditorProps {
  notes: string[];
  onChange: (notes: string[]) => void;
  /** Prefijo único para ids/labels cuando hay más de un editor en pantalla. */
  idPrefix: string;
  disabled?: boolean;
}

/** Lista editable de aclaraciones (una por ítem). La usan la guía de un producto y los textos globales. */
const NotesListEditor = ({ notes, onChange, idPrefix, disabled = false }: NotesListEditorProps) => {
  const canAdd = notes.length < SIZE_GUIDE_INFO_LIMITS.maxNotes;

  return (
    <div className="guide-notes-list">
      {notes.length === 0 && <p className="size-guide-info__hint">Sin aclaraciones. La tienda no mostrará este bloque.</p>}
      {notes.map((note, index) => (
        <div className="guide-notes-list__row" key={index}>
          <label className="sr-only" htmlFor={`${idPrefix}-note-${index}`}>Aclaración {index + 1}</label>
          <textarea
            id={`${idPrefix}-note-${index}`}
            className="size-guide-info__textarea"
            rows={2}
            value={note}
            maxLength={SIZE_GUIDE_INFO_LIMITS.maxNoteLength}
            disabled={disabled}
            aria-invalid={!note.trim()}
            onChange={(e) => onChange(notes.map((current, i) => (i === index ? e.target.value : current)))}
          />
          <button
            type="button"
            className="size-guide-table__del-btn"
            disabled={disabled}
            aria-label={`Quitar aclaración ${index + 1}`}
            onClick={() => onChange(notes.filter((_, i) => i !== index))}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="admin-btn-secondary guide-notes-list__add"
        disabled={disabled || !canAdd}
        onClick={() => onChange([...notes, ''])}
      >
        <Plus size={16} aria-hidden="true" /> Agregar aclaración
      </button>
      {!canAdd && <p className="size-guide-info__hint">Máximo {SIZE_GUIDE_INFO_LIMITS.maxNotes} aclaraciones.</p>}
    </div>
  );
};

export default NotesListEditor;
