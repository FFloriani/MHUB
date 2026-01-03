# Melhoria: Exclusão Inteligente de Cabeçalhos e Rodapés na Seleção de PDF

## Contexto
Atualmente, ao selecionar texto no leitor de PDF, artefatos do documento original — como números de página impressos no topo/rodapé, colunas laterais ou títulos repetitivos — são selecionados junto com o conteúdo principal. Isso polui a cópia e a experiência visual.

## Objetivo
Implementar um filtro heurístico que detecta automaticamente textos situados nas margens extremas da página (cabeçalho/rodapé) e os torna "inselecionáveis", mantendo-os visíveis mas ignorados pelo mouse.

## Estratégia de Implementação

### Onde aplicar
No componente: `components/studies/PDFReader.tsx`.

### Como aplicar
A biblioteca `react-pdf` fornece um evento chamado `onRenderTextLayerSuccess`. Este evento é disparado assim que a camada de texto transparente é gerada. Podemos intervir neste momento.

### Algoritmo Proposto

1.  **Adicionar o Hook:**
    No componente `<Page />`, adicionar a prop `onRenderTextLayerSuccess={handleTextLayerRender}`.

2.  **Lógica do Handler:**
    ```typescript
    const handleTextLayerRender = () => {
        // Seleciona todos os spans da camada de texto da página atual
        const textSpans = document.querySelectorAll('.react-pdf__Page__textContent span');
        
        textSpans.forEach((span: HTMLElement) => {
            // Obtém a posição top relativa (vem como string "12.34px" ou porcentagem)
            const topStyle = span.style.top; 
            const topValue = parseFloat(topStyle); 
            
            // Assume que a altura da página é 100%
            // Heurística: Se o texto está nos primeiros 5% ou últimos 5% da página
            const isHeader = topValue < 5; // < 5%
            const isFooter = topValue > 95; // > 95%
            
            if (isHeader || isFooter) {
                // Adiciona classe para bloquear seleção (já definida no globals.css)
                span.classList.add('unselectable-artifact');
                span.style.userSelect = 'none';
                span.style.pointerEvents = 'none';
            }
        });
    }
    ```

3.  **Refinamento CSS:**
    Adicionar a classe visual (opcional) para debug ou apenas o bloqueio funcional.
    ```css
    .unselectable-artifact {
        user-select: none !important;
        pointer-events: none !important;
        opacity: 0.5; /* Opcional: deixar visualmente mais fraco para indicar que não é texto */
    }
    ```

## Pontos de Atenção
- **Falsos Positivos:** Títulos de capítulos que começam muito no topo podem ser bloqueados acidentalmente.
- **Configuração:** Pode ser interessante adicionar um slider nas configurações para o usuário definir a "Zona Morta" (ex: 0% a 10%), já que cada PDF tem margens diferentes.
