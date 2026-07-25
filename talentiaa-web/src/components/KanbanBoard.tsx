import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Applicant, ApplicationStage } from '../types/database';
import { Mail, Calendar, TrendingUp, GripVertical, X, Target, FileText, CheckSquare, Square, ArrowRightCircle } from 'lucide-react';

const STAGES: ApplicationStage[] = ['review', 'interview', 'offer', 'hired', 'rejected'];

interface KanbanBoardProps {
  applicants: Applicant[];
  onStageChange: (applicantId: string, newStage: ApplicationStage) => Promise<void>;
}

export default function KanbanBoard({ applicants, onStageChange }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localApplicants, setLocalApplicants] = useState<Applicant[]>(applicants);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTarget, setBulkTarget] = useState<ApplicationStage | ''>('');

  React.useEffect(() => {
    // Robust sync with prop
    setLocalApplicants(applicants || []);
  }, [applicants]);

  const columns = useMemo(() => {
    const cols: Record<ApplicationStage, Applicant[]> = {
      review: [], interview: [], offer: [], hired: [], rejected: [],
    };
    
    localApplicants.forEach(app => {
      const stage = (app.current_stage || 'review') as ApplicationStage;
      if (cols[stage]) {
        cols[stage].push(app);
      } else {
        cols['review'].push(app);
      }
    });
    return cols;
  }, [localApplicants]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    if (isActiveTask && isOverTask) {
      setLocalApplicants((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        const overIndex = prev.findIndex((t) => t.id === overId);
        const activeApp = prev[activeIndex];
        const overApp = prev[overIndex];
        
        if (activeApp.current_stage !== overApp.current_stage) {
          const newApp = [...prev];
          newApp[activeIndex] = { ...activeApp, current_stage: overApp.current_stage };
          return arrayMove(newApp, activeIndex, overIndex);
        }
        return arrayMove(prev, activeIndex, overIndex);
      });
    }

    if (isActiveTask && isOverColumn) {
      setLocalApplicants((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        const newApp = [...prev];
        newApp[activeIndex] = { ...prev[activeIndex], current_stage: overId as ApplicationStage };
        return arrayMove(newApp, activeIndex, activeIndex);
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const activeApplicant = localApplicants.find((a) => a.id === active.id);
    const originalApplicant = applicants.find((a) => a.id === active.id);
    if (activeApplicant && originalApplicant && activeApplicant.current_stage !== originalApplicant.current_stage) {
      await onStageChange(activeApplicant.id, activeApplicant.current_stage);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (stage: ApplicationStage) => {
    const stageIds = columns[stage].map(a => a.id);
    const allSelected = stageIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      stageIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const handleBulkStageChange = async () => {
    if (!bulkTarget || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    // Optimistic update
    setLocalApplicants(prev => prev.map(a => ids.includes(a.id) ? { ...a, current_stage: bulkTarget as ApplicationStage } : a));
    setSelectedIds(new Set());
    setBulkTarget('');
    // Persist each
    for (const id of ids) {
      await onStageChange(id, bulkTarget as ApplicationStage);
    }
  };

  return (
    <>
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1.25rem', background: 'var(--primary-light)', borderRadius: '14px', marginBottom: '1.25rem', animation: 'fadeIn 0.3s ease', border: '1px solid rgba(0,113,227,0.15)' }}>
          <CheckSquare size={18} color="var(--primary)" />
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedIds.size} selected</span>
          <select
            value={bulkTarget}
            onChange={e => setBulkTarget(e.target.value as ApplicationStage)}
            style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.82rem', fontWeight: 600, background: 'white', cursor: 'pointer' }}
          >
            <option value="">Move to...</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={handleBulkStageChange}
            disabled={!bulkTarget}
            className="btn btn-primary"
            style={{ padding: '0.4rem 1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: bulkTarget ? 1 : 0.5 }}
          >
            <ArrowRightCircle size={15} /> Move
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Clear
          </button>
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: '1.25rem', overflowX: 'auto', paddingBottom: '1rem', minHeight: '600px' }}>
          {STAGES.map((stage) => (
            <KanbanColumn key={stage} stage={stage} tasks={columns[stage]} onReview={setSelectedApplicant} selectedIds={selectedIds} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll} />
          ))}
        </div>
        <DragOverlay>
          {activeId ? <KanbanCard applicant={localApplicants.find(a => a.id === activeId)!} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Detail Modal */}
      {selectedApplicant && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedApplicant(null)}>
          <div style={{ background: 'white', borderRadius: '24px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedApplicant(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} />
            </button>
            <div style={{ padding: '2.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>
                   {selectedApplicant.users?.full_name?.charAt(0)}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{selectedApplicant.users?.full_name}</h2>
                  <p style={{ color: 'var(--text-muted)' }}>{selectedApplicant.users?.email}</p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ padding: '1.25rem', background: 'var(--bg-body)', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Overall Match</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{selectedApplicant.score_overall}%</div>
                </div>
                <div style={{ padding: '1.25rem', background: 'var(--bg-body)', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Stage</div>
                  <div className="badge badge-info" style={{ marginTop: '0.5rem' }}>{selectedApplicant.current_stage}</div>
                </div>
              </div>

              {selectedApplicant.score_breakdown && (
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 800 }}>
                    <Target size={18} color="var(--primary)" /> AI Analysis Breakdown
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    {['skills', 'experience', 'education'].map(key => (
                      <div key={key} style={{ textAlign: 'center', padding: '1rem', border: '1px solid var(--border-light)', borderRadius: '12px', background: 'white' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{key}</div>
                        <div style={{ fontWeight: 800, color: 'var(--secondary)', fontSize: '1.1rem' }}>{selectedApplicant.score_breakdown[key] || 0}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setSelectedApplicant(null)} className="btn btn-secondary" style={{ flex: 1, height: '48px' }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



function KanbanColumn({ stage, tasks, onReview, selectedIds, onToggleSelect, onToggleSelectAll }: { stage: ApplicationStage, tasks: Applicant[], onReview: (app: Applicant) => void, selectedIds: Set<string>, onToggleSelect: (id: string) => void, onToggleSelectAll: (stage: ApplicationStage) => void }) {
  const { setNodeRef } = useDroppable({ id: stage, data: { type: 'Column', stage } });
  const stageTitles: Record<ApplicationStage, string> = { review: 'Review', interview: 'Interview', offer: 'Offer', hired: 'Hired', rejected: 'Rejected' };
  const stageColors: Record<ApplicationStage, string> = { review: 'var(--primary)', interview: 'var(--info)', offer: 'var(--warning)', hired: 'var(--success)', rejected: 'var(--error)' };
  const allSelected = tasks.length > 0 && tasks.every(t => selectedIds.has(t.id));

  return (
    <div ref={setNodeRef} style={{ flex: '0 0 280px', background: 'var(--bg-body)', borderRadius: '16px', padding: '1.25rem', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.05em' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stageColors[stage] }} />
          {stageTitles[stage]}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {tasks.length > 0 && (
            <button onClick={() => onToggleSelectAll(stage)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }} title="Select all">
              {allSelected ? <CheckSquare size={14} color="var(--primary)" /> : <Square size={14} color="#cbd5e1" />}
            </button>
          )}
          <span style={{ fontSize: '0.75rem', fontWeight: 800, background: 'white', padding: '2px 10px', borderRadius: '12px', border: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>{tasks.length}</span>
        </div>
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tasks.map((task) => (
            <SortableKanbanCard key={task.id} applicant={task} onReview={onReview} isSelected={selectedIds.has(task.id)} onToggleSelect={onToggleSelect} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableKanbanCard({ applicant, onReview, isSelected, onToggleSelect }: { applicant: Applicant, onReview: (app: Applicant) => void, isSelected: boolean, onToggleSelect: (id: string) => void }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: applicant.id, data: { type: 'Task', applicant } });
  const style = { transition, transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.3 : 1 };
  
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard applicant={applicant} onReview={onReview} isSelected={isSelected} onToggleSelect={onToggleSelect} />
    </div>
  );
}

function KanbanCard({ applicant, isOverlay, onReview, isSelected, onToggleSelect }: { applicant: Applicant, isOverlay?: boolean, onReview?: (app: Applicant) => void, isSelected?: boolean, onToggleSelect?: (id: string) => void }) {
  const score = applicant.score_overall || 0;
  const scoreColor = score >= 70 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--error)';

  return (
    <div style={{ background: 'white', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border-light)', boxShadow: isOverlay ? 'var(--shadow-lg)' : 'var(--shadow-sm)', cursor: 'grab', position: 'relative' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
        {onToggleSelect && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onToggleSelect(applicant.id); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          >
            {isSelected ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} color="#cbd5e1" />}
          </button>
        )}
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
          {applicant.users?.full_name?.charAt(0)}
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{applicant.users?.full_name}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{applicant.users?.email}</div>
        </div>
        <GripVertical size={14} color="#cbd5e1" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
          <Calendar size={12} /> {new Date(applicant.applied_at).toLocaleDateString()}
        </div>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: scoreColor, background: `${scoreColor}10`, padding: '3px 8px', borderRadius: '6px' }}>
          {score}% Match
        </div>
      </div>

      <button 
        onPointerDown={e => e.stopPropagation()} 
        onClick={(e) => {
          e.stopPropagation();
          if (onReview) onReview(applicant);
        }}
        style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-body)', border: '1px solid var(--border-light)', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary)', cursor: 'pointer', transition: 'var(--transition)' }}
        className="review-btn"
      >
        Review Profile
      </button>

      <style>{`
        .review-btn:hover { background: var(--primary-light); color: var(--primary); border-color: var(--primary); }
      `}</style>
    </div>
  );
}
