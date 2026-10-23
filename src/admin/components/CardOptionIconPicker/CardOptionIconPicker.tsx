import { CARD_OPTION_ICON_KEYS, getCardOptionIcon } from '../../../utils/cardOptionIcons';
import './CardOptionIconPicker.css';

interface CardOptionIconPickerProps {
    value: string;
    onChange: (icon: string) => void;
}

const CardOptionIconPicker = ({ value, onChange }: CardOptionIconPickerProps) => (
    <div className="card-option-icon-picker" role="radiogroup" aria-label="Ícono">
        {CARD_OPTION_ICON_KEYS.map((key) => {
            const Icon = getCardOptionIcon(key);
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
    </div>
);

export default CardOptionIconPicker;
