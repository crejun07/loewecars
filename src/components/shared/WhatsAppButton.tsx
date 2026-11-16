import { MessageCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { normalizePhone, whatsappUrl } from "@/lib/whatsapp";

export function hasValidPhone(phone?: string | null): boolean {
  return normalizePhone(phone || "").length >= 11;
}

interface WhatsAppButtonProps {
  phone?: string | null;
  /** Person's name, used to build a friendly default greeting. */
  name?: string | null;
  /** Prefilled (editable) message. Defaults to a short greeting. */
  message?: string;
  /** Show a text label next to the icon. */
  label?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
  /** Hide the button entirely when there is no usable phone (default: show disabled). */
  hideWhenEmpty?: boolean;
}

/**
 * Opens WhatsApp (app on mobile, WhatsApp Web on desktop) in a new tab with a
 * prefilled, editable message to the given phone. Nothing is sent automatically
 * — the user reviews and presses send inside WhatsApp.
 */
export function WhatsAppButton({
  phone,
  name,
  message,
  label,
  size = "icon",
  variant = "ghost",
  className,
  hideWhenEmpty = false,
}: WhatsAppButtonProps) {
  const valid = hasValidPhone(phone);

  if (!valid && hideWhenEmpty) return null;

  const greeting = message ?? `Hola${name ? ` ${String(name).split(" ")[0]}` : ""}, `;

  const open = () => {
    if (!valid) return;
    window.open(whatsappUrl(phone as string, greeting), "_blank", "noopener,noreferrer");
  };

  const title = valid ? "Contactar por WhatsApp" : "Sin teléfono válido";

  return (
    <Button
      type="button"
      size={label ? size === "icon" ? "sm" : size : size}
      variant={variant}
      className={
        (valid ? "text-[#25D366] hover:text-[#1da851] " : "text-muted-foreground opacity-50 ") +
        (className ?? "")
      }
      disabled={!valid}
      onClick={open}
      title={title}
      aria-label={title}
    >
      <MessageCircle className={label ? "mr-1.5 h-4 w-4" : "h-3.5 w-3.5"} />
      {label}
    </Button>
  );
}
