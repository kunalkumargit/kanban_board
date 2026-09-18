import { useState, useEffect } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./App.css";

const columns = [
  { id: "todo", title: "To do", accent: "coral" },
  { id: "progress", title: "In progress", accent: "gold" },
  { id: "done", title: "Done", accent: "teal" },
];

const defaultTasks = [
  { id: 1, title: "Map the onboarding flow", status: "todo", tag: "Research", priority: "High" },
  { id: 2, title: "Write release notes for v2.4", status: "todo", tag: "Content", priority: "Low" },
  { id: 3, title: "Review dashboard empty states", status: "progress", tag: "Design", priority: "Medium" },
  { id: 4, title: "Connect analytics events", status: "progress", tag: "Engineering", priority: "High" },
  { id: 5, title: "Ship navigation updates", status: "done", tag: "Engineering", priority: "Low" },
];

const getInitialTasks = () => {
  try {
    if (typeof window === "undefined") {
      return defaultTasks;
    }

    const savedTasks = window.localStorage.getItem("kanban-tasks");
    if (!savedTasks) {
      return defaultTasks;
    }

    const parsedTasks = JSON.parse(savedTasks);
    return Array.isArray(parsedTasks) ? parsedTasks : defaultTasks;
  } catch (error) {
    return defaultTasks;
  }
};

function SortableTaskCard({ task, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const priorityClass = task.priority === "High" ? "high" : task.priority === "Low" ? "low" : "medium";
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`task-card ${priorityClass} ${isDragging ? "dragging" : ""}`}
      {...attributes}
      {...listeners}
    >
      <div className="task-top">
        <span className="tag">{task.tag}</span>
        <button
          className="delete-button"
          aria-label={`Delete ${task.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(task.id);
          }}
          type="button"
        >
          delete
        </button>
      </div>
      <p>{task.title}</p>
    </article>
  );
}

function App() {
  const [tasks, setTasks] = useState(() => getInitialTasks());
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState("Medium");
  const [searchTerm, setSearchTerm] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("kanban-tasks", JSON.stringify(tasks));
      }
    } catch (error) {
      console.error("Failed to save tasks to localStorage:", error);
    }
  }, [tasks]);

  const addTask = (event) => {
    event.preventDefault();
    if (!newTask.trim()) return;
    setTasks((currentTasks) => [
      ...currentTasks,
      { id: Date.now(), title: newTask.trim(), status: "todo", tag: "New task", priority: newPriority },
    ]);
    setNewTask("");
    setNewPriority("Medium");
  };

  const deleteTask = (id) => setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setTasks((currentTasks) => {
      const activeIndex = currentTasks.findIndex((task) => task.id === active.id);
      const overTask = currentTasks.find((task) => task.id === over.id);

      if (activeIndex === -1) {
        return currentTasks;
      }

      const activeTask = currentTasks[activeIndex];
      const targetStatus = overTask ? overTask.status : over.id;

      if (activeTask.status === targetStatus) {
        const oldIndex = currentTasks.findIndex((task) => task.id === active.id);
        const newIndex = currentTasks.findIndex((task) => task.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(currentTasks, oldIndex, newIndex);
        }
      }

      const updatedTasks = currentTasks.filter((task) => task.id !== active.id);
      const reorderedTasks = overTask
        ? (() => {
            const overIndex = updatedTasks.findIndex((task) => task.id === overTask.id);
            const taskToMove = { ...activeTask, status: targetStatus };
            const nextTasks = [...updatedTasks];
            nextTasks.splice(overIndex, 0, taskToMove);
            return nextTasks;
          })()
        : [...updatedTasks, { ...activeTask, status: targetStatus }];

      return reorderedTasks;
    });
  };

  const taskCount = tasks.length;
  const completedCount = tasks.filter((task) => task.status === "done").length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-mark">K</div>
        <div>
          <p className="eyebrow">KANBAN DASHBOARD</p>
          <h1>Work board</h1>
        </div>
      </header>

      <main>
        <section className="intro">
          <div>
            <h2>ASSIGN THE WORK....</h2>
            <p className="intro-copy">A clear view of what the team is working.</p>
          </div>
          <div className="summary"><strong>{completedCount}/{taskCount}</strong><span>tasks complete</span></div>
        </section>

        <form className="add-task" onSubmit={addTask}>
          <input aria-label="New task" type="text" placeholder="Add the task..." value={newTask} onChange={(event) => setNewTask(event.target.value)} />
          <select
            aria-label="Task priority"
            className="priority-select"
            value={newPriority}
            onChange={(event) => setNewPriority(event.target.value)}
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <button type="submit">Add Work</button>
        </form>

        <div className="search-wrap">
          <input
            className="search-input"
            aria-label="Search tasks"
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <section className="kanban-board" aria-label="Kanban board">
            {columns.map((column) => {
              const columnTasks = tasks.filter((task) => task.status === column.id);
              const filteredTasks = columnTasks.filter((task) =>
                task.title.toLowerCase().includes(searchTerm.trim().toLowerCase()),
              );

              return (
                <div className={`column ${column.accent}`} key={column.id}>
                  <div className="column-heading">
                    <div><span className="column-dot" /><h3>{column.title}</h3></div>
                    <span className="count">{filteredTasks.length}</span>
                  </div>
                  <div className="task-list">
                    <SortableContext items={filteredTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
                      {filteredTasks.map((task) => (
                        <SortableTaskCard key={task.id} task={task} onDelete={deleteTask} />
                      ))}
                    </SortableContext>
                    {filteredTasks.length === 0 && <div className="empty-state">Nothing here yet</div>}
                  </div>
                </div>
              );
            })}
          </section>
        </DndContext>
      </main>
    </div>
  );
}

export default App;