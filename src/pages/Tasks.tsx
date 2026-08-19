import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  priority: number;
  done: boolean;
  due_date: string | null;
}

const priorityLabels: Record<number, string> = {
  1: "P1 · Muy baja",
  2: "P2 · Baja",
  3: "P3 · Media",
  4: "P4 · Alta",
  5: "P5 · Máxima",
};

const priorityClass: Record<number, string> = {
  1: "bg-muted text-muted-foreground",
  2: "bg-secondary text-secondary-foreground",
  3: "bg-primary/15 text-primary",
  4: "bg-warning/20 text-warning-foreground",
  5: "bg-destructive/15 text-destructive",
};

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("3");
  const [dueDate, setDueDate] = useState("");
  const [showDone, setShowDone] = useState(true);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("user_tasks")
      .select("id,title,priority,done,due_date")
      .order("done", { ascending: true })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) toast.error("No se pudieron cargar las tareas");
    setTasks((data ?? []) as Task[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !title.trim()) return;
    const { error } = await supabase.from("user_tasks").insert({
      user_id: user.id,
      title: title.trim(),
      priority: Number(priority),
      due_date: dueDate || null,
    });
    if (error) return toast.error("No se pudo crear la tarea");
    setTitle("");
    setDueDate("");
    setPriority("3");
    load();
  }

  async function toggle(task: Task) {
    const done = !task.done;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done } : t)));
    const { error } = await supabase
      .from("user_tasks")
      .update({ done, completed_at: done ? new Date().toISOString() : null })
      .eq("id", task.id);
    if (error) toast.error("No se pudo actualizar");
    load();
  }

  async function changePriority(task: Task, value: string) {
    const { error } = await supabase.from("user_tasks").update({ priority: Number(value) }).eq("id", task.id);
    if (error) return toast.error("No se pudo actualizar la prioridad");
    load();
  }

  async function remove(task: Task) {
    const { error } = await supabase.from("user_tasks").delete().eq("id", task.id);
    if (error) return toast.error("No se pudo eliminar");
    load();
  }

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const visible = showDone ? [...pending, ...done] : pending;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Tareas"
        description="Tu lista personal de tareas. Solo tú puedes verlas."
        actions={
          <Button variant="outline" size="sm" onClick={() => setShowDone((v) => !v)}>
            {showDone ? "Ocultar completadas" : "Mostrar completadas"}
          </Button>
        }
      />

      <div className="px-6 py-5">
        <form onSubmit={addTask} className="mb-5 flex flex-col gap-2 sm:flex-row">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nueva tarea…"
            className="flex-1"
          />
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 4, 3, 2, 1].map((p) => (
                <SelectItem key={p} value={String(p)}>
                  {priorityLabels[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full sm:w-44"
          />
          <Button type="submit" disabled={!title.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Añadir
          </Button>
        </form>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No tienes tareas pendientes.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {visible.map((task) => (
              <li
                key={task.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5",
                  task.done && "opacity-60",
                )}
              >
                <Checkbox checked={task.done} onCheckedChange={() => toggle(task)} />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    task.done && "line-through text-muted-foreground",
                  )}
                  title={task.title}
                >
                  {task.title}
                </span>
                {task.due_date && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(task.due_date).toLocaleDateString("es-ES")}
                  </span>
                )}
                <Select value={String(task.priority)} onValueChange={(v) => changePriority(task, v)}>
                  <SelectTrigger
                    className={cn(
                      "h-7 w-[112px] shrink-0 border-0 text-xs font-medium",
                      priorityClass[task.priority] ?? priorityClass[3],
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((p) => (
                      <SelectItem key={p} value={String(p)}>
                        {priorityLabels[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => remove(task)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}