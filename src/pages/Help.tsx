import { useMemo, useState } from "react";
import { Printer, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type Section = { id: string; title: string; intro: string; steps: { q: string; a: string[] }[] };

const sections: Section[] = [
  {
    id: "general", title: "Primeros pasos", intro: "Cómo entrar, moverse por la app e instalarla en el móvil.",
    steps: [
      { q: "Iniciar sesión", a: ["Escribe tu correo o tu nombre de usuario y tu contraseña.", "Pulsa «Entrar». Si no recuerdas la contraseña, pulsa «¿Olvidaste tu contraseña?», escribe tu correo o usuario y sigue el enlace que recibirás por email."] },
      { q: "Moverse por la app", a: ["El menú de la izquierda muestra solo los apartados a los que tienes permiso.", "El botón superior plega o despliega el menú.", "Para salir, pulsa «Cerrar sesión» abajo del menú."] },
      { q: "Instalar en el móvil", a: ["Abre la app en el navegador del móvil.", "iPhone (Safari): botón Compartir → «Añadir a pantalla de inicio».", "Android (Chrome): menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio»."] },
      { q: "Avisos al guardar", a: ["Antes de guardar datos nuevos la app pide confirmación en rojo para evitar errores.", "Si el DNI o la matrícula ya existen, te avisará de que está duplicado."] },
      { q: "Flechas de estado rápido", a: ["En muchas tarjetas (Ventas, Taller, Recambios, Tasaciones) verás flechas ← →.", "Púlsalas para pasar al estado anterior o siguiente sin abrir la ficha."] },
    ],
  },
  {
    id: "panel", title: "Panel", intro: "Resumen general del negocio al entrar.",
    steps: [
      { q: "Qué muestra", a: ["Cifras principales: coches en stock, ventas, tareas de taller y más.", "Al abrir la app aparece un resumen con los eventos de los próximos 7 días.", "El beneficio de vendidos solo lo ve el administrador."] },
    ],
  },
  {
    id: "agenda", title: "Agenda", intro: "Calendario de citas y avisos del equipo.",
    steps: [
      { q: "Crear un evento", a: ["Pulsa «Nuevo evento».", "Rellena título, fecha, hora y tipo.", "Elige si es solo para ti, para una persona concreta o para todo el equipo (Administración e Informática pueden crear eventos para otros).", "Guarda. Recibirás un aviso con sonido cuando llegue la hora."] },
      { q: "Avisos automáticos de ITV y BATE", a: ["El día que caduca la ITV de un coche aparece un aviso para todo el equipo a las 9:00.", "Si un coche tiene fecha BATE, aparece un aviso 30 días antes de que cumpla un año en baja temporal.", "Si cambias o borras esas fechas en Stock, el aviso se mueve o desaparece solo."] },
    ],
  },
  {
    id: "tareas", title: "Tareas", intro: "Lista personal de cosas por hacer. Solo tú ves tus tareas.",
    steps: [
      { q: "Añadir una tarea", a: ["Pulsa «Nueva tarea», escribe el título y la prioridad (P1 baja a P5 urgente).", "En las notas puedes usar negrita, cursiva, subrayado, tamaño y color de letra, listas, enlaces y flechas.", "Si cierras sin guardar, el borrador se conserva."] },
      { q: "Completar, ordenar e imprimir", a: ["Marca la casilla para darla por hecha.", "Las tareas se ordenan por prioridad, de más a menos urgente.", "Pulsa «Imprimir» para sacar el listado en papel o PDF."] },
    ],
  },
  {
    id: "clientes", title: "Clientes", intro: "Fichas de clientes y su gestor.",
    steps: [
      { q: "Dar de alta un cliente", a: ["Pulsa «Nuevo cliente».", "Rellena nombre, DNI, teléfono, email y estado.", "Elige el gestor (empleado responsable).", "Confirma el aviso rojo y guarda. Si el DNI ya existe, te avisará."] },
      { q: "Buscar y filtrar", a: ["Usa el buscador por nombre, DNI o teléfono.", "Filtra por empleado para ver solo los clientes de un gestor."] },
    ],
  },
  {
    id: "tasaciones", title: "Tasaciones", intro: "Valorar coches que nos ofrecen, en tienda u online.",
    steps: [
      { q: "Crear una tasación en tienda", a: ["Pestaña «Tienda» → «Nueva tasación».", "Sigue el asistente por categorías y pulsa los botones (combustible, cambio, estado, etc.).", "Al poner la fecha de 1ª matriculación, el año se rellena solo.", "Añade las fotos: frontal, laterales, trasera e interior (puedes usar la cámara del móvil)."] },
      { q: "Tasaciones online", a: ["Pestaña «Online» para las solicitudes que llegan por internet.", "Se gestionan igual que las de tienda."] },
      { q: "Buscar, imprimir y eliminar", a: ["Busca por cliente, DNI, teléfono o matrícula.", "Abre la tasación y pulsa «Imprimir» para la ficha, o «Eliminar» para borrarla."] },
      { q: "Pasar un coche comprado a Stock", a: ["Marca la tasación como «Comprada».", "En Stock aparecerá una solicitud de alta; al aceptarla se crea el vehículo."] },
    ],
  },
  {
    id: "ventas", title: "Ventas", intro: "Seguimiento de compradores interesados.",
    steps: [
      { q: "Registrar una venta", a: ["Pulsa «Nueva venta».", "Elige cliente y vehículo de interés (se ve marca, modelo, año y matrícula).", "Indica presupuesto, forma de pago, próximo contacto y empleado asignado."] },
      { q: "Estados y stock", a: ["Mueve la venta por las columnas con las flechas.", "Al marcarla «Reservada» o «Vendida», el coche cambia de estado en Stock automáticamente."] },
      { q: "Seguimientos", a: ["El botón de calendario muestra los próximos contactos ordenados por fecha."] },
    ],
  },
  {
    id: "stock", title: "Stock", intro: "Todos los vehículos del concesionario.",
    steps: [
      { q: "Dar de alta un vehículo", a: ["Pulsa «Nuevo vehículo».", "Rellena marca, modelo, matrícula, bastidor, CV, fecha de matriculación, kilómetros, precios, titularidad, IVA (RG o REBU), ITV, BATE y la casilla de seguro.", "Arrastra la foto del coche al recuadro (las fotos grandes se reducen solas)."] },
      { q: "Subir y ver documentación", a: ["Dentro del vehículo, en «Documentación», escribe el nombre del documento (por ejemplo «Ficha técnica»).", "Elige el archivo o arrástralo y pulsa subir.", "Aparecerá un botón «Ver Ficha técnica» para abrirlo dentro de la app."] },
      { q: "Buscar, filtrar y ordenar", a: ["Busca por marca, modelo o matrícula.", "El desplegable permite ver: Todos, Solo disponibles, En BATE, Sin ITV o ITV vencida.", "La fila de filtros por columna busca valores exactos.", "Ordena por matrícula o por fecha de alta (reciente/antiguo).", "Los vendidos están en una vista aparte."] },
      { q: "Estado del anuncio", a: ["Usa las flechas para marcar Anunciado, Pendiente o No anunciado."] },
      { q: "Solicitudes de alta", a: ["Arriba aparecen los coches comprados en Tasaciones o retirados en Subastas.", "Pulsa «Aceptar» para crearlos o «Denegar» para descartarlos."] },
    ],
  },
  {
    id: "subastas", title: "Subastas", intro: "Coches comprados en subasta hasta que llegan.",
    steps: [
      { q: "Seguimiento", a: ["Crea la subasta con el vehículo y los datos de compra.", "Marca pagado, autorización, listo y retirada (indicando quién lo trajo).", "Al marcar la retirada se crea una solicitud de alta en Stock."] },
    ],
  },
  {
    id: "taller", title: "Taller", intro: "Trabajos de mecánica organizados por coche.",
    steps: [
      { q: "Añadir tareas a un coche", a: ["Busca la tarjeta del vehículo (modelo y matrícula).", "Añade una tarea escrita o usa los botones rápidos (filtro de aceite, aire, diagnóstico…).", "Asocia recambios ya registrados en Recambios."] },
      { q: "Terminar una tarea", a: ["Márcala como realizada; pasa al historial del coche.", "Despliega «Historial» para ver todo lo hecho a ese vehículo."] },
    ],
  },
  {
    id: "recambios", title: "Recambios", intro: "Piezas pedidas a proveedores.",
    steps: [
      { q: "Pedir una pieza", a: ["Pulsa «Nuevo recambio».", "Elige el coche, escribe nombre de pieza, referencia, proveedor, coste (con decimales), fechas de pedido y entrega, encargado y propósito (garantía, propio o cliente).", "Indica forma y estado de pago."] },
      { q: "Estados", a: ["Pendiente → Pedido (en azul) → Enviado → Recibido; también Devolver, Reembolsado o Cancelado.", "Para cancelar es obligatorio escribir el motivo."] },
      { q: "Buscar y ver", a: ["Busca por nombre, referencia o matrícula.", "Cambia entre tabla y columnas; la tabla muestra 25 por página y se puede ordenar."] },
    ],
  },
  {
    id: "reclamaciones", title: "Reclamaciones", intro: "Expedientes legales con clientes o empresas.",
    steps: [
      { q: "Abrir una reclamación", a: ["Pulsa «Nueva reclamación».", "Rellena datos de la persona o empresa, vehículo, asunto, cantidad reclamada y solución pedida.", "Marca los hitos: burofax, abogado, citación, demanda, sentencia, con sus fechas."] },
      { q: "Eventos y plazos", a: ["Pulsa el icono de calendario para añadir un evento (predefinido o libre).", "Si tiene fecha límite de contestación, verás los días que quedan en color: gris (más de una semana), ámbar (7 días), rojo (3 días), rojo intenso (vencido).", "Pulsa «Contestado» cuando se responda."] },
      { q: "Documentos y PDF", a: ["Sube los PDF en la ficha; se abren dentro de la app.", "La línea de tiempo muestra todo en orden, lo más reciente arriba.", "«Imprimir PDF» genera un informe completo con todo el historial."] },
    ],
  },
  {
    id: "catalogo", title: "Catálogo", intro: "Coches disponibles para enseñar a clientes.",
    steps: [
      { q: "Imprimir una ficha", a: ["Busca el coche y pulsa «Imprimir ficha».", "Sale una página con fotos, datos y la información de contacto de Orlando Cars."] },
    ],
  },
  {
    id: "informes", title: "Informes", intro: "Todo lo hecho a un coche en una sola hoja.",
    steps: [
      { q: "Sacar el informe de un coche", a: ["Escribe la matrícula y busca.", "Verás datos del coche, historial de taller, ITV, recambios y resumen de costes.", "Pulsa «Imprimir» para guardarlo en PDF."] },
    ],
  },
  {
    id: "historial", title: "Historial", intro: "Registro de quién cambió qué y cuándo.",
    steps: [
      { q: "Consultar cambios", a: ["Cada acción queda apuntada con el usuario, la fecha y el detalle (por ejemplo «seguro activado» o «documento subido»).", "Se agrupa por días; usa el buscador y las páginas para moverte."] },
    ],
  },
  {
    id: "chat", title: "Chat", intro: "Mensajes entre compañeros.",
    steps: [
      { q: "Enviar mensajes", a: ["Elige un compañero para hablar en privado o el grupo general.", "Los mensajes nuevos suenan y aparece un número en el menú."] },
      { q: "Enviar archivos", a: ["Pulsa el icono del clip y selecciona uno o varios archivos de tu ordenador, de hasta 25 MB cada uno.", "Puedes añadir un mensaje opcional y pulsar «Enviar».", "Para guardar un archivo recibido, pulsa sobre su nombre y el icono de descarga."] },
    ],
  },
  {
    id: "ajustes", title: "Ajustes (administración)", intro: "Usuarios, roles y permisos.",
    steps: [
      { q: "Crear, editar o eliminar usuarios", a: ["Pulsa «Nuevo usuario» y rellena nombre, usuario, correo, contraseña y rol.", "Desde la lista puedes cambiar nombre, correo o contraseña, o eliminar el usuario."] },
      { q: "Permisos por rol", a: ["En la tabla de permisos marca, para cada rol y apartado, si puede ver o editar.", "El permiso «Sensible» permite ver precios de compra y márgenes.", "Quien solo puede ver verá el icono de ojo y no podrá modificar."] },
    ],
  },
];

export default function HelpPage() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return sections;
    return sections
      .map((s) => ({ ...s, steps: s.title.toLowerCase().includes(t) ? s.steps : s.steps.filter((st) => (st.q + " " + st.a.join(" ")).toLowerCase().includes(t)) }))
      .filter((s) => s.steps.length > 0);
  }, [q]);

  return (
    <div>
      <PageHeader
        title="Ayuda"
        description="Manual de uso: qué hace cada apartado y cómo se hace cada cosa"
        actions={<Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />Imprimir</Button>}
      />
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar en la ayuda (ej. ITV, documento, contraseña…)" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground">No hay resultados.</p>}
        {filtered.map((s) => (
          <section key={s.id} className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-base font-semibold">{s.title}</h2>
            <p className="mb-2 text-sm text-muted-foreground">{s.intro}</p>
            <Accordion type="multiple" defaultValue={q ? s.steps.map((_, i) => `${s.id}-${i}`) : []}>
              {s.steps.map((st, i) => (
                <AccordionItem key={i} value={`${s.id}-${i}`}>
                  <AccordionTrigger className="text-sm">{st.q}</AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal space-y-1 pl-5 text-sm">
                      {st.a.map((line, j) => <li key={j}>{line}</li>)}
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>
    </div>
  );
}
