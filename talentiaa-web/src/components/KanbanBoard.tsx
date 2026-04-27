import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
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
import { Mail, Calendar, TrendingUp } from 'lucide-react';

const STAGES: ApplicationStage[] = ['REVIEW', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];

interface KanbanBoardProps {
  applicants: Applicant[];
  onStageChange: (applicantId: string, newStage: ApplicationStage) => Promise<void>;
}

export default function KanbanBoard({ applicants, onStageChange }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localApplicants, setLocalApplicants] = useState<Applicant[]>(applicants);

  // Sync with prop changes
  React.useEffect(() => {
    setLocalApplicants(applicants);
  }, [applicants]);

  const columns = useMemo(() => {
    const cols: Record<ApplicationStage, Applicant[]> = {
      REVIEW: [],
      INTERVIEW: [],
      OFFER: [],
      HIRED: [],
      REJECTED: [],
    };
    localApplicants.forEach(app => {
      if (cols[app.current_stage]) {
        cols[app.current_stage].push(app);
      }
    });
    return cols;
  }, [localApplicants]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

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

    // Dropping a Task over another Task
    if (isActiveTask && isOverTask) {
      setLocalApplicants((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        const overIndex = prev.findIndex((t) => t.id === overId);
        
        if (prev[activeIndex].current_stage !== prev[overIndex].current_stage) {
          const newApp = [...prev];
          newApp[activeIndex].current_stage = prev[overIndex].current_stage;
          return arrayMove(newApp, activeIndex, overIndex);
        }

        return arrayMove(prev, activeIndex, overIndex);
      });
    }

    // Dropping a Task over an empty Column
    if (isActiveTask && isOverColumn) {
      setLocalApplicants((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        const newApp = [...prev];
        newApp[activeIndex].current_stage = overId as ApplicationStage;
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

  const activeTask = useMemo(() => localApplicants.find((t) => t.id === activeId), [activeId, localApplicants]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', minHeight: '500px' }}>
        {STAGES.map((stage) => (
          <KanbanColumn key={stage} stage={stage} tasks={columns[stage]} />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <KanbanCard applicant={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// ---------------- COLUMN ----------------
import { useDroppable } from '@dnd-kit/core';

interface KanbanColumnProps {
  stage: ApplicationStage;
  tasks: Applicant[];
}

function KanbanColumn({ stage, tasks }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: stage,
    data: { type: 'Column', stage },
  });

  const stageTitles: Record<ApplicationStage, string> = {
    REVIEW: 'Review',
    INTERVIEW: 'Interview',
    OFFER: 'Offer',
    HIRED: 'Hired',
    REJECTED: 'Rejected',
  };

  const stageColors: Record<ApplicationStage, string> = {
    REVIEW: '#3b82f6', // blue
    INTERVIEW: '#8b5cf6', // purple
    OFFER: '#f59e0b', // yellow
    HIRED: '#10b981', // green
    REJECTED: '#ef4444', // red
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: '0 0 300px',
        background: '#f3f4f6',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {stageTitles[stage]}
        </h3>
        <span style={{ background: stageColors[stage], color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
          {tasks.length}
        </span>
      </div>

      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div style={{ minHeight: '100px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tasks.map((task) => (
            <SortableKanbanCard key={task.id} applicant={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ---------------- CARD ----------------
interface SortableKanbanCardProps {
  applicant: Applicant;
}

function SortableKanbanCard({ applicant }: SortableKanbanCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: applicant.id,
    data: { type: 'Task', applicant },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard applicant={applicant} />
    </div>
  );
}

function KanbanCard({ applicant }: { applicant: Applicant }) {
  const score = applicant.score_overall || 0;
  let scoreColor = '#374151';
  if (score >= 80) scoreColor = '#15803d';
  else if (score >= 50) scoreColor = '#b45309';
  else scoreColor = '#b91c1c';

  return (
    <div style={{
      background: '#fff',
      padding: '12px',
      borderRadius: '8px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      cursor: 'grab',
      border: '1px solid #e5e7eb',
    }}>
      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
        {applicant.users?.full_name || 'Unknown'}
      </div>
      <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
        <Mail size={12} /> {applicant.users?.email}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280' }}>
          <Calendar size={12} /> {new Date(applicant.applied_at).toLocaleDateString()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: scoreColor }}>
          <TrendingUp size={12} /> {score}%
        </div>
      </div>
    </div>
  );
}
