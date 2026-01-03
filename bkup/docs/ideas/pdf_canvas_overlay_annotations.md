# Feature: Sistema de Anotações por Canvas Overlay

## Visão Geral

Implementar uma camada de desenho livre (Canvas/SVG) sobre as páginas do PDF, permitindo anotações a mão livre, marca-texto com pincel, formas geométricas e caixas de texto. Inspirado em apps premium como **GoodNotes, Notability, Xodo e Adobe Acrobat**.

---

## Arquitetura de Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                    UI / Toolbar Flutuante                   │
│      [Caneta] [Marca-Texto] [Borracha] [Formas] [Texto]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ┌─────────────────────────────────────────────────────┐  │
│    │           CAMADA 3: Canvas de Desenho (SVG)         │  │  ← Onde o usuário desenha
│    │           (pointer-events: auto quando ativo)       │  │
│    ├─────────────────────────────────────────────────────┤  │
│    │           CAMADA 2: Camada de Texto (HTML)          │  │  ← Para seleção de texto
│    │           (pointer-events: auto quando selecionando)│  │
│    ├─────────────────────────────────────────────────────┤  │
│    │           CAMADA 1: Canvas do PDF (Imagem)          │  │  ← Renderização do PDF (intocável)
│    │           (pointer-events: none)                    │  │
│    └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Comportamento de Modo

| Modo Ativo      | Camada 3 (Desenho) | Camada 2 (Texto) | Descrição                                    |
| --------------- | ------------------ | ---------------- | -------------------------------------------- |
| **Leitura**     | `none`             | `auto`           | Usuário pode selecionar texto normalmente.   |
| **Caneta**      | `auto`             | `none`           | Usuário desenha livremente.                  |
| **Marca-Texto** | `auto`             | `none`           | Usuário faz traços grossos e translúcidos.   |
| **Borracha**    | `auto`             | `none`           | Usuário apaga strokes ao tocar neles.        |
| **Formas**      | `auto`             | `none`           | Usuário desenha retângulos, círculos, setas. |
| **Texto**       | `auto`             | `none`           | Usuário clica para criar caixa de texto.     |

---

## Estrutura de Dados

### Stroke (Traço Único)

```typescript
interface Stroke {
    id: string;                      // UUID
    tool: 'pen' | 'highlighter' | 'eraser';
    color: string;                   // Hex color (ex: #FF0000)
    lineWidth: number;               // Espessura em pixels
    opacity: number;                 // 0 a 1 (marca-texto usa ~0.4)
    points: Array<{                  // Array de pontos do traço
        x: number;                   // Posição X (% da largura da página)
        y: number;                   // Posição Y (% da altura da página)
        pressure?: number;           // Pressão do stylus (0-1), opcional
    }>;
    timestamp: Date;
}
```

### Shape (Forma Geométrica)

```typescript
interface Shape {
    id: string;
    type: 'rectangle' | 'circle' | 'arrow' | 'line';
    color: string;
    lineWidth: number;
    fill?: string;                   // Cor de preenchimento (opcional)
    // Coordenadas normalizadas (%)
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    timestamp: Date;
}
```

### TextBox (Caixa de Texto)

```typescript
interface TextBox {
    id: string;
    content: string;
    x: number;                       // Posição X (%)
    y: number;                       // Posição Y (%)
    width: number;                   // Largura (%)
    fontSize: number;                // Tamanho da fonte
    fontFamily: string;
    color: string;
    backgroundColor?: string;
    timestamp: Date;
}
```

### PageAnnotations (Agregado por Página)

```typescript
interface PageAnnotations {
    id?: number;                     // ID no Dexie (auto-increment)
    fileId: number;                  // Referência ao arquivo PDF
    pageNumber: number;              // Número da página
    strokes: Stroke[];               // Todos os traços desta página
    shapes: Shape[];                 // Todas as formas
    textBoxes: TextBox[];            // Todas as caixas de texto
    lastModified: Date;
}
```

---

## Banco de Dados (Dexie - Local)

### Atualização do Schema

