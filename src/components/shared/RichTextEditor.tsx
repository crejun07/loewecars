import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const COLORS = [
  { label: "Predeterminado", value: "inherit" },
  { label: "Rojo", value: "#dc2626" },
  { label: "Naranja", value: "#ea580c" },
  { label: "Verde", value: "#16a34a" },
  { label: "Azul", value: "#2563eb" },
  { label: "Morado", value: "#7c3aed" },
];

const SIZES = [
  { label: "Pequeño", value: "2" },
  { label: "Normal", value: "3" },
  { label: "Grande", value: "5" },
  { label: "Muy grande", value: "6" },
];

export function sanitizeHtml(html: string) {
  return DOMPurify.sanitize(html, { ADD_ATTR: ["target", "rel"] });
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = sanitizeHtml(value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, arg);
    emit();
  }

  function emit() {
    if (ref.current) onChange(sanitizeHtml(ref.current.innerHTML));
  }

  function insertText(text: string) {
    exec("insertText", text);
  }

  function addLink() {
    const url = window.prompt("Introduce el enlace (https://…)");
    if (!url) return;
    const safe = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    exec("createLink", safe);
  }

  const btn = "h-7 w-7 p-0";

  return (
    <div className={cn("rounded-md border border-input bg-background", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-1.5 py-1">
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => exec("bold")} title="Negrita">
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => exec("italic")} title="Cursiva">
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => exec("underline")} title="Subrayado">
          <Underline className="h-3.5 w-3.5" />
        </Button>

        <Select onValueChange={(v) => exec("fontSize", v)}>
          <SelectTrigger className="h-7 w-[104px] text-xs">
            <SelectValue placeholder="Tamaño" />
          </SelectTrigger>
          <SelectContent>
            {SIZES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={(v) => exec("foreColor", v)}>
          <SelectTrigger className="h-7 w-[104px] text-xs">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            {COLORS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full border border-border"
                    style={{ background: c.value === "inherit" ? "transparent" : c.value }}
                  />
                  {c.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => exec("insertUnorderedList")} title="Viñetas">
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => exec("insertOrderedList")} title="Numeración">
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={addLink} title="Añadir enlace">
          <LinkIcon className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => insertText("← ")} title="Flecha izquierda">
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className={btn} onClick={() => insertText("→ ")} title="Flecha derecha">
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder ?? "Escribe los detalles o instrucciones…"}
        className="rich-text-area min-h-[120px] px-3 py-2 text-sm outline-none [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}