import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, Copy, Trash2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "¿Qué coches tengo disponibles ahora mismo?",
  "¿Qué ITV caducan o están próximas a caducar?",
  "Resume el pipeline de ventas por estado.",
  "Redacta un WhatsApp de seguimiento para un cliente interesado.",
  "Precio orientativo de venta para un Seat Ibiza 1.6 diésel de 2016 con 120.000 km.",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { messages: next },
      });
      if (error) {
        // Try to surface the function's error body when available.
        let detail = error.message;
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const j = await ctx.json();
            if (j?.error) detail = j.error;
          }
        } catch {
          /* ignore */
        }
        throw new Error(detail);
      }
      const reply = (data as any)?.reply ?? "(sin respuesta)";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      toast.error("No se pudo contactar con el asistente", { description: (e as Error).message });
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "⚠️ No se pudo obtener respuesta. Revisa la configuración del asistente e inténtalo de nuevo." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1500);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Asistente IA"
        description="Pregunta por tus datos, pide que redacte mensajes o estima precios de tasación."
        actions={
          messages.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setMessages([])}>
              <Trash2 className="mr-1 h-4 w-4" /> Limpiar
            </Button>
          ) : undefined
        }
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-base font-semibold">¿En qué te ayudo?</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Puedo consultar tu stock y tus clientes, redactar mensajes de WhatsApp o email y
                sugerir precios orientativos de tasación.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  "group relative max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm " +
                  (m.role === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm border border-border bg-card")
                }
              >
                {m.content}
                {m.role === "assistant" && (
                  <button
                    onClick={() => copy(m.content, i)}
                    title="Copiar"
                    className="absolute -right-2 -top-2 rounded-full border border-border bg-background p-1 text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100"
                  >
                    {copiedIdx === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Pensando…
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-background px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Escribe tu pregunta…  (Enter para enviar, Shift+Enter para salto de línea)"
            rows={1}
            className="max-h-40 min-h-[44px] resize-none"
            disabled={loading}
          />
          <Button onClick={() => send(input)} disabled={loading || !input.trim()} size="icon" className="h-11 w-11 shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mx-auto mt-1.5 max-w-3xl text-center text-[11px] text-muted-foreground">
          La IA puede equivocarse. Verifica precios y datos importantes antes de usarlos.
        </p>
      </div>
    </div>
  );
}
