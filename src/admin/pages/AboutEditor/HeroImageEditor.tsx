import { useState, useRef, useEffect } from 'react';
import { TextField } from '@mui/material';
import './HeroImageEditor.css';

interface HeroImageEditorProps {
  imageUrl: string;
  backgroundPosition: string; // formato: "50% 50%"
  onPositionChange: (position: string) => void;
}

const HeroImageEditor = ({
  imageUrl,
  backgroundPosition,
  onPositionChange
}: HeroImageEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(backgroundPosition);

  // Parse position string "50% 50%" to { x: 50, y: 50 }
  const parsePosition = (pos: string) => {
    const parts = pos.split(' ');
    return {
      x: parseInt(parts[0]) || 50,
      y: parseInt(parts[1]) || 50
    };
  };

  // Format position object back to string
  const formatPosition = (x: number, y: number) => `${x}% ${y}%`;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const newPosition = formatPosition(Math.round(x), Math.round(y));
    setPosition(newPosition);
    onPositionChange(newPosition);
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Preset positions
  const presets = [
    { label: 'Centro', value: '50% 50%' },
    { label: 'Arriba', value: '50% 0%' },
    { label: 'Arriba-Der', value: '100% 0%' },
    { label: 'Derecha', value: '100% 50%' },
    { label: 'Abajo-Der', value: '100% 100%' },
    { label: 'Abajo', value: '50% 100%' },
    { label: 'Abajo-Izq', value: '0% 100%' },
    { label: 'Izquierda', value: '0% 50%' },
    { label: 'Arriba-Izq', value: '0% 0%' }
  ];

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const currentPos = parsePosition(position);

  return (
    <div className="hero-image-editor">
      <div className="editor-header">
        <h3>Posicionamiento de la imagen hero</h3>
        <p className="editor-description">Arrastra la imagen para ajustar su posición. Lo que ves aquí es exactamente lo que verán en la página About.</p>
      </div>

      <div className="editor-content">
        {/* Vista previa interactiva */}
        <div
          className={`hero-preview ${isDragging ? 'dragging' : ''}`}
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          style={{
            backgroundImage: `url('${imageUrl}')`,
            backgroundPosition: position,
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="preview-overlay">
            <div className="crosshair" />
            <span className="position-display">{position}</span>
          </div>
        </div>

        {/* Información y controles */}
        <div className="editor-controls">
          <div className="position-info">
            <div className="info-item">
              <label>Posición X:</label>
              <TextField
                type="number"
                value={currentPos.x}
                onChange={(e) => {
                  const newPosition = formatPosition(parseInt(e.target.value) || 0, currentPos.y);
                  setPosition(newPosition);
                  onPositionChange(newPosition);
                }}
                size="small"
                slotProps={{
                  htmlInput: { min: 0, max: 100 },
                }}
              />
              <span>%</span>
            </div>
            <div className="info-item">
              <label>Posición Y:</label>
              <TextField
                type="number"
                value={currentPos.y}
                onChange={(e) => {
                  const newPosition = formatPosition(currentPos.x, parseInt(e.target.value) || 0);
                  setPosition(newPosition);
                  onPositionChange(newPosition);
                }}
                size="small"
                slotProps={{
                  htmlInput: { min: 0, max: 100 },
                }}
              />
              <span>%</span>
            </div>
          </div>

          <div className="position-presets">
            <label>Presets:</label>
            <div className="presets-grid">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  className={`preset-btn ${position === preset.value ? 'active' : ''}`}
                  onClick={() => {
                    setPosition(preset.value);
                    onPositionChange(preset.value);
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="editor-tips">
        <p>💡 <strong>Tip:</strong> Arrastra dentro de la vista previa para mover la imagen. El área visible es exactamente el tamaño del hero en la página About.</p>
      </div>
    </div>
  );
};

export default HeroImageEditor;
