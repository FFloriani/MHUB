# Correções de Responsividade - MHUB

**Data:** 02/01/2026  
**Problema:** Layout quebrando em telas pequenas/mobile

---

## 🐛 Problema Original

Quando a janela do navegador era reduzida (ou em dispositivos móveis), o site apresentava os seguintes problemas:

1. **Sidebar aparecendo em mobile:** A sidebar fixa continuava visível mesmo quando deveria estar escondida, ocupando espaço precioso
2. **Agenda (Timeline) estourando a largura:** O container da Timeline ultrapassava a largura da viewport, criando scroll horizontal indesejado na página inteira
3. **Conteúdo cortado:** Os botões de ação (Hoje, +Novo, etc) eram cortados na borda direita
4. **Elementos sobrepostos:** Em certas resoluções, a agenda e as tarefas se sobrepunham

---

## ✅ Soluções Implementadas

### 1. Sidebar CSS-First (`components/layout/Sidebar.tsx`)

**Problema:** A sidebar usava JavaScript para detectar `window.innerWidth` e aplicar classes, causando delays e inconsistências.

**Solução:** Implementação de breakpoints CSS puros do Tailwind:

```tsx
// Sidebar Desktop - visível apenas em lg+
<aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen ...">

// Sidebar Mobile - drawer overlay separado
<AnimatePresence>
  {isOpen && (
    <motion.aside className="lg:hidden fixed ...">
```

**Classes-chave:**
- `hidden lg:flex` → Invisível em mobile, visível em desktop
- Drawer mobile aparece apenas quando `isOpen=true`

---

### 2. MainLayout Overflow Control (`components/layout/MainLayout.tsx`)

**Problema:** Containers filhos podiam ultrapassar a largura do viewport.

**Solução:** Restrições de largura e overflow em múltiplos níveis:

```tsx
// Container principal
<div className={cn(
  "flex-1 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden",
  "ml-0 lg:ml-64", // Margem apenas em desktop
  ...
)}>

// Content area
<main className="flex-1 w-full max-w-full overflow-x-hidden">
```

**Classes-chave:**
- `w-full max-w-full` → Largura máxima = 100% do pai
- `overflow-x-hidden` → Corta qualquer vazamento horizontal
- `ml-0 lg:ml-64` → Margem para sidebar apenas em desktop (CSS puro)

---

### 3. Dashboard Layout Responsivo (`components/dashboard/Dashboard.tsx`)

**Problema:** O layout de duas colunas (Agenda + Tasks) não se adaptava em mobile.

**Solução:** Flex-col em mobile, flex-row em desktop:

```tsx
<PageTransition className="flex-1 flex flex-col lg:flex-row gap-8 p-4 sm:p-8 w-full">
  {/* Timeline */}
  <div className="w-full max-w-full min-w-0 lg:flex-1 lg:w-0 overflow-hidden">
    ...
  </div>

  {/* Tasks */}
  <div className="w-full lg:w-[400px] flex-shrink-0">
    ...
  </div>
</PageTransition>
```

**Classes-chave:**
- `flex-col lg:flex-row` → Empilha em mobile, lado a lado em desktop
- `lg:w-0` → Hack para forçar shrink correto em flex (apenas desktop)
- `max-w-full overflow-hidden` → Impede estouro de largura

---

### 4. CSS Global (`app/globals.css`)

**Problema:** Mesmo com restrições nos componentes, elementos internos podiam forçar scroll horizontal.

**Solução:** Regras globais no html/body:

```css
@layer base {
  html, body {
    @apply overflow-x-hidden;
    max-width: 100vw;
  }
}
```

**Efeito:** Última linha de defesa - NADA pode criar scroll horizontal.

---

### 5. Timeline Header Responsivo (`components/dashboard/Timeline.tsx`)

**Problema:** Botões de ação eram cortados em telas estreitas.

**Solução:** Layout flex-col em mobile, flex-row em desktop:

```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ...">
  {/* Navegação de data */}
  <div>...</div>
  
  {/* Botões de ação - aparecem em linha separada em mobile */}
  <div className="flex items-center gap-1.5 sm:gap-2">
    ...
  </div>
</div>
```

---

### 6. Zoom Horizontal Only (`components/dashboard/Timeline.tsx`)

**Problema:** O zoom aumentava altura E largura, fazendo a timeline "estourar" verticalmente.

**Solução:** Zoom afeta apenas `hourWidth`:

```tsx
// ANTES (errado)
const EVENT_HEIGHT = BASE_EVENT_HEIGHT * zoomLevel
const EVENT_GAP = BASE_EVENT_GAP * zoomLevel

// DEPOIS (correto)
const EVENT_HEIGHT = BASE_EVENT_HEIGHT  // Altura fixa
const EVENT_GAP = BASE_EVENT_GAP        // Gap fixo
```

---

## 📐 Breakpoints Utilizados

| Breakpoint | Largura | Comportamento |
|------------|---------|---------------|
| Default    | < 640px | Mobile pequeno |
| `sm:`      | ≥ 640px | Mobile/tablet |
| `lg:`      | ≥ 1024px | Desktop (sidebar aparece) |

---

## 🎯 Princípios Aplicados

1. **CSS-First:** Usar breakpoints Tailwind (`lg:`, `sm:`) em vez de JavaScript para layout
2. **Overflow Control:** `overflow-x-hidden` em múltiplos níveis como "rede de segurança"
3. **Max Width:** `max-w-full` em containers para nunca ultrapassar o pai
4. **Flex Shrink:** `min-w-0` para permitir que flex items encolham
5. **Mobile-First:** Layout empilhado por padrão, lado a lado apenas em desktop

---

## 📁 Arquivos Modificados

- `app/globals.css` - Regras globais de overflow
- `components/layout/MainLayout.tsx` - Container principal responsivo
- `components/layout/Sidebar.tsx` - Sidebar CSS-first
- `components/dashboard/Dashboard.tsx` - Layout de duas colunas responsivo
- `components/dashboard/Timeline.tsx` - Header e zoom responsivos

---

## ✨ Resultado Final

- ✅ Sidebar some automaticamente em mobile (< 1024px)
- ✅ Header mobile com hambúrguer aparece
- ✅ Agenda se ajusta à largura disponível
- ✅ Tasks aparecem abaixo da agenda em mobile
- ✅ Scroll horizontal apenas DENTRO da Timeline (não na página)
- ✅ Zoom funciona apenas horizontalmente
- ✅ Botões de ação sempre visíveis
