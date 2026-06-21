'use client';

import * as React from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GripVertical, Eye, EyeOff, Plus, Trash2,
  LayoutTemplate, Image, Minus, Users, FileText,
  Table, Calculator, StickyNote, Scale, AlignJustify, Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TemplateLayout, TemplateBlock, BlockType } from '@sterling/shared';
import { BLOCK_LABELS } from '@sterling/shared';

const BLOCK_ICONS: Record<BlockType, React.ElementType> = {
  'header': LayoutTemplate,
  'logo': Image,
  'divider': Minus,
  'client-info': Users,
  'invoice-meta': FileText,
  'items-table': Table,
  'totals': Calculator,
  'notes': StickyNote,
  'terms': Scale,
  'footer': AlignJustify,
  'spacer': Maximize2,
};

const ADDABLE_BLOCKS: Array<{ type: BlockType; defaultSettings: Record<string, unknown> }> = [
  { type: 'logo', defaultSettings: { alignment: 'left', height: 60 } },
  { type: 'divider', defaultSettings: { thickness: 1, color: '', style: 'solid' } },
  { type: 'notes', defaultSettings: { label: 'Notes', customText: '' } },
  { type: 'terms', defaultSettings: { label: 'Terms & Conditions', customText: '' } },
  { type: 'spacer', defaultSettings: { height: 24 } },
];

interface SortableBlockItemProps {
  block: TemplateBlock;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
}

function SortableBlockItem({ block, isSelected, onSelect, onToggleVisible, onDelete }: SortableBlockItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const Icon = BLOCK_ICONS[block.type] ?? LayoutTemplate;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        'group flex items-center gap-2 px-2 py-2 rounded-lg border cursor-pointer transition-all',
        isSelected
          ? 'border-primary/60 bg-primary/5 shadow-sm'
          : 'border-transparent hover:border-border hover:bg-surface/50',
        !block.visible && 'opacity-50',
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="cursor-grab active:cursor-grabbing text-muted hover:text-foreground transition-colors p-0.5 shrink-0 touch-none"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Icon + label */}
      <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', isSelected ? 'bg-primary/10 text-primary' : 'bg-surface text-muted')}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="flex-1 text-xs font-medium text-foreground truncate">{BLOCK_LABELS[block.type]}</span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}
          className="p-1 rounded text-muted hover:text-foreground transition-colors"
          title={block.visible ? 'Hide block' : 'Show block'}
        >
          {block.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </button>
        {!['header', 'items-table', 'totals', 'client-info', 'invoice-meta'].includes(block.type) && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded text-muted hover:text-danger transition-colors"
            title="Remove block"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

interface TemplateCanvasProps {
  layout: TemplateLayout;
  selectedBlockId: string | null;
  onLayoutChange: (layout: TemplateLayout) => void;
  onSelectBlock: (id: string | null) => void;
}

export function TemplateCanvas({ layout, selectedBlockId, onLayoutChange, onSelectBlock }: TemplateCanvasProps) {
  const [showAddMenu, setShowAddMenu] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = layout.blocks.findIndex((b) => b.id === active.id);
    const newIndex = layout.blocks.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onLayoutChange({ ...layout, blocks: arrayMove(layout.blocks, oldIndex, newIndex) });
  }

  function toggleVisible(id: string) {
    onLayoutChange({
      ...layout,
      blocks: layout.blocks.map((b) => (b.id === id ? { ...b, visible: !b.visible } : b)),
    });
  }

  function deleteBlock(id: string) {
    onLayoutChange({ ...layout, blocks: layout.blocks.filter((b) => b.id !== id) });
    if (selectedBlockId === id) onSelectBlock(null);
  }

  function addBlock(type: BlockType, defaultSettings: Record<string, unknown>) {
    const id = `${type}-${Date.now()}`;
    const newBlock: TemplateBlock = { id, type, visible: true, settings: defaultSettings };
    // Insert before footer if it exists
    const footerIdx = layout.blocks.findIndex((b) => b.type === 'footer');
    const blocks = footerIdx >= 0
      ? [...layout.blocks.slice(0, footerIdx), newBlock, ...layout.blocks.slice(footerIdx)]
      : [...layout.blocks, newBlock];
    onLayoutChange({ ...layout, blocks });
    setShowAddMenu(false);
    onSelectBlock(id);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-muted uppercase tracking-wide">Blocks</span>
        <div className="relative">
          <button
            onClick={() => setShowAddMenu((v) => !v)}
            className="flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
          <AnimatePresence>
            {showAddMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className="absolute right-0 top-full mt-1 z-20 w-48 rounded-xl border border-border bg-background shadow-xl overflow-hidden"
              >
                {ADDABLE_BLOCKS.map(({ type, defaultSettings }) => {
                  const Icon = BLOCK_ICONS[type] ?? LayoutTemplate;
                  return (
                    <button
                      key={type}
                      onClick={() => addBlock(type, defaultSettings)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-surface transition-colors"
                    >
                      <Icon className="h-3.5 w-3.5 text-muted" />
                      <span>{BLOCK_LABELS[type]}</span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={layout.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            {layout.blocks.map((block) => (
              <SortableBlockItem
                key={block.id}
                block={block}
                isSelected={selectedBlockId === block.id}
                onSelect={() => onSelectBlock(block.id)}
                onToggleVisible={() => toggleVisible(block.id)}
                onDelete={() => deleteBlock(block.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