```typescript
// lib/db.ts

export interface PageAnnotations {
    id?: number;
    fileId: number;
    pageNumber: number;
    strokes: Stroke[];
    shapes: Shape[];
    textBoxes: TextBox[];
    lastModified: Date;
}

// Dentro do constructor do Dexie
this.version(3).stores({
    files: '++id, subjectId, name',
    playerSettings: 'subjectId',
    annotations: '++id, fileId, page_number',      // Anotações de texto (existente)
    pageAnnotations: '++id, fileId, pageNumber'    // Desenhos/Formas (NOVO)
});
```

---

## Componentes React

### Hierarquia de Componentes

```
PDFReader.tsx
├── AnnotationToolbar.tsx          // Barra de ferramentas flutuante
├── AnnotationCanvas.tsx           // Camada de desenho (SVG ou Canvas)
│   ├── StrokeRenderer.tsx         // Renderiza strokes salvos
│   ├── ShapeRenderer.tsx          // Renderiza formas salvas
│   └── TextBoxRenderer.tsx        // Renderiza caixas de texto
└── Page (react-pdf)               // PDF renderizado
```

### AnnotationToolbar.tsx

Barra flutuante vertical ou horizontal com os modos:

```
┌────────────────────────────────┐
│  ✋ [Modo Leitura]             │  ← Cursor normal, seleção de texto ativa
├────────────────────────────────┤
│  ✏️ [Caneta]    → [Cores] [Espessura]
│  🖍️ [Marca-Texto] → [Cores] [Espessura]
│  🧹 [Borracha]
│  🔲 [Formas]    → [Retângulo] [Círculo] [Seta]
│  📝 [Texto]
├────────────────────────────────┤
│  ↩️ [Desfazer]
│  ↪️ [Refazer]
│  🗑️ [Limpar Página]
└────────────────────────────────┘
```

### AnnotationCanvas.tsx

- **Tecnologia Recomendada**: SVG para melhor qualidade vetorial e facilidade de manipulação de elementos individuais (para borracha por stroke).
- **Alternativa**: HTML5 Canvas para melhor performance com muitos traços (mas borracha mais complexa).

**Decisão**: Usar **SVG** inicialmente pela facilidade de implementar "apagar stroke individual" (basta remover o elemento `<path>`).

---

## Algoritmos Chave

### 1. Captura de Traço (Pen/Highlighter)

```typescript
const handlePointerDown = (e: PointerEvent) => {
    isDrawing = true;
    currentStroke = {
        id: crypto.randomUUID(),
        tool: currentTool,
        color: currentColor,
        lineWidth: currentTool === 'highlighter' ? 20 : 2,
        opacity: currentTool === 'highlighter' ? 0.4 : 1,
        points: [normalizePoint(e)],
        timestamp: new Date()
    };
};

const handlePointerMove = (e: PointerEvent) => {
    if (!isDrawing) return;
    currentStroke.points.push(normalizePoint(e));
    requestAnimationFrame(renderCurrentStroke); // Desenha em tempo real
};

const handlePointerUp = () => {
    isDrawing = false;
    saveStroke(currentStroke); // Salva no Dexie e no state
    addToHistory(currentStroke); // Para Desfazer/Refazer
};

// Converte pixels para porcentagem da página (funciona com zoom)
const normalizePoint = (e: PointerEvent) => ({
    x: (e.offsetX / canvasWidth) * 100,
    y: (e.offsetY / canvasHeight) * 100,
    pressure: e.pressure
});
```

### 2. Suavização de Traço (Bezier Curves)

Para evitar traços "pixelados", usamos curvas de Bezier quadráticas:

```typescript
const smoothPath = (points: Point[]): string => {
    if (points.length < 2) return '';
    
    let d = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        d += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
    }
    
    // Último ponto
    const last = points[points.length - 1];
    d += ` L ${last.x} ${last.y}`;
    
    return d;
};
```

### 3. Borracha por Stroke

Ao tocar em um stroke com a borracha, detectamos qual stroke foi tocado e removemos inteiro:

```typescript
const handleEraserMove = (e: PointerEvent) => {
    const point = normalizePoint(e);
    const hitStroke = strokes.find(stroke => isPointNearPath(point, stroke.points));
    
    if (hitStroke) {
        removeStroke(hitStroke.id);
    }
};
```

---

## Fases de Implementação

