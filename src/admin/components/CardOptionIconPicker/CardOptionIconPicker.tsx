import { Ban } from 'lucide-react';
import { CARD_OPTION_ICON_KEYS, CARD_OPTION_ICONS, NO_ICON_KEY } from '../../../utils/cardOptionIcons';
import './CardOptionIconPicker.css';

interface CardOptionIconPickerProps {
    value: string;
    onChange: (icon: string) => void;
}

const CardOptionIconPicker = ({ value, onChange }: CardOptionIconPickerProps) => (
    <div className="card-option-icon-picker" role="radiogroup" aria-label="Ícono">
        {CARD_OPTION_ICON_KEYS.map((key) => {
            const Icon = CARD_OPTION_ICONS[key];
            return (
                <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={value === key}
                    aria-label={key}
                    className={`card-option-icon-btn ${value === key ? 'active' : ''}`}
                    onClick={() => onChange(key)}
                    title={key}
                >
                    <Icon size={16} />
                </button>
            );
        })}
        <button
            type="button"
            role="radio"
            aria-checked={value === NO_ICON_KEY}
            aria-label="Sin ícono"
            className={`card-option-icon-btn ${value === NO_ICON_KEY ? 'active' : ''}`}
            onClick={() => onChange(NO_ICON_KEY)}
            title="Sin ícono"
        >
            <Ban size={16} />
        </button>
    </div>
);

export default CardOptionIconPicker;
