# 🎓 MHUB Studies - Plano de Implementação

## 🌟 Conceito: Knowledge Garden & Skill Tree
Transformar o estudo em um processo visual de evolução de "Skills", integrado profundamente ao fluxo de produtividade do usuário (Planner -> Execução -> Recompensa).

---

## 🏗️ Arquitetura Técnica

### Híbrida (Nuvem + Local)
1.  **Supabase (Nuvem):** Gerencia o progresso, gamificação e metadados.
    *   `subjects`: As matérias (ex: React, Inglês). Colunas: `id`, `name`, `color`, `xp`, `level`.
    *   `study_topics`: O syllabus/tópicos de cada matéria.
    *   `study_sessions`: Histórico de sessões (logs para o Heatmap).
2.  **IndexedDB (Local via Dexie.js):** Gerencia arquivos pesados.
    *   Armazena os PDFs inteiros (Blobs) e capas.
    *   Vínculo: `pdf_id` no Dexie <-> `subject_id` no Supabase.

---

## 🗺️ Jornada do Usuário (User Journey)

### 1. O Planejamento (Planner)
*   **Ação:** No Dashboard (Agenda), o usuário pode criar eventos do tipo "Intenção de Estudo".
*   **Visual:** Blocos translúcidos na timeline (ex: "Estudar React - 19h às 21h").
*   **Estado:** Inicialmente são "Planejados" (Fantasma).

### 2. A "Estante" (Tela /studies)
*   **Visual:**
    *   Topo: **Heatmap de Consistência** (Estilo GitHub) mostrando atividade nos últimos 365 dias.
    *   Grid: Cards de Matérias com **Barra de XP**, Gradientes (Indigo/Violeta/Laranja) e efeito Glassmorphism.
    *   **Upload:** Drag & drop de PDFs para dentro dos cards das matérias.

### 3. A Execução (Focus Mode)
*   **Ao clicar em uma Matéria ou Intenção:** Entra no "Modo Santuário".
*   **Interface:** Fullscreen, minimalista.
*   **Componentes:**
    *   **Leitor PDF:** Centralizado, navegação por setas.
    *   **Focus Player (Música/Ambiente):**
        *   **Formato:** Widget flutuante (Draggable Glass) que pode ser minimizado.
        *   **Input Livre:** O usuário cola qualquer link (YouTube Playlist, Vídeo de 10h Lofi, SoundCloud, etc).
        *   **Persistência:** O sistema lembra o último link tocado para cada matéria (ex: Lofi para Code, Heavy Metal para Gym).
        *   **Controles:** Play/Pause direto no widget, controle de volume independente.
    *   **Focus Timer:** Cronômetro rodando.

### 4. O Checkout (Recompensa)
*   **Ação:** Usuário clica em "Encerrar Sessão".
*   **Modal de Feedback:** O sistema pergunta: *"O que você cobriu hoje?"*
    *   Lista de Tópicos (Checklist) daquela matéria aparece.
    *   Usuário marca o que estudou.
    *   Campo opcional para "Notas Rápidas".
*   **Consequência:**
    *   Calcula XP baseado no Tempo + Tópicos.
    *   **Timeline Update:** Encontra a "Intenção" marcada para hoje e transforma em "Concluído" (Cor Sólida). Se não houver intenção, cria o bloco retroativamente.
    *   **Heatmap:** Pinta o quadradinho do dia.

---

## 🛠️ Stack & Libs
*   `dexie`: Gerenciamento fácil do IndexedDB.
*   `react-pdf`: Renderização dos livros.
*   `react-player`: Widget de música flexível (YouTube/File).
*   `react-activity-calendar`: Componente pronto para o Heatmap estilo GitHub.

---

## 📅 Fases de Implementação

### Fase 1: Fundação
1.  Setup do Dexie.js e Tabelas Supabase.
2.  Criação da Tela `/studies`.
3.  Implementação dos Cards de Matérias (CRUD básico).

### Fase 2: O Leitor (Local)
1.  Upload de PDF para o Dexie.
2.  Leitor PDF Fullscreen.
3.  Persistência de página (Lembrar onde parou).

### Fase 3: Focus Tools
1.  Focus Player (Widget Flutuante).
2.  Timer e Lógica de Sessão.

### Fase 4: Integração de Fluxo (A "Cola")
1.  Integração com Timeline (Intenções).
2.  Modal de Checkout (Checklist de Tópicos).
3.  Sistema de XP e Heatmap.

---

## 🎨 Estética (Design System)
*   **Tema:** "Deep Focus".
*   **Paleta:**
    *   Roxo/Indigo: Tecnologia/Foco.
    *   Laranja/Âmbar: Criatividade/Leitura.
    *   Verde/Esmeralda: Línguas/Natureza.
*   **Glassmorphism:** Uso pesado em modais e widgets flutuantes para manter a leveza sobre o conteúdo denso (PDFs).