### Fase 1: Fundação (MVP)
- [ ] Criar `AnnotationToolbar.tsx` com botões básicos (Leitura, Caneta)
- [ ] Criar `AnnotationCanvas.tsx` com SVG overlay
- [ ] Implementar captura de traço (pointerdown/move/up)
- [ ] Renderizar traços em tempo real
- [ ] Salvar strokes no Dexie (`pageAnnotations`)
- [ ] Carregar strokes ao abrir página

### Fase 2: Ferramentas Essenciais
- [ ] Adicionar Marca-Texto (traço grosso + opacity)
- [ ] Adicionar Borracha (por stroke)
- [ ] Adicionar seletor de cores
- [ ] Adicionar seletor de espessura
- [ ] Implementar Desfazer/Refazer (Ctrl+Z, Ctrl+Y)

### Fase 3: Formas e Texto
- [ ] Adicionar ferramenta Retângulo
- [ ] Adicionar ferramenta Círculo/Elipse
- [ ] Adicionar ferramenta Seta
- [ ] Adicionar ferramenta Caixa de Texto
- [ ] Permitir edição de texto após criação

### Fase 4: Polish e Performance
- [ ] Suavização de traços (Bezier)
- [ ] Otimização para muitos strokes (virtualização ou Canvas fallback)
- [ ] Suporte a Stylus com pressão variável
- [ ] Gestos de touch (pinch zoom com anotações)
- [ ] Exportar página como imagem (com anotações fundidas)

### Fase 5: Avançado (Futuro)
- [ ] Sincronização com nuvem (Supabase)
- [ ] Colaboração em tempo real
- [ ] Fundir anotações no PDF para download
- [ ] Reconhecimento de escrita (OCR on handwriting)
- [ ] Gravar áudio vinculado a anotação

---

## Referências Visuais

### Toolbar Style (Inspiração)

```
Design: Flutuante, vertical, glassmorphism escuro
Posição: Lateral esquerda (fixo ou arrastável)
Animação: Slide-in suave ao entrar no modo anotação

┌──────┐
│  ✋  │  ← Modo atual destacado com borda colorida
├──────┤
│  ✏️  │
│  🖍️  │
│  🧹  │
│  🔲  │
│  📝  │
├──────┤
│  ↩️  │
│  ↪️  │
└──────┘
```

### Paleta de Cores Sugerida

| Uso              | Cores                                               |
| ---------------- | --------------------------------------------------- |
| Caneta           | Preto, Azul, Vermelho, Verde, Roxo                  |
| Marca-Texto      | Amarelo, Verde Limão, Rosa, Laranja, Azul Claro     |
| UI Toolbar       | `bg-gray-900/90 backdrop-blur border-white/10`      |

---

## Considerações de UX

1. **Modo Padrão**: Sempre iniciar em "Leitura" para não atrapalhar quem só quer ler.
2. **Atalhos de Teclado**:
   - `P` = Caneta
   - `H` = Marca-Texto
   - `E` = Borracha
   - `Esc` = Voltar para Leitura
   - `Ctrl+Z` = Desfazer
   - `Ctrl+Shift+Z` ou `Ctrl+Y` = Refazer
3. **Feedback Visual**: Cursor muda conforme a ferramenta (crosshair para caneta, marcador para highlighter, etc).
4. **Salvamento Automático**: Salvar no Dexie a cada stroke finalizado (sem botão "Salvar").
5. **Indicador de Modificação**: Pequeno ícone na toolbar mostrando "não salvo" se houver sync pendente para nuvem.

---

## Riscos e Mitigações

| Risco                                  | Mitigação                                                          |
| -------------------------------------- | ------------------------------------------------------------------ |
| Performance com muitos strokes         | Usar Canvas 2D ao invés de SVG para páginas com >500 strokes       |
| Zoom/Scroll conflita com desenho       | Desabilitar gestos de navegação enquanto ferramenta ativa          |
| Perda de dados (crash do browser)      | Salvar cada stroke imediatamente no Dexie (local, instantâneo)     |
| Conflito com seleção de texto          | `pointer-events` controlado por modo ativo                         |

---

## Próximos Passos

1. **Aprovar este documento** com ajustes se necessário.
2. **Criar branch** `feature/pdf-canvas-annotations`.
3. **Implementar Fase 1** (MVP com caneta básica).
4. **Testar usabilidade** e iterar.

---

*Documento criado em: 2026-01-02*
*Autor: Antigravity AI*
*Status: Aguardando Aprovação*
