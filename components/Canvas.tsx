import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect
} from 'react';
import { CanvasItem, ItemType, MM_TO_PX, Position, Size } from '../types';

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ItemBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasProps {
  items: CanvasItem[];
  size: Size; // in mm
  zoom: number;
  selectedItemIds: string[];
  onSelectItems: (ids: string[]) => void;
  onUpdateItem: (id: string, updates: Partial<CanvasItem>) => void;
  onUpdateItems: (updates: { id: string; changes: Partial<CanvasItem> }[]) => void;
  onDeleteItem: (id: string) => void;
  onCanvasClick: () => void;
}

const SNAP_THRESHOLD = 4;
const defaultTextSize = { width: 60, height: 24 };

export const Canvas: React.FC<CanvasProps> = ({
  items,
  size,
  zoom,
  selectedItemIds,
  onSelectItems,
  onUpdateItem,
  onUpdateItems,
  onDeleteItem,
  onCanvasClick
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeDragIds, setActiveDragIds] = useState<string[]>([]);
  const [dragInitialPositions, setDragInitialPositions] = useState<Record<string, Position>>({});
  const dragStartPointer = useRef<Position | null>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const selectionStartRef = useRef<Position | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const itemRectsRef = useRef<Record<string, ItemBounds>>({});
  const [guides, setGuides] = useState<{ vertical?: number; horizontal?: number }>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const editingInputRef = useRef<HTMLTextAreaElement | null>(null);

  const widthPx = size.width * MM_TO_PX;
  const heightPx = size.height * MM_TO_PX;
  const getTextMaxWidth = useCallback((item: CanvasItem) => {
    return Math.max(20, widthPx - item.x);
  }, [widthPx]);

  const finishEditing = useCallback(() => {
    if (!editingItemId) return;
    onUpdateItem(editingItemId, { content: editingValue });
    setEditingItemId(null);
  }, [editingItemId, editingValue, onUpdateItem]);

  const getItemBounds = useCallback((item: CanvasItem): ItemBounds => {
    const measured = itemRectsRef.current[item.id];
    if (measured) return measured;
    if (item.type === ItemType.TEXT) {
      return {
        x: item.x,
        y: item.y,
        width: defaultTextSize.width,
        height: defaultTextSize.height
      };
    }
    return {
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height
    };
  }, []);

  const applySnapping = useCallback(
    (
      candidateX: number,
      candidateY: number,
      width: number,
      height: number,
      movingIds: string[]
    ) => {
      let snappedX = candidateX;
      let snappedY = candidateY;
      let verticalGuide: number | undefined;
      let horizontalGuide: number | undefined;

      const currentX = {
        left: candidateX,
        center: candidateX + width / 2,
        right: candidateX + width
      };
      const currentY = {
        top: candidateY,
        middle: candidateY + height / 2,
        bottom: candidateY + height
      };

      const shouldSnap = (value: number, target: number) => Math.abs(value - target) <= SNAP_THRESHOLD;

      items.forEach(item => {
        if (movingIds.includes(item.id)) return;
        const bounds = getItemBounds(item);
        const otherX = {
          left: bounds.x,
          center: bounds.x + bounds.width / 2,
          right: bounds.x + bounds.width
        };
        const otherY = {
          top: bounds.y,
          middle: bounds.y + bounds.height / 2,
          bottom: bounds.y + bounds.height
        };

        if (verticalGuide === undefined) {
          if (shouldSnap(currentX.left, otherX.left)) {
            snappedX = otherX.left;
            verticalGuide = otherX.left;
          } else if (shouldSnap(currentX.center, otherX.center)) {
            snappedX = otherX.center - width / 2;
            verticalGuide = otherX.center;
          } else if (shouldSnap(currentX.right, otherX.right)) {
            snappedX = otherX.right - width;
            verticalGuide = otherX.right;
          } else if (shouldSnap(currentX.left, otherX.right)) {
            snappedX = otherX.right;
            verticalGuide = otherX.right;
          } else if (shouldSnap(currentX.right, otherX.left)) {
            snappedX = otherX.left - width;
            verticalGuide = otherX.left;
          }
        }

        if (horizontalGuide === undefined) {
          if (shouldSnap(currentY.top, otherY.top)) {
            snappedY = otherY.top;
            horizontalGuide = otherY.top;
          } else if (shouldSnap(currentY.middle, otherY.middle)) {
            snappedY = otherY.middle - height / 2;
            horizontalGuide = otherY.middle;
          } else if (shouldSnap(currentY.bottom, otherY.bottom)) {
            snappedY = otherY.bottom - height;
            horizontalGuide = otherY.bottom;
          } else if (shouldSnap(currentY.top, otherY.bottom)) {
            snappedY = otherY.bottom;
            horizontalGuide = otherY.bottom;
          } else if (shouldSnap(currentY.bottom, otherY.top)) {
            snappedY = otherY.top - height;
            horizontalGuide = otherY.top;
          }
        }
      });

      return { x: snappedX, y: snappedY, verticalGuide, horizontalGuide };
    },
    [getItemBounds, items]
  );

  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const next: Record<string, ItemBounds> = {};
    items.forEach(item => {
      const node = itemRefs.current[item.id];
      if (node) {
        const rect = node.getBoundingClientRect();
        next[item.id] = {
          x: (rect.left - canvasRect.left) / zoom,
          y: (rect.top - canvasRect.top) / zoom,
          width: rect.width / zoom,
          height: rect.height / zoom
        };
      } else {
        next[item.id] = getItemBounds(item);
      }
    });
    itemRectsRef.current = next;
  }, [items, zoom]);

  const handleItemMouseDown = (e: React.MouseEvent, item: CanvasItem) => {
    if (!canvasRef.current || editingItemId === item.id) return;
    e.stopPropagation();

    const isToggle = e.shiftKey || e.metaKey || e.ctrlKey;
    if (isToggle) {
      const alreadySelected = selectedItemIds.includes(item.id);
      const nextSelection = alreadySelected
        ? selectedItemIds.filter(id => id !== item.id)
        : [...selectedItemIds, item.id];
      onSelectItems(nextSelection);
      return;
    }

    finishEditing();

    let baseSelection = selectedItemIds;
    if (!selectedItemIds.includes(item.id)) {
      baseSelection = [item.id];
      onSelectItems(baseSelection);
    }

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const pointer = {
      x: (e.clientX - canvasRect.left) / zoom,
      y: (e.clientY - canvasRect.top) / zoom
    };

    dragStartPointer.current = pointer;
    setDraggingId(item.id);
    setActiveDragIds(baseSelection);

    const initialPositions: Record<string, Position> = {};
    baseSelection.forEach(id => {
      const target = items.find(i => i.id === id);
      if (target) {
        initialPositions[id] = { x: target.x, y: target.y };
      }
    });
    setDragInitialPositions(initialPositions);
  };

  const handleDoubleClick = (e: React.MouseEvent, item: CanvasItem) => {
    if (item.type !== ItemType.TEXT) return;
    e.stopPropagation();
    setDraggingId(null);
    onSelectItems([item.id]);
    setEditingItemId(item.id);
    setEditingValue(item.content);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || e.button !== 0) return;
    if (e.target !== canvasRef.current) return;
    finishEditing();
    onCanvasClick();

    const rect = canvasRef.current.getBoundingClientRect();
    const pointer = {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    };
    selectionStartRef.current = pointer;
    setSelectionRect({ x: pointer.x, y: pointer.y, width: 0, height: 0 });
  };

  const handleBackgroundClick = () => {
    finishEditing();
    onCanvasClick();
  };

  const handleGlobalMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!canvasRef.current) return;
      if (!draggingId && !selectionStartRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const pointerX = (e.clientX - rect.left) / zoom;
      const pointerY = (e.clientY - rect.top) / zoom;

      if (draggingId && dragStartPointer.current) {
        const anchorInitial = dragInitialPositions[draggingId];
        if (!anchorInitial) return;

        let deltaX = pointerX - dragStartPointer.current.x;
        let deltaY = pointerY - dragStartPointer.current.y;

        const movingIds = activeDragIds.length ? activeDragIds : [draggingId];
        const anchorItem = items.find(entry => entry.id === draggingId);
        if (!anchorItem) return;
        const bounds = getItemBounds(anchorItem);
        const snapped = applySnapping(
          anchorInitial.x + deltaX,
          anchorInitial.y + deltaY,
          bounds.width,
          bounds.height,
          movingIds
        );
        setGuides({ vertical: snapped.verticalGuide, horizontal: snapped.horizontalGuide });
        deltaX = snapped.x - anchorInitial.x;
        deltaY = snapped.y - anchorInitial.y;

        const updates = movingIds
          .map(id => {
            const initial = dragInitialPositions[id];
            if (!initial) return null;
            return { id, changes: { x: initial.x + deltaX, y: initial.y + deltaY } };
          })
          .filter(Boolean) as { id: string; changes: Partial<CanvasItem> }[];

        if (updates.length) {
          onUpdateItems(updates);
        }
      } else if (selectionStartRef.current) {
        setSelectionRect({
          x: Math.min(selectionStartRef.current.x, pointerX),
          y: Math.min(selectionStartRef.current.y, pointerY),
          width: Math.abs(pointerX - selectionStartRef.current.x),
          height: Math.abs(pointerY - selectionStartRef.current.y)
        });
      }
    },
    [draggingId, activeDragIds, dragInitialPositions, items, onUpdateItems, zoom, getItemBounds, applySnapping]
  );

  const handleGlobalMouseUp = useCallback(() => {
    if (draggingId) {
      setDraggingId(null);
      setActiveDragIds([]);
      setGuides({});
      dragStartPointer.current = null;
      setDragInitialPositions({});
    }

    if (selectionRect) {
      if (selectionRect.width > 3 && selectionRect.height > 3) {
        const selected = items
          .filter(item => {
            const bounds = getItemBounds(item);
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            return (
              centerX >= selectionRect.x &&
              centerX <= selectionRect.x + selectionRect.width &&
              centerY >= selectionRect.y &&
              centerY <= selectionRect.y + selectionRect.height
            );
          })
          .map(item => item.id);
        onSelectItems(selected);
      }
      setSelectionRect(null);
      selectionStartRef.current = null;
    }
  }, [draggingId, selectionRect, items, onSelectItems, getItemBounds]);

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  useEffect(() => {
    if (editingItemId && editingInputRef.current) {
      editingInputRef.current.focus();
      editingInputRef.current.select();
    }
  }, [editingItemId]);

  return (
    <div
      className="flex-1 bg-slate-200 overflow-auto flex items-center justify-center relative p-10"
      onClick={handleBackgroundClick}
      style={{
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}
    >
      <div
        id="label-canvas-container"
        ref={canvasRef}
        onMouseDownCapture={handleCanvasMouseDown}
        className="bg-white shadow-2xl relative transition-transform duration-75 ease-linear"
        style={{
          width: widthPx,
          height: heightPx,
          transform: `scale(${zoom})`,
          transformOrigin: 'center center'
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
            backgroundSize: `${10 * MM_TO_PX}px ${10 * MM_TO_PX}px`
          }}
        />

        {guides.vertical !== undefined && (
          <div
            className="absolute top-0 bottom-0 border-l-2 border-pink-500 pointer-events-none"
            style={{ left: guides.vertical }}
          />
        )}
        {guides.horizontal !== undefined && (
          <div
            className="absolute left-0 right-0 border-t-2 border-pink-500 pointer-events-none"
            style={{ top: guides.horizontal }}
          />
        )}

        {selectionRect && (
          <div
            className="absolute border border-indigo-400 bg-indigo-200/20 pointer-events-none"
            style={{
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.width,
              height: selectionRect.height
            }}
          />
        )}

        {items.map(item => {
          const isSelected = selectedItemIds.includes(item.id);
          return (
            <div
              key={item.id}
              ref={node => {
                itemRefs.current[item.id] = node;
              }}
              onMouseDown={e => handleItemMouseDown(e, item)}
              onDoubleClick={e => handleDoubleClick(e, item)}
              onClick={e => e.stopPropagation()}
              className={`absolute cursor-move select-none group hover:outline hover:outline-1 hover:outline-indigo-300 ${
                isSelected ? 'outline outline-2 outline-indigo-600 z-50' : 'z-10'
              }`}
              style={{
                left: item.x,
                top: item.y,
                width: item.type === ItemType.TEXT ? 'auto' : item.width,
                height: item.type === ItemType.TEXT ? 'auto' : item.height
              }}
            >
              {item.type === ItemType.TEXT && (
                editingItemId === item.id ? (
                  <textarea
                    ref={editingInputRef}
                    value={editingValue}
                    onChange={event => setEditingValue(event.target.value)}
                    onClick={event => event.stopPropagation()}
                    onMouseDown={event => event.stopPropagation()}
                    onBlur={finishEditing}
                    onKeyDown={event => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        finishEditing();
                      } else if (event.key === 'Escape') {
                        event.preventDefault();
                        setEditingItemId(null);
                      }
                    }}
                    className="w-full min-w-[20px] bg-white/90 border border-indigo-500 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    style={{
                      fontSize: item.fontSize,
                      fontFamily: item.fontFamily || 'Inter',
                      fontWeight: item.fontWeight || 'normal',
                      fontStyle: item.fontStyle || 'normal',
                      color: item.color || '#000',
                      textAlign: item.textAlign || 'left',
                      lineHeight: 1.2,
                      maxWidth: getTextMaxWidth(item),
                      wordBreak: 'break-word'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      fontSize: item.fontSize,
                      fontFamily: item.fontFamily || 'Inter',
                      fontWeight: item.fontWeight || 'normal',
                      fontStyle: item.fontStyle || 'normal',
                      textDecoration: item.textDecoration || 'none',
                      color: item.color || '#000',
                      textAlign: item.textAlign || 'left',
                      whiteSpace: 'pre-wrap',
                      minWidth: '20px',
                      lineHeight: 1.2,
                      maxWidth: getTextMaxWidth(item),
                      wordBreak: 'break-word'
                    }}
                  >
                    {item.content}
                  </div>
                )
              )}

              {item.type === ItemType.QR && (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(item.content)}`}
                  alt="QR Code"
                  className="w-full h-full object-contain pointer-events-none"
                  draggable={false}
                />
              )}

              {item.type === ItemType.IMAGE && (
                <img
                  src={item.content || ''}
                  alt="Img"
                  className="w-full h-full object-cover pointer-events-none"
                  draggable={false}
                  style={{ display: item.content ? 'block' : 'none' }}
                />
              )}

              {item.type === ItemType.IMAGE && !item.content && (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs border border-dashed border-slate-300">
                  Chọn ảnh
                </div>
              )}

              {isSelected && (
                <>
                  <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-indigo-600" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-indigo-600" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-indigo-600" />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-indigo-600 border border-white cursor-se-resize" />

                  <button
                    onMouseDown={e => {
                      e.stopPropagation();
                      onDeleteItem(item.id);
                    }}
                    className="absolute -top-4 -right-4 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors z-50 border-2 border-white"
                    title="Xóa (Delete)"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="absolute top-4 bg-slate-800 text-white px-3 py-1 rounded-full text-xs shadow-lg opacity-80">
        {size.width}mm x {size.height}mm
      </div>
    </div>
  );
};
