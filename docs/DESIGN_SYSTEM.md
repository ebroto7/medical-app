# NutriDiary Design System

## Filosofía de Diseño

NutriDiary utiliza un estilo **Neo-Brutalism moderno** caracterizado por:

- **Colores sólidos y vibrantes** sin transparencias innecesarias
- **Bordes definidos** que dan estructura visual clara
- **Tipografía bold** para jerarquía y legibilidad
- **Formas redondeadas (pill)** para elementos interactivos
- **Alto contraste** entre elementos y fondos

---

## Paleta de Colores

### Colores Base (Hue 33 - Arena cálida)
```css
--background: 33 37% 89%      /* Arena cálida */
--foreground: 0 3% 15%        /* Marrón oscuro suave */
--card: 33 35% 94%            /* Arena clara para cards */
--border: 33 25% 78%          /* Bordes arena */
--muted: 33 25% 82%           /* Fondos sutiles */
```

### Color Primario
```css
--primary: 152 70% 40%        /* Verde esmeralda */
```

### Colores de Acento (para IconBadge)
```css
--accent-orange: 25 90% 58%   /* Naranja vibrante */
--accent-yellow: 45 95% 55%   /* Amarillo brillante */
--accent-green: 152 70% 45%   /* Verde fresco */
--accent-blue: 210 85% 55%    /* Azul cielo */
--accent-red: 0 80% 55%       /* Rojo coral */
--accent-purple: 270 65% 58%  /* Púrpura suave */
```

---

## Componentes

### Buttons

**Filosofía**: Los botones usan el estilo "Pill Outline" para acciones primarias y "Soft" para secundarias. Esto crea una jerarquía visual clara sin usar colores de fondo saturados.

| Variante | Uso | Estilo |
|----------|-----|--------|
| `default` | Acción principal | Borde sólido negro, fondo transparente, hover invierte |
| `secondary` | Acción secundaria | Fondo suave (10% negro), sin borde |
| `outline` | Acción terciaria | Borde suave, hover rellena |
| `destructive` | Acciones peligrosas | Borde rojo, hover rellena rojo |
| `ghost` | Acciones sutiles | Sin fondo, hover suave |
| `link` | Enlaces de texto | Subrayado al hover |

```tsx
// Ejemplo de uso
<Button>Acción Principal</Button>
<Button variant="secondary">Cancelar</Button>
<Button variant="destructive">Eliminar</Button>
```

### Inputs y Textarea

**Filosofía**: Campos de entrada con bordes sutiles que se intensifican al focus, manteniendo consistencia con los botones.

- Borde: `border-2 border-foreground/20`
- Focus: `border-foreground` (sin ring, borde sólido)
- Border radius: `rounded-xl`
- Padding generoso para touch targets

```tsx
<Input placeholder="Escribe aquí..." />
<Textarea placeholder="Descripción..." />
<Select>
  <option>Opción 1</option>
</Select>
```

### Cards

**Filosofía**: Contenedores con bordes sutiles que destacan al hover, sin sombras excesivas.

- Borde: `border-2 border-foreground/10`
- Hover: `border-foreground/20`
- Sin sombras para mantener estética plana

```tsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    Contenido aquí
  </CardContent>
</Card>
```

### IconBadge

**Filosofía**: Iconos con fondos de colores sólidos y vibrantes, con el icono en negro para máximo contraste.

- Fondo: Color de acento sólido (naranja, azul, verde, etc.)
- Icono: Negro (`text-foreground`)
- Stroke: Más grueso (`stroke-[2.5]`) para mayor presencia

```tsx
<IconBadge icon={Heart} color="orange" />
<IconBadge icon={Users} color="blue" />
<IconBadge icon={Settings} color="muted" />
```

### Selectores de Toggle (CalendarViewSelector)

**Filosofía**: Grupos de botones con estilo pill, donde el activo invierte colores.

- Container: `rounded-full border-2 border-foreground/20`
- Activo: `bg-foreground text-background`
- Inactivo: `text-foreground/60 hover:bg-foreground/10`

---

## Tipografía

### Fuentes (Google Fonts)
| Uso | Fuente | Variable CSS | Clase Tailwind |
|-----|--------|--------------|----------------|
| **Logo** | Knewave | `--font-logo` | `font-logo` |
| **Títulos** | Archivo Black | `--font-display` | `font-display` |
| **Cuerpo** | Space Grotesk | `--font-body` | `font-body` |
| **Código/Etiquetas** | IBM Plex Mono | `--font-mono` | `font-mono` |

### Escala Neo-Brutalism
| Elemento | Tamaño | Peso | Extra |
|----------|--------|------|-------|
| h1 | `text-5xl` | `font-black` | `tracking-tight leading-none` |
| h2 | `text-3xl` | `font-bold` | `tracking-tight leading-tight` |
| h3 | `text-xl` | `font-bold` | `leading-snug` |
| h4 | `text-lg` | `font-bold` | - |
| body | `text-base` | `font-medium` | `leading-relaxed` |
| mono | `text-sm` | `font-mono` | - |

### Uso del Logo
```tsx
<span className="font-logo text-xl">NutriDiary</span>
```

---

## Principios de Interacción

1. **Hover states claros**: Los elementos interactivos cambian visiblemente al hover
2. **Inversión de colores**: El patrón principal es invertir fondo/texto en hover
3. **Transiciones suaves**: `transition-all duration-200` en todos los elementos
4. **Sin sombras en hover**: Preferimos cambios de color/borde sobre sombras

---

## Uso Consistente

### Para acciones principales:
```tsx
<Button>Guardar</Button>
```

### Para acciones secundarias:
```tsx
<Button variant="secondary">Cancelar</Button>
```

### Para navegación/explorar:
```tsx
<Button variant="outline">Ver más</Button>
```

### Para acciones peligrosas:
```tsx
<Button variant="destructive">Eliminar</Button>
```

### Para acciones sutiles:
```tsx
<Button variant="ghost">Cerrar</Button>
```

---

## Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `src/app/globals.css` | Variables CSS del tema |
| `src/components/ui/button.tsx` | Componente Button |
| `src/components/ui/input.tsx` | Componente Input |
| `src/components/ui/select.tsx` | Componente Select |
| `src/components/ui/card.tsx` | Componente Card |
| `src/components/ui/icon-badge.tsx` | Componente IconBadge |
| `tailwind.config.js` | Configuración de Tailwind con colores custom |
