import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Loader2, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor, sanitizeHtml } from "@/components/shared/RichTextEditor";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  notes: string | null;
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

const DRAFTS_KEY = "task_note_drafts";

function readDrafts(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeDrafts(drafts: Record<string, string>) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("3");
  const [dueDate, setDueDate] = useState("");
  const [showDone, setShowDone] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => readDrafts());
  const [printing, setPrinting] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("user_tasks")
      .select("id,title,notes,priority,done,due_date")
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

  function openDetails(task: Task) {
    if (openId === task.id) {
      setOpenId(null);
      return;
    }
    setOpenId(task.id);
    setDraft(drafts[task.id] ?? task.notes ?? "");
  }

  function updateDraft(taskId: string, value: string) {
    setDraft(value);
    const next = { ...readDrafts(), [taskId]: value };
    writeDrafts(next);
    setDrafts(next);
  }

  function discardDraft(task: Task) {
    const next = { ...readDrafts() };
    delete next[task.id];
    writeDrafts(next);
    setDrafts(next);
    setDraft(task.notes ?? "");
    toast.info("Borrador descartado");
  }

  async function saveNotes(task: Task) {
    setSaving(true);
    const clean = sanitizeHtml(draft);
    const { error } = await supabase.from("user_tasks").update({ notes: clean }).eq("id", task.id);
    setSaving(false);
    if (error) return toast.error("No se pudieron guardar los detalles");
    const next = { ...readDrafts() };
    delete next[task.id];
    writeDrafts(next);
    setDrafts(next);
    toast.success("Detalles guardados");
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, notes: clean } : t)));
  }

  async function remove(task: Task) {
    const { error } = await supabase.from("user_tasks").delete().eq("id", task.id);
    if (error) return toast.error("No se pudo eliminar");
    const next = { ...readDrafts() };
    delete next[task.id];
    writeDrafts(next);
    setDrafts(next);
    load();
  }

  const sorted = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return b.priority - a.priority;
      }),
    [tasks],
  );
  const visible = showDone ? sorted : sorted.filter((t) => !t.done);

  function handlePrint() {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 50);
  }

  const printRoot = typeof document !== "undefined" ? document.getElementById("print-root") : null;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Tareas"
        description="Tu lista personal de tareas. Solo tú puedes verlas."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-1 h-4 w-4" /> Imprimir listado
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDone((v) => !v)}>
              {showDone ? "Ocultar completadas" : "Mostrar completadas"}
            </Button>
          </>
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
            {visible.map((task) => {
              const hasDraft = drafts[task.id] !== undefined && drafts[task.id] !== (task.notes ?? "");
              const previewHtml = sanitizeHtml(hasDraft ? drafts[task.id] : task.notes ?? "");
              return (
              <li
                key={task.id}
                className={cn(
                  "px-3 py-2.5",
                  task.done && "opacity-60",
                )}
              >
                <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => openDetails(task)}
                  title="Detalles"
                >
                  {openId === task.id ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <Checkbox checked={task.done} onCheckedChange={() => toggle(task)} />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm font-semibold",
                    task.done && "line-through text-muted-foreground",
                  )}
                  title={task.title}
                >
                  {task.title}
                </span>
                {hasDraft && (
                  <span className="shrink-0 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-medium text-warning-foreground">
                    Borrador
                  </span>
                )}
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
                </div>

                {openId !== task.id && previewHtml && (
                  <div
                    className="mt-1 ml-10 mr-1 line-clamp-3 text-xs text-muted-foreground [&_a]:underline [&_li]:ml-4 [&_ol]:list-decimal [&_ul]:list-disc"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                )}

                {openId === task.id && (
                  <div className="mt-3 pl-10 pr-1 pb-1">
                    <RichTextEditor value={draft} onChange={(v) => updateDraft(task.id, v)} />
                    <div className="mt-2 flex items-center justify-end gap-2">
                      {hasDraft && (
                        <span className="mr-auto text-xs text-muted-foreground">
                          Borrador sin guardar
                        </span>
                      )}
                      {hasDraft && (
                        <Button variant="ghost" size="sm" onClick={() => discardDraft(task)}>
                          Descartar borrador
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setOpenId(null)}>
                        Cerrar
                      </Button>
                      <Button size="sm" onClick={() => saveNotes(task)} disabled={saving}>
                        {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                        Guardar detalles
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );})}
          </ul>
        )}
      </div>

      {printing && printRoot &&
        createPortal(
          <div className="p-6 text-black">
            <h1 className="mb-1 text-xl font-bold">Listado de tareas</h1>
            <p className="mb-4 text-xs">{new Date().toLocaleDateString("es-ES")}</p>
            {visible.map((task) => {
              const html = sanitizeHtml(drafts[task.id] ?? task.notes ?? "");
              return (
                <div key={task.id} className="mb-4 break-inside-avoid border-b pb-3">
                  <div className="text-base font-bold">
                    {task.done ? "☑ " : "☐ "}{task.title}
                  </div>
                  <div className="text-xs">
                    {priorityLabels[task.priority]}
                    {task.due_date && ` · Fecha límite: ${new Date(task.due_date).toLocaleDateString("es-ES")}`}
                  </div>
                  {html && (
                    <div
                      className="mt-1 text-sm [&_a]:underline [&_li]:ml-4 [&_ol]:list-decimal [&_ul]:list-disc"
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  )}
                </div>
              );
            })}
          </div>,
          printRoot,
        )}
    </div>
  );
}
