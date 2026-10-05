import { useState } from 'react';
import { Palette, Shirt, Footprints, Lightbulb } from 'lucide-react';
import Modal from '../../../components/common/Modal/Modal';
import './VariantsTutorial.css';

interface VariantsTutorialModalProps {
    isOpen: boolean;
    saving: boolean;
    saveError: string;
    onClose: (dontShowAgain: boolean) => void;
}

const SHOE_SIZES = ['35', '36', '37', '38', '39', '40', '41', '42'];
const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const SizeChips = ({ sizes }: { sizes: string[] }) => (
    <ul className="variants-tutorial__chips" aria-label="Talles de ejemplo">
        {sizes.map((size) => (
            <li key={size} className="variants-tutorial__chip">{size}</li>
        ))}
    </ul>
);

const VariantsTutorialModal = ({ isOpen, saving, saveError, onClose }: VariantsTutorialModalProps) => {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    return (
        <Modal isOpen={isOpen} onClose={() => onClose(dontShowAgain)} title="Cómo configurar Color y Talle">
            <div className="variants-tutorial">
                <section className="variants-tutorial__section">
                    <h4 className="variants-tutorial__heading"><Palette size={20} aria-hidden="true" /> Color</h4>
                    <ul className="variants-tutorial__list">
                        <li>Creá una variante y ponele de nombre <strong>Color</strong>.</li>
                        <li>Tocá los colores de la paleta para elegirlos.</li>
                        <li>
                            ¿Falta alguno? Usá <strong>Color personalizado</strong>: escribí el nombre
                            y elegí el tono.
                        </li>
                    </ul>
                    <p className="variants-tutorial__example">Ejemplo: remera disponible en Negro, Blanco y Rosa.</p>
                </section>

                <section className="variants-tutorial__section">
                    <h4 className="variants-tutorial__heading"><Shirt size={20} aria-hidden="true" /> Talle</h4>
                    <ul className="variants-tutorial__list">
                        <li>Creá una variante y ponele de nombre <strong>Talle</strong>.</li>
                        <li>Escribí un talle y apretá <strong>Enter</strong> para agregarlo. Se guardan en mayúsculas.</li>
                        <li>Cargá el stock de cada talle: el stock total del producto se calcula solo.</li>
                        <li>Si querés, podés asignar un color a cada talle (opcional).</li>
                    </ul>
                </section>

                <section className="variants-tutorial__section">
                    <h4 className="variants-tutorial__heading"><Footprints size={20} aria-hidden="true" /> Guía para calzado</h4>
                    <p>Usá talles numéricos.</p>
                    <SizeChips sizes={SHOE_SIZES} />
                    <p className="variants-tutorial__example">Ejemplo: zapatillas con talles 36, 37, 38 y 39.</p>
                </section>

                <section className="variants-tutorial__section">
                    <h4 className="variants-tutorial__heading"><Shirt size={20} aria-hidden="true" /> Guía para indumentaria</h4>
                    <p>Usá talles con letras.</p>
                    <SizeChips sizes={CLOTHING_SIZES} />
                    <p className="variants-tutorial__example">Ejemplo: buzo con talles S, M y L.</p>
                </section>

                <p className="variants-tutorial__tip">
                    <Lightbulb size={20} aria-hidden="true" />
                    <span>
                        <strong>Tip:</strong> no mezcles números y letras en un mismo producto
                        (por ejemplo 38 y M). Elegí un solo tipo de talle.
                    </span>
                </p>

                {saveError && (
                    <p role="alert" className="variants-tutorial__error">{saveError}</p>
                )}

                <div className="variants-tutorial__footer">
                    <label className="variants-tutorial__checkbox">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            disabled={saving}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                        />
                        No volver a mostrar este recordatorio
                    </label>
                    <button
                        type="button"
                        className="variants-tutorial__close"
                        disabled={saving}
                        onClick={() => onClose(dontShowAgain)}
                    >
                        {saving ? 'Guardando…' : 'Entendido'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default VariantsTutorialModal;
