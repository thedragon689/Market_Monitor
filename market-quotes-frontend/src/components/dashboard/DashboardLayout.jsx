import { Suspense, useCallback, useEffect, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '../ui';
import ViewFallback from '../ViewFallback';
import { WIDGET_REGISTRY } from './widgetRegistry';
import {
  DEFAULT_WIDGETS,
  loadDashboardLayout,
  normalizeDashboardLayout,
  resetDashboardLayout,
  resolveDashboardLayout,
  useDashboardPersistence,
} from '../../hooks/useDashboardLayout';
import './dashboard.css';

function SortableWidget({ item, focusId, onFocus, onRemove, onResize, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${Math.min(12, item.colSpan || 4)}`,
  };
  const meta = WIDGET_REGISTRY[item.id];
  if (!meta) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`dash-widget ${isDragging ? 'dash-widget--dragging' : ''} ${focusId === item.id ? 'dash-widget--focus' : ''}`}
    >
      <Card className="dash-widget__card ui-card--glass">
        <header className="dash-widget__head">
          <button type="button" className="dash-widget__drag" {...attributes} {...listeners} aria-label="Trascina widget">
            ⠿
          </button>
          <h3 className="dash-widget__title">{meta.title}</h3>
          <div className="dash-widget__actions">
            <button
              type="button"
              className="dash-widget__btn"
              onClick={() => onResize(item.id, -2)}
              title="Riduci larghezza"
            >
              −
            </button>
            <button
              type="button"
              className="dash-widget__btn"
              onClick={() => onResize(item.id, 2)}
              title="Allarga"
            >
              +
            </button>
            <button type="button" className="dash-widget__btn" onClick={() => onFocus(item.id)} title="Focus">
              ⛶
            </button>
            <button type="button" className="dash-widget__btn" onClick={() => onRemove(item.id)} title="Rimuovi">
              ×
            </button>
          </div>
        </header>
        <div className="dash-widget__body">{children}</div>
      </Card>
    </div>
  );
}

/**
 * Dashboard personalizzabile drag-and-drop (Prompt 2).
 */
export default function DashboardLayout({
  symbol,
  type,
  quote,
  analysis,
  intelligence,
  correlations,
  forecast,
  loading,
  fx,
  onResetFocus,
}) {
  const [layout, setLayout] = useState(() => normalizeDashboardLayout(loadDashboardLayout()));
  const [focusId, setFocusId] = useState(null);
  const { hydrate } = useDashboardPersistence(layout, setLayout);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLayout((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }, []);

  const removeWidget = (id) => setLayout((items) => items.filter((i) => i.id !== id));

  const resizeWidget = (id, delta) => {
    setLayout((items) =>
      items.map((i) =>
        i.id === id
          ? { ...i, colSpan: Math.min(12, Math.max(2, (i.colSpan || 4) + delta)) }
          : i
      )
    );
  };

  const addWidget = (id) => {
    if (layout.some((i) => i.id === id)) return;
    const meta = WIDGET_REGISTRY[id];
    setLayout((items) => [...items, { id, colSpan: meta?.defaultColSpan || 4 }]);
  };

  const renderWidget = (item) => {
    const meta = WIDGET_REGISTRY[item.id];
    if (!meta) return null;
    const Comp = meta.component;
    const common = { symbol, type, fx, loading };
    switch (item.id) {
      case 'quote':
        return <Comp quote={quote} {...common} variant="hero" />;
      case 'chart':
        return <Comp symbol={symbol} type={type} height={320} />;
      case 'indicators':
        return <Comp analysis={analysis} visible={{ ema: true, rsi: true, macd: true, bollinger: true }} {...common} />;
      case 'correlations':
        return <Comp intelligence={intelligence} correlations={correlations} loading={loading} />;
      case 'forecast':
        return <Comp forecast={forecast} quote={quote} history={analysis?.history} {...common} />;
      case 'alerts':
        return <Comp alerts={intelligence?.alerts} />;
      default:
        return null;
    }
  };

  if (focusId) {
    const item = layout.find((i) => i.id === focusId);
    const meta = item && WIDGET_REGISTRY[item.id];
    return (
      <div className="dash-focus">
        <header className="dash-focus__head">
          <h2>{meta?.title}</h2>
          <button
            type="button"
            className="dash-focus__close"
            onClick={() => {
              setFocusId(null);
              onResetFocus?.();
            }}
          >
            ESC · Chiudi focus
          </button>
        </header>
        <div className="dash-focus__body">
          <Suspense fallback={<ViewFallback tall />}>{item && renderWidget(item)}</Suspense>
        </div>
      </div>
    );
  }

  const missing = DEFAULT_WIDGETS.filter((w) => !layout.some((i) => i.id === w.id));

  return (
    <div className="dash-layout">
      <div className="dash-layout__toolbar">
        <span className="dash-layout__hint">Trascina i widget per riordinare la dashboard</span>
        {missing.length > 0 && (
          <div className="dash-layout__add">
            {missing.map((w) => (
              <button key={w.id} type="button" className="dash-layout__add-btn" onClick={() => addWidget(w.id)}>
                + {WIDGET_REGISTRY[w.id]?.title}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className="dash-layout__reset"
          onClick={() => {
            resetDashboardLayout();
            setLayout(DEFAULT_WIDGETS);
          }}
        >
          Ripristina layout
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={layout.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div className="dash-layout__grid">
            {layout.map((item) => (
              <SortableWidget
                key={item.id}
                item={item}
                focusId={focusId}
                onFocus={setFocusId}
                onRemove={removeWidget}
                onResize={resizeWidget}
              >
                <Suspense fallback={<ViewFallback />}>{renderWidget(item)}</Suspense>
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
