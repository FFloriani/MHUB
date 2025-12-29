# -*- coding: utf-8 -*-
"""
Agenda Pessoal - App de Rotina Diária
Desenvolvido com interface moderna e sistema de alertas com senha
Com suporte a System Tray e edição de tarefas
"""

import customtkinter as ctk
from datetime import datetime, timedelta
import threading
import time
import winsound
import tkinter as tk
from tkinter import messagebox
import json
import os
from PIL import Image, ImageDraw
import pystray
from pystray import MenuItem as item
import copy

# Configuração do tema
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

# Senha para fechar alertas
SENHA_ALERTA = "25798463"

# Arquivo de dados
ARQUIVO_ROTINA = "rotina_personalizada.json"
ARQUIVO_COMPRAS = "itens_compras.json"
ARQUIVO_LISTA_COMPRAS = "lista_compras.json"
ARQUIVO_ALERTAS = "alertas_disparados.json"
ARQUIVO_CONCLUSOES = "tarefas_concluidas.json"

# Rotina diária padrão (usada na primeira execução)
ROTINA_PADRAO = {
    "05:00": {
        "titulo": "🌅 O START - Limpeza Interna e Externa",
        "periodo": "MANHÃ",
        "cor": "#FF6B35",
        "tarefas": [
            "💧 Boca: Tome 1 Litro de Água + 1 comprimido de Vitamina C (1g)",
            "🧊 Rosto: Lave com água fria",
            "❄️ Técnica do Gelo: Mergulhe o rosto na água gelada ou passe gelo enrolado no pano"
        ]
    },
    "07:00": {
        "titulo": "☕ CAFÉ DA MANHÃ - Energia",
        "periodo": "MANHÃ",
        "cor": "#FF6B35",
        "tarefas": [
            "🍞 1 Pão (Francês ou 2 fatias)",
            "🥜 30g Pasta de Amendoim (1 colher de sopa cheia)",
            "🥚 4 Claras de Ovo (Cozidas/Mexidas) - Descarte as gemas"
        ]
    },
    "08:00": {
        "titulo": "💪 PRÉ-TREINO VASCULAR - ⛔ INÍCIO DO JEJUM DE CIGARRO",
        "periodo": "MANHÃ",
        "cor": "#E63946",
        "tarefas": [
            "🥤 O Coquetel: 200ml de Água",
            "🍠 1 Colher de Sopa de Beterraba em Pó",
            "🍋 Suco de Meio Limão",
            "💊 10g Creatina + 5g BCAA",
            "🏋️ Exercícios de Kegel: 3 séries de 15 contrações"
        ]
    },
    "09:00": {
        "titulo": "🛡️ BLINDAGEM E TREINO",
        "periodo": "PREPARAÇÃO",
        "cor": "#F77F00",
        "tarefas": [
            "☀️ Protetor Solar Facial (Toque Seco/Oil Free)",
            "🔴 ATENÇÃO: Camada generosa na NUCA e pescoço",
            "🏋️ Treino Pesado - Hipertrofia (09:00 às 10:00)",
            "🧺 Use toalha própria no banco"
        ]
    },
    "10:15": {
        "titulo": "🚿 BANHO TÁTICO - Pós-Treino",
        "periodo": "PÓS-TREINO",
        "cor": "#4ECDC4",
        "tarefas": [
            "🌡️ Temperatura: Morna para Fria",
            "🧴 Cabelo: Shampoo Jaborandi (ou Clear se caspa)",
            "🧼 Costas/Peito: Sabonete de Enxofre (Granado)",
            "🧴 Rosto/Nuca: Sabonete de Glicerina/Neutro",
            "💧 Pós-Banho: Hidratante Facial em Gel (Hydro Boost)"
        ]
    },
    "10:30": {
        "titulo": "🍗 REFEIÇÃO PÓS-TREINO - A Maior do Dia",
        "periodo": "PÓS-TREINO",
        "cor": "#4ECDC4",
        "tarefas": [
            "🍗 200g de Frango ou Peixe",
            "🍠 300g de Batata-Doce (Cozida/Assada)",
            "⚠️ Continue SEM FUMAR - corpo absorvendo nutrientes"
        ]
    },
    "11:00": {
        "titulo": "🚬 FIM DO JEJUM DE CIGARRO",
        "periodo": "TRANSIÇÃO",
        "cor": "#6B705C",
        "tarefas": [
            "✅ Liberado (mas evite se conseguir)"
        ]
    },
    "13:30": {
        "titulo": "☀️ ALMOÇO ECONÔMICO",
        "periodo": "TARDE",
        "cor": "#FFD166",
        "tarefas": [
            "🍖 150g de Proteína (Moela, Fígado, PTS ou Frango)",
            "🍠 250g de Batata-Doce (ou Arroz e Feijão)",
            "🥦 Vegetais: Brócolis ou Repolho (regula hormônios)"
        ]
    },
    "16:30": {
        "titulo": "🥚 LANCHE DA TARDE - Saciedade",
        "periodo": "TARDE",
        "cor": "#FFD166",
        "tarefas": [
            "🥚 5 Ovos INTEIROS (Cozidos)",
            "💡 As gemas e proteína te seguram sem fome até a noite"
        ]
    },
    "20:00": {
        "titulo": "🌙 JANTAR - Seca Barriga",
        "periodo": "NOITE",
        "cor": "#7B2CBF",
        "tarefas": [
            "🥚 5 Claras de Ovo OU 150g de Frango/Peixe",
            "🥗 Salada de Folhas à vontade + Fio de Azeite",
            "⛔ ZERO carboidrato pesado aqui",
            "💊 Suplemento: 1 Cápsula de NAC (600mg)"
        ]
    },
    "21:00": {
        "titulo": "🌙 RITUAL FINAL - Recuperação",
        "periodo": "NOITE",
        "cor": "#7B2CBF",
        "tarefas": [
            "🧴 Lave o rosto (Sabonete Glicerina)",
            "💈 Aplique Minoxidil na falha da bochecha e entradas",
            "💧 Passe Hidratante nas áreas sem Minoxidil",
            "💊 Tome ZMA + Melatonina",
            "🌙 Apague as luzes - O músculo cresce agora!"
        ]
    }
}

# Lista de compras padrão
LISTA_COMPRAS_PADRAO = {
    "🥬 MERCADO / FEIRA": [
        "Ovos (Mínimo 5 dúzias/mês - Base da dieta)",
        "Peito de Frango (Pós-treino)",
        "Proteína Barata (Moela, Fígado ou PTS/Soja - Almoço)",
        "Arroz Branco (Pós-treino - energia rápida)",
        "Batata-Doce (Almoço - energia lenta)",
        "Pão (Francês ou Forma)",
        "Pasta de Amendoim Integral (1kg)",
        "Gelatina Incolor e Sem Sabor (Caixinhas)",
        "Beterraba em Pó (Ou natural)",
        "Limão (Saco grande)",
        "Vegetais: Repolho ou Brócolis (Testosterona)",
        "Azeite de Oliva (Extra virgem)"
    ],
    "💊 SUPLEMENTOS (O Kit)": [
        "NAC 600mg (Limpeza Pulmão/Pele)",
        "Vitamina C 1.000mg (Pele/Imunidade - Frasco 120 caps)",
        "ZMA Ultra (Testo/Sono - Frasco concentrado)",
        "Ômega 3 (Ereção/Coração - Frasco concentrado)",
        "Creatina (Monohidratada)",
        "Melatonina (A barata de R$ 20,00 - Opcional se o ZMA não bastar)"
    ],
    "🚿 HIGIENE & BANHO": [
        "Sabonete de Enxofre (Granado Amarelo - SÓ COSTAS/PEITO)",
        "Sabonete de Glicerina (Granado/Phebo - ROSTO E NUCA)",
        "Shampoo Jaborandi (Bio Extratus - Dia a dia)",
        "Shampoo Clear (Uso 1x semana)",
        "Condicionador Floratrix (Só pontas)",
        "Yamasterol Amarelo (Pré-Poo)"
    ],
    "🧴 ESTÉTICA & BANCADA": [
        "Tônico de Jaborandi (Bio Extratus)",
        "Sérum Vitamina C (Rosto manhã)",
        "Hidratante Facial em Gel (Hydro Boost ou similar)",
        "Protetor Solar Toque Seco (Rosto e Nuca)",
        "Minoxidil (Barba/Cabelo)"
    ]
}

# Cores disponíveis para períodos
CORES_DISPONIVEIS = {
    "🟠 Laranja": "#FF6B35",
    "🔴 Vermelho": "#E63946",
    "🟡 Amarelo": "#FFD166",
    "🟢 Verde": "#4ECDC4",
    "🟣 Roxo": "#7B2CBF",
    "⚫ Cinza": "#6B705C",
    "🔵 Azul": "#00d4ff"
}

PERIODOS_DISPONIVEIS = ["MANHÃ", "PREPARAÇÃO", "TREINO", "PÓS-TREINO", "TRANSIÇÃO", "TARDE", "NOITE"]


def criar_icone_tray():
    """Cria um ícone para o system tray"""
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    draw.rounded_rectangle([4, 8, 60, 60], radius=8, fill='#00d4ff')
    draw.rounded_rectangle([4, 8, 60, 22], radius=8, fill='#E63946')
    draw.rectangle([4, 15, 60, 22], fill='#E63946')
    draw.ellipse([12, 4, 20, 12], fill='#333')
    draw.ellipse([44, 4, 52, 12], fill='#333')
    draw.line([15, 30, 50, 30], fill='white', width=2)
    draw.line([15, 40, 50, 40], fill='white', width=2)
    draw.line([15, 50, 50, 50], fill='white', width=2)
    draw.line([20, 35, 28, 43], fill='#00ff88', width=3)
    draw.line([28, 43, 45, 28], fill='#00ff88', width=3)
    
    return img


class ModalEditarTarefa(ctk.CTkToplevel):
    """Modal para editar uma tarefa"""
    
    def __init__(self, parent, horario, dados, callback_salvar):
        super().__init__(parent)
        
        self.horario_original = horario
        self.dados = copy.deepcopy(dados)
        self.callback_salvar = callback_salvar
        self.tarefas_entries = []
        
        self.title("✏️ Editar Tarefa")
        self.geometry("700x650")
        self.configure(fg_color="#1a1a2e")
        self.transient(parent)
        self.grab_set()
        
        # Centralizar
        self.update_idletasks()
        x = parent.winfo_x() + (parent.winfo_width() // 2) - 350
        y = parent.winfo_y() + (parent.winfo_height() // 2) - 325
        self.geometry(f"700x650+{x}+{y}")
        
        self.criar_interface()
    
    def criar_interface(self):
        """Cria a interface do modal"""
        
        # Scroll frame
        scroll = ctk.CTkScrollableFrame(self, fg_color="transparent")
        scroll.pack(fill="both", expand=True, padx=20, pady=20)
        
        # Título do modal
        ctk.CTkLabel(
            scroll,
            text="✏️ EDITAR TAREFA",
            font=ctk.CTkFont(family="Segoe UI", size=24, weight="bold"),
            text_color="#00d4ff"
        ).pack(pady=(0, 20))
        
        # Frame de configurações básicas
        config_frame = ctk.CTkFrame(scroll, fg_color="#0f0f23", corner_radius=10)
        config_frame.pack(fill="x", pady=10)
        
        # Horário
        horario_frame = ctk.CTkFrame(config_frame, fg_color="transparent")
        horario_frame.pack(fill="x", padx=15, pady=10)
        
        ctk.CTkLabel(
            horario_frame,
            text="🕐 Horário:",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color="white"
        ).pack(side="left")
        
        self.entry_horario = ctk.CTkEntry(
            horario_frame,
            width=100,
            height=35,
            font=ctk.CTkFont(size=14),
            placeholder_text="HH:MM"
        )
        self.entry_horario.pack(side="left", padx=10)
        self.entry_horario.insert(0, self.horario_original)
        
        # Título
        titulo_frame = ctk.CTkFrame(config_frame, fg_color="transparent")
        titulo_frame.pack(fill="x", padx=15, pady=10)
        
        ctk.CTkLabel(
            titulo_frame,
            text="📝 Título:",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color="white"
        ).pack(anchor="w")
        
        self.entry_titulo = ctk.CTkEntry(
            titulo_frame,
            height=35,
            font=ctk.CTkFont(size=14)
        )
        self.entry_titulo.pack(fill="x", pady=5)
        self.entry_titulo.insert(0, self.dados.get("titulo", ""))
        
        # Período
        periodo_frame = ctk.CTkFrame(config_frame, fg_color="transparent")
        periodo_frame.pack(fill="x", padx=15, pady=10)
        
        ctk.CTkLabel(
            periodo_frame,
            text="📅 Período:",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color="white"
        ).pack(side="left")
        
        self.combo_periodo = ctk.CTkComboBox(
            periodo_frame,
            values=PERIODOS_DISPONIVEIS,
            width=150,
            height=35,
            font=ctk.CTkFont(size=12)
        )
        self.combo_periodo.pack(side="left", padx=10)
        self.combo_periodo.set(self.dados.get("periodo", "MANHÃ"))
        
        # Cor
        cor_frame = ctk.CTkFrame(config_frame, fg_color="transparent")
        cor_frame.pack(fill="x", padx=15, pady=10)
        
        ctk.CTkLabel(
            cor_frame,
            text="🎨 Cor:",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color="white"
        ).pack(side="left")
        
        cor_atual = self.dados.get("cor", "#FF6B35")
        cor_nome = next((k for k, v in CORES_DISPONIVEIS.items() if v == cor_atual), "🟠 Laranja")
        
        self.combo_cor = ctk.CTkComboBox(
            cor_frame,
            values=list(CORES_DISPONIVEIS.keys()),
            width=150,
            height=35,
            font=ctk.CTkFont(size=12)
        )
        self.combo_cor.pack(side="left", padx=10)
        self.combo_cor.set(cor_nome)
        
        # Tarefas
        tarefas_label_frame = ctk.CTkFrame(scroll, fg_color="transparent")
        tarefas_label_frame.pack(fill="x", pady=(20, 5))
        
        ctk.CTkLabel(
            tarefas_label_frame,
            text="📋 Itens da Tarefa:",
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color="#00d4ff"
        ).pack(side="left")
        
        ctk.CTkButton(
            tarefas_label_frame,
            text="➕ Adicionar Item",
            command=self.adicionar_item,
            width=130,
            height=30,
            font=ctk.CTkFont(size=12),
            fg_color="#00ff88",
            text_color="black",
            hover_color="#00cc6a"
        ).pack(side="right")
        
        # Frame para itens das tarefas
        self.tarefas_container = ctk.CTkFrame(scroll, fg_color="#0f0f23", corner_radius=10)
        self.tarefas_container.pack(fill="x", pady=10)
        
        # Carregar tarefas existentes
        for tarefa in self.dados.get("tarefas", []):
            self.adicionar_item(tarefa)
        
        # Botões de ação
        btn_frame = ctk.CTkFrame(scroll, fg_color="transparent")
        btn_frame.pack(fill="x", pady=20)
        
        ctk.CTkButton(
            btn_frame,
            text="❌ Cancelar",
            command=self.destroy,
            width=150,
            height=40,
            font=ctk.CTkFont(size=14),
            fg_color="#666",
            hover_color="#888"
        ).pack(side="left", padx=5)
        
        ctk.CTkButton(
            btn_frame,
            text="🗑️ Excluir Tarefa",
            command=self.excluir_tarefa,
            width=150,
            height=40,
            font=ctk.CTkFont(size=14),
            fg_color="#E63946",
            hover_color="#ff6b6b"
        ).pack(side="left", padx=5)
        
        ctk.CTkButton(
            btn_frame,
            text="💾 Salvar",
            command=self.salvar,
            width=150,
            height=40,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color="#00d4ff",
            hover_color="#0099cc"
        ).pack(side="right", padx=5)
    
    def adicionar_item(self, texto=""):
        """Adiciona um campo de item"""
        item_frame = ctk.CTkFrame(self.tarefas_container, fg_color="transparent")
        item_frame.pack(fill="x", padx=10, pady=5)
        
        entry = ctk.CTkEntry(
            item_frame,
            height=35,
            font=ctk.CTkFont(size=13),
            placeholder_text="Digite o item..."
        )
        entry.pack(side="left", fill="x", expand=True, padx=(0, 10))
        if texto:
            entry.insert(0, texto)
        
        btn_remover = ctk.CTkButton(
            item_frame,
            text="🗑️",
            width=35,
            height=35,
            font=ctk.CTkFont(size=14),
            fg_color="#E63946",
            hover_color="#ff6b6b",
            command=lambda f=item_frame, e=entry: self.remover_item(f, e)
        )
        btn_remover.pack(side="right")
        
        self.tarefas_entries.append(entry)
    
    def remover_item(self, frame, entry):
        """Remove um item"""
        if entry in self.tarefas_entries:
            self.tarefas_entries.remove(entry)
        frame.destroy()
    
    def salvar(self):
        """Salva as alterações"""
        novo_horario = self.entry_horario.get().strip()
        
        # Validar horário
        try:
            datetime.strptime(novo_horario, "%H:%M")
        except ValueError:
            messagebox.showerror("Erro", "Horário inválido! Use o formato HH:MM")
            return
        
        # Coletar tarefas
        tarefas = []
        for entry in self.tarefas_entries:
            texto = entry.get().strip()
            if texto:
                tarefas.append(texto)
        
        if not tarefas:
            messagebox.showerror("Erro", "Adicione pelo menos um item à tarefa!")
            return
        
        # Montar dados
        novos_dados = {
            "titulo": self.entry_titulo.get().strip() or "Tarefa sem título",
            "periodo": self.combo_periodo.get(),
            "cor": CORES_DISPONIVEIS.get(self.combo_cor.get(), "#FF6B35"),
            "tarefas": tarefas
        }
        
        self.callback_salvar(self.horario_original, novo_horario, novos_dados)
        self.destroy()
    
    def excluir_tarefa(self):
        """Exclui a tarefa"""
        if messagebox.askyesno("Confirmar", "Tem certeza que deseja excluir esta tarefa?"):
            self.callback_salvar(self.horario_original, None, None)
            self.destroy()


class ModalNovaTarefa(ctk.CTkToplevel):
    """Modal para criar nova tarefa"""
    
    def __init__(self, parent, callback_salvar):
        super().__init__(parent)
        
        self.callback_salvar = callback_salvar
        self.tarefas_entries = []
        
        self.title("➕ Nova Tarefa")
        self.geometry("700x600")
        self.configure(fg_color="#1a1a2e")
        self.transient(parent)
        self.grab_set()
        
        # Centralizar
        self.update_idletasks()
        x = parent.winfo_x() + (parent.winfo_width() // 2) - 350
        y = parent.winfo_y() + (parent.winfo_height() // 2) - 300
        self.geometry(f"700x600+{x}+{y}")
        
        self.criar_interface()
    
    def criar_interface(self):
        """Cria a interface do modal"""
        
        scroll = ctk.CTkScrollableFrame(self, fg_color="transparent")
        scroll.pack(fill="both", expand=True, padx=20, pady=20)
        
        ctk.CTkLabel(
            scroll,
            text="➕ NOVA TAREFA",
            font=ctk.CTkFont(family="Segoe UI", size=24, weight="bold"),
            text_color="#00ff88"
        ).pack(pady=(0, 20))
        
        # Frame de configurações
        config_frame = ctk.CTkFrame(scroll, fg_color="#0f0f23", corner_radius=10)
        config_frame.pack(fill="x", pady=10)
        
        # Horário
        horario_frame = ctk.CTkFrame(config_frame, fg_color="transparent")
        horario_frame.pack(fill="x", padx=15, pady=10)
        
        ctk.CTkLabel(
            horario_frame,
            text="🕐 Horário:",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color="white"
        ).pack(side="left")
        
        self.entry_horario = ctk.CTkEntry(
            horario_frame,
            width=100,
            height=35,
            font=ctk.CTkFont(size=14),
            placeholder_text="HH:MM"
        )
        self.entry_horario.pack(side="left", padx=10)
        
        # Título
        titulo_frame = ctk.CTkFrame(config_frame, fg_color="transparent")
        titulo_frame.pack(fill="x", padx=15, pady=10)
        
        ctk.CTkLabel(
            titulo_frame,
            text="📝 Título:",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color="white"
        ).pack(anchor="w")
        
        self.entry_titulo = ctk.CTkEntry(
            titulo_frame,
            height=35,
            font=ctk.CTkFont(size=14),
            placeholder_text="Ex: 🍳 Café da Manhã"
        )
        self.entry_titulo.pack(fill="x", pady=5)
        
        # Período
        periodo_frame = ctk.CTkFrame(config_frame, fg_color="transparent")
        periodo_frame.pack(fill="x", padx=15, pady=10)
        
        ctk.CTkLabel(
            periodo_frame,
            text="📅 Período:",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color="white"
        ).pack(side="left")
        
        self.combo_periodo = ctk.CTkComboBox(
            periodo_frame,
            values=PERIODOS_DISPONIVEIS,
            width=150,
            height=35
        )
        self.combo_periodo.pack(side="left", padx=10)
        self.combo_periodo.set("MANHÃ")
        
        # Cor
        cor_frame = ctk.CTkFrame(config_frame, fg_color="transparent")
        cor_frame.pack(fill="x", padx=15, pady=10)
        
        ctk.CTkLabel(
            cor_frame,
            text="🎨 Cor:",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color="white"
        ).pack(side="left")
        
        self.combo_cor = ctk.CTkComboBox(
            cor_frame,
            values=list(CORES_DISPONIVEIS.keys()),
            width=150,
            height=35
        )
        self.combo_cor.pack(side="left", padx=10)
        self.combo_cor.set("🟠 Laranja")
        
        # Tarefas
        tarefas_label_frame = ctk.CTkFrame(scroll, fg_color="transparent")
        tarefas_label_frame.pack(fill="x", pady=(20, 5))
        
        ctk.CTkLabel(
            tarefas_label_frame,
            text="📋 Itens da Tarefa:",
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color="#00d4ff"
        ).pack(side="left")
        
        ctk.CTkButton(
            tarefas_label_frame,
            text="➕ Adicionar Item",
            command=self.adicionar_item,
            width=130,
            height=30,
            fg_color="#00ff88",
            text_color="black",
            hover_color="#00cc6a"
        ).pack(side="right")
        
        self.tarefas_container = ctk.CTkFrame(scroll, fg_color="#0f0f23", corner_radius=10)
        self.tarefas_container.pack(fill="x", pady=10)
        
        # Adicionar um item inicial
        self.adicionar_item()
        
        # Botões
        btn_frame = ctk.CTkFrame(scroll, fg_color="transparent")
        btn_frame.pack(fill="x", pady=20)
        
        ctk.CTkButton(
            btn_frame,
            text="❌ Cancelar",
            command=self.destroy,
            width=150,
            height=40,
            fg_color="#666",
            hover_color="#888"
        ).pack(side="left", padx=5)
        
        ctk.CTkButton(
            btn_frame,
            text="💾 Criar Tarefa",
            command=self.salvar,
            width=150,
            height=40,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color="#00ff88",
            text_color="black",
            hover_color="#00cc6a"
        ).pack(side="right", padx=5)
    
    def adicionar_item(self, texto=""):
        """Adiciona um campo de item"""
        item_frame = ctk.CTkFrame(self.tarefas_container, fg_color="transparent")
        item_frame.pack(fill="x", padx=10, pady=5)
        
        entry = ctk.CTkEntry(
            item_frame,
            height=35,
            font=ctk.CTkFont(size=13),
            placeholder_text="Digite o item..."
        )
        entry.pack(side="left", fill="x", expand=True, padx=(0, 10))
        if texto:
            entry.insert(0, texto)
        
        btn_remover = ctk.CTkButton(
            item_frame,
            text="🗑️",
            width=35,
            height=35,
            fg_color="#E63946",
            hover_color="#ff6b6b",
            command=lambda f=item_frame, e=entry: self.remover_item(f, e)
        )
        btn_remover.pack(side="right")
        
        self.tarefas_entries.append(entry)
    
    def remover_item(self, frame, entry):
        """Remove um item"""
        if entry in self.tarefas_entries:
            self.tarefas_entries.remove(entry)
        frame.destroy()
    
    def salvar(self):
        """Salva a nova tarefa"""
        horario = self.entry_horario.get().strip()
        
        try:
            datetime.strptime(horario, "%H:%M")
        except ValueError:
            messagebox.showerror("Erro", "Horário inválido! Use o formato HH:MM")
            return
        
        tarefas = []
        for entry in self.tarefas_entries:
            texto = entry.get().strip()
            if texto:
                tarefas.append(texto)
        
        if not tarefas:
            messagebox.showerror("Erro", "Adicione pelo menos um item à tarefa!")
            return
        
        dados = {
            "titulo": self.entry_titulo.get().strip() or "Nova Tarefa",
            "periodo": self.combo_periodo.get(),
            "cor": CORES_DISPONIVEIS.get(self.combo_cor.get(), "#FF6B35"),
            "tarefas": tarefas
        }
        
        self.callback_salvar(horario, dados)
        self.destroy()


class AlertaComSenha(ctk.CTkToplevel):
    """Janela de alerta que só fecha com a senha correta"""
    
    def __init__(self, parent, titulo, tarefas, cor):
        super().__init__(parent)
        
        self.title("⚠️ HORA DA TAREFA!")
        self.geometry("600x500")
        self.configure(fg_color="#1a1a2e")
        
        self.protocol("WM_DELETE_WINDOW", self.tentar_fechar)
        self.overrideredirect(False)
        self.attributes("-topmost", True)
        self.lift()
        self.focus_force()
        
        self.tocar_som()
        
        main_frame = ctk.CTkFrame(self, fg_color="transparent")
        main_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        header_frame = ctk.CTkFrame(main_frame, fg_color=cor, corner_radius=15)
        header_frame.pack(fill="x", pady=(0, 20))
        
        ctk.CTkLabel(
            header_frame,
            text="⏰ ALERTA DE TAREFA!",
            font=ctk.CTkFont(family="Segoe UI", size=24, weight="bold"),
            text_color="white"
        ).pack(pady=15)
        
        ctk.CTkLabel(
            main_frame,
            text=f"🕐 {datetime.now().strftime('%H:%M')}",
            font=ctk.CTkFont(family="Segoe UI", size=20),
            text_color="#00d4ff"
        ).pack()
        
        ctk.CTkLabel(
            main_frame,
            text=titulo,
            font=ctk.CTkFont(family="Segoe UI", size=18, weight="bold"),
            text_color="white",
            wraplength=550
        ).pack(pady=15)
        
        tarefas_frame = ctk.CTkFrame(main_frame, fg_color="#16213e", corner_radius=10)
        tarefas_frame.pack(fill="both", expand=True, pady=10)
        
        for tarefa in tarefas:
            ctk.CTkLabel(
                tarefas_frame,
                text=tarefa,
                font=ctk.CTkFont(family="Segoe UI", size=14),
                text_color="#e0e0e0",
                anchor="w",
                wraplength=520
            ).pack(fill="x", padx=15, pady=5)
        
        senha_frame = ctk.CTkFrame(main_frame, fg_color="#0f0f23", corner_radius=10)
        senha_frame.pack(fill="x", pady=20)
        
        ctk.CTkLabel(
            senha_frame,
            text="🔐 Digite a senha para fechar:",
            font=ctk.CTkFont(size=14),
            text_color="#888"
        ).pack(pady=(15, 5))
        
        self.entrada_senha = ctk.CTkEntry(
            senha_frame,
            placeholder_text="Senha...",
            show="*",
            width=200,
            height=40,
            font=ctk.CTkFont(size=16),
            justify="center"
        )
        self.entrada_senha.pack(pady=10)
        self.entrada_senha.bind("<Return>", lambda e: self.verificar_senha())
        
        self.label_erro = ctk.CTkLabel(
            senha_frame,
            text="",
            font=ctk.CTkFont(size=12),
            text_color="#ff4444"
        )
        self.label_erro.pack()
        
        ctk.CTkButton(
            senha_frame,
            text="✅ CONFIRMAR",
            command=self.verificar_senha,
            width=150,
            height=40,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color=cor,
            hover_color="#333"
        ).pack(pady=(5, 15))
        
        self.after(100, lambda: self.entrada_senha.focus_set())
        
        self.som_ativo = True
        self.repetir_som()
    
    def tocar_som(self):
        """Toca o arquivo de áudio hey_listen.mp3"""
        def _tocar():
            try:
                import pygame
                
                # Inicializar pygame mixer se necessário
                if not pygame.mixer.get_init():
                    pygame.mixer.init()
                
                # Caminho do arquivo de áudio
                caminho_audio = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hey_listen.mp3")
                
                if os.path.exists(caminho_audio):
                    pygame.mixer.music.load(caminho_audio)
                    pygame.mixer.music.set_volume(1.0)  # Volume máximo
                    pygame.mixer.music.play()
                else:
                    print(f"Arquivo não encontrado: {caminho_audio}")
                    # Fallback: beep simples
                    winsound.Beep(800, 500)
                    
            except Exception as e:
                print(f"Erro ao tocar áudio: {e}")
                try:
                    winsound.Beep(800, 500)
                except:
                    pass
        
        threading.Thread(target=_tocar, daemon=True).start()
    
    def repetir_som(self):
        """Repete o som enquanto o alerta estiver aberto"""
        if self.som_ativo and self.winfo_exists():
            self.tocar_som()
            self.after(8000, self.repetir_som)  # Repete a cada 8 segundos
    
    def verificar_senha(self):
        if self.entrada_senha.get() == SENHA_ALERTA:
            self.som_ativo = False
            self.destroy()
        else:
            self.label_erro.configure(text="❌ Senha incorreta!")
            self.entrada_senha.delete(0, "end")
            self.tocar_som()
    
    def tentar_fechar(self):
        self.label_erro.configure(text="⚠️ Digite a senha para fechar!")
        self.tocar_som()


class AgendaPessoal(ctk.CTk):
    """Aplicação principal da Agenda Pessoal"""
    
    def __init__(self):
        super().__init__()
        
        self.title("📋 Agenda Pessoal - Rotina Diária")
        self.geometry("1200x800")
        self.configure(fg_color="#0a0a0f")
        
        self.center_window()
        
        # Carregar dados
        self.rotina = self.carregar_rotina()
        self.alertas_ativos = True
        self.alertas_disparados = set()
        self.carregar_alertas_disparados()
        self.tarefas_concluidas = {}
        self.carregar_conclusoes()
        
        # Lista de compras
        self.checkboxes_compras = {}
        self.itens_marcados = set()
        self.lista_compras = {}
        self.carregar_lista_compras()
        self.carregar_itens_compras()
        
        # System Tray
        self.tray_icon = None
        self.tray_thread = None
        self.app_running = True
        
        self.protocol("WM_DELETE_WINDOW", self.minimizar_para_tray)
        
        self.criar_interface()
        self.iniciar_verificador_background()
        self.atualizar_relogio()
        self.atualizar_proximo_alerta()
    
    def center_window(self):
        self.update_idletasks()
        width = 1200
        height = 800
        x = (self.winfo_screenwidth() // 2) - (width // 2)
        y = (self.winfo_screenheight() // 2) - (height // 2)
        self.geometry(f"{width}x{height}+{x}+{y}")
    
    def carregar_rotina(self):
        """Carrega a rotina do arquivo ou usa a padrão"""
        try:
            if os.path.exists(ARQUIVO_ROTINA):
                with open(ARQUIVO_ROTINA, "r", encoding="utf-8") as f:
                    return json.load(f)
        except:
            pass
        return copy.deepcopy(ROTINA_PADRAO)
    
    def salvar_rotina(self):
        """Salva a rotina no arquivo"""
        try:
            with open(ARQUIVO_ROTINA, "w", encoding="utf-8") as f:
                json.dump(self.rotina, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Erro ao salvar rotina: {e}")
    
    def carregar_conclusoes(self):
        """Carrega as conclusões do dia"""
        try:
            if os.path.exists(ARQUIVO_CONCLUSOES):
                with open(ARQUIVO_CONCLUSOES, "r", encoding="utf-8") as f:
                    dados = json.load(f)
                data_hoje = datetime.now().strftime("%Y-%m-%d")
                if dados.get("data") == data_hoje:
                    self.tarefas_concluidas = dados.get("conclusoes", {})
                else:
                    self.tarefas_concluidas = {}
        except:
            self.tarefas_concluidas = {}
    
    def salvar_conclusoes(self):
        """Salva as conclusões"""
        try:
            dados = {
                "data": datetime.now().strftime("%Y-%m-%d"),
                "conclusoes": self.tarefas_concluidas
            }
            with open(ARQUIVO_CONCLUSOES, "w", encoding="utf-8") as f:
                json.dump(dados, f, ensure_ascii=False)
        except:
            pass
    
    def iniciar_tray(self):
        if self.tray_icon is not None:
            return
        
        image = criar_icone_tray()
        self.tray_icon = pystray.Icon(
            "agenda_pessoal",
            image,
            "📋 Agenda Pessoal - Rodando em segundo plano",
            menu=pystray.Menu(
                item('📋 Abrir Agenda', self.restaurar_janela, default=True),
                item('🔔 Testar Alerta', self.testar_alerta_tray),
                item('🔄 Resetar Alertas', self.resetar_alertas_tray),
                pystray.Menu.SEPARATOR,
                item('❌ Sair Completamente', self.sair_completamente)
            )
        )
        
        self.tray_thread = threading.Thread(target=self.tray_icon.run, daemon=True)
        self.tray_thread.start()
    
    def parar_tray(self):
        if self.tray_icon is not None:
            self.tray_icon.stop()
            self.tray_icon = None
    
    def minimizar_para_tray(self):
        self.withdraw()
        self.iniciar_tray()
        if self.tray_icon:
            self.tray_icon.notify("Agenda Pessoal", "🔔 App rodando em segundo plano.")
    
    def restaurar_janela(self, icon=None, item=None):
        self.after(0, self._restaurar_janela_main_thread)
    
    def _restaurar_janela_main_thread(self):
        self.deiconify()
        self.lift()
        self.focus_force()
        self.state('normal')
    
    def testar_alerta_tray(self, icon=None, item=None):
        self.after(0, self.testar_alerta)
    
    def resetar_alertas_tray(self, icon=None, item=None):
        self.alertas_disparados.clear()
        self.salvar_alertas_disparados()
        if self.tray_icon:
            self.tray_icon.notify("Agenda Pessoal", "✅ Alertas resetados!")
    
    def sair_completamente(self, icon=None, item=None):
        self.app_running = False
        self.parar_tray()
        self.after(0, self.destroy)
    
    def iniciar_verificador_background(self):
        def verificar_loop():
            while self.app_running:
                try:
                    if self.alertas_ativos:
                        hora_atual = datetime.now().strftime("%H:%M")
                        if hora_atual in self.rotina and hora_atual not in self.alertas_disparados:
                            self.alertas_disparados.add(hora_atual)
                            self.salvar_alertas_disparados()
                            self.after(0, lambda h=hora_atual: self.disparar_alerta(h))
                except Exception as e:
                    print(f"Erro: {e}")
                time.sleep(30)
        
        threading.Thread(target=verificar_loop, daemon=True).start()
    
    def criar_interface(self):
        # Header
        header = ctk.CTkFrame(self, fg_color="#1a1a2e", height=80, corner_radius=0)
        header.pack(fill="x")
        header.pack_propagate(False)
        
        header_content = ctk.CTkFrame(header, fg_color="transparent")
        header_content.pack(expand=True, fill="both", padx=30)
        
        ctk.CTkLabel(
            header_content,
            text="📋 AGENDA PESSOAL",
            font=ctk.CTkFont(family="Segoe UI", size=28, weight="bold"),
            text_color="#00d4ff"
        ).pack(side="left", pady=20)
        
        self.label_relogio = ctk.CTkLabel(
            header_content,
            text="",
            font=ctk.CTkFont(family="Consolas", size=24, weight="bold"),
            text_color="#00ff88"
        )
        self.label_relogio.pack(side="right", pady=20)
        
        self.switch_alertas = ctk.CTkSwitch(
            header_content,
            text="🔔 Alertas",
            command=self.toggle_alertas,
            font=ctk.CTkFont(size=14),
            progress_color="#00d4ff"
        )
        self.switch_alertas.pack(side="right", padx=30, pady=20)
        self.switch_alertas.select()
        
        # Container principal
        main_container = ctk.CTkFrame(self, fg_color="transparent")
        main_container.pack(fill="both", expand=True, padx=20, pady=20)
        
        self.tabview = ctk.CTkTabview(
            main_container,
            fg_color="#16213e",
            segmented_button_fg_color="#1a1a2e",
            segmented_button_selected_color="#00d4ff",
            segmented_button_unselected_color="#333"
        )
        self.tabview.pack(fill="both", expand=True)
        
        self.tab_rotina = self.tabview.add("📅 Rotina do Dia")
        self.criar_tab_rotina()
        
        tab_compras = self.tabview.add("🛒 Lista de Compras")
        self.criar_tab_compras(tab_compras)
        
        tab_controles = self.tabview.add("⚙️ Controles")
        self.criar_tab_controles(tab_controles)
    
    def criar_tab_rotina(self):
        """Cria o conteúdo da tab de rotina"""
        # Limpar tab
        for widget in self.tab_rotina.winfo_children():
            widget.destroy()
        
        # Botão de adicionar tarefa
        btn_frame = ctk.CTkFrame(self.tab_rotina, fg_color="transparent")
        btn_frame.pack(fill="x", padx=10, pady=10)
        
        ctk.CTkButton(
            btn_frame,
            text="➕ Nova Tarefa",
            command=self.abrir_modal_nova_tarefa,
            width=150,
            height=40,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color="#00ff88",
            text_color="black",
            hover_color="#00cc6a"
        ).pack(side="left")
        
        ctk.CTkButton(
            btn_frame,
            text="🔄 Resetar Conclusões",
            command=self.resetar_conclusoes,
            width=170,
            height=40,
            font=ctk.CTkFont(size=14),
            fg_color="#E63946",
            hover_color="#ff6b6b"
        ).pack(side="right")
        
        # Frame com scroll
        self.scroll_frame = ctk.CTkScrollableFrame(
            self.tab_rotina,
            fg_color="transparent",
            scrollbar_button_color="#00d4ff"
        )
        self.scroll_frame.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Agrupar por período
        periodos = {}
        for horario, dados in sorted(self.rotina.items()):
            periodo = dados.get("periodo", "MANHÃ")
            if periodo not in periodos:
                periodos[periodo] = []
            periodos[periodo].append((horario, dados))
        
        cores_periodo = {
            "MANHÃ": "#FF6B35",
            "PREPARAÇÃO": "#F77F00",
            "TREINO": "#00B894",
            "PÓS-TREINO": "#4ECDC4",
            "TRANSIÇÃO": "#6B705C",
            "TARDE": "#FFD166",
            "NOITE": "#7B2CBF"
        }
        
        for periodo in PERIODOS_DISPONIVEIS:
            if periodo not in periodos:
                continue
            
            itens = periodos[periodo]
            
            periodo_frame = ctk.CTkFrame(
                self.scroll_frame,
                fg_color=cores_periodo.get(periodo, "#333"),
                corner_radius=10
            )
            periodo_frame.pack(fill="x", pady=(15, 5))
            
            ctk.CTkLabel(
                periodo_frame,
                text=f"  {periodo}  ",
                font=ctk.CTkFont(family="Segoe UI", size=16, weight="bold"),
                text_color="white"
            ).pack(pady=8)
            
            for horario, dados in itens:
                self.criar_card_tarefa(horario, dados)
    
    def criar_card_tarefa(self, horario, dados):
        """Cria um card de tarefa"""
        hora_atual = datetime.now().strftime("%H:%M")
        tarefa_concluida = self.tarefas_concluidas.get(horario, False)
        
        card = ctk.CTkFrame(
            self.scroll_frame,
            fg_color="#1a1a2e" if not tarefa_concluida else "#0d2818",
            corner_radius=12,
            border_width=2,
            border_color=dados["cor"] if not tarefa_concluida else "#00ff88"
        )
        card.pack(fill="x", pady=5, padx=5)
        
        # Header do card
        header = ctk.CTkFrame(card, fg_color="transparent")
        header.pack(fill="x", padx=15, pady=(15, 10))
        
        # Checkbox de conclusão
        var_conclusao = ctk.BooleanVar(value=tarefa_concluida)
        check_conclusao = ctk.CTkCheckBox(
            header,
            text="",
            variable=var_conclusao,
            command=lambda h=horario, v=var_conclusao: self.toggle_conclusao(h, v),
            width=30,
            checkbox_width=24,
            checkbox_height=24,
            fg_color="#00ff88",
            border_color=dados["cor"]
        )
        check_conclusao.pack(side="left")
        
        # Horário
        ctk.CTkLabel(
            header,
            text=f"🕐 {horario}",
            font=ctk.CTkFont(family="Consolas", size=18, weight="bold"),
            text_color=dados["cor"] if not tarefa_concluida else "#00ff88"
        ).pack(side="left", padx=10)
        
        # Status
        if tarefa_concluida:
            status_text = "✅ CONCLUÍDO"
            status_color = "#00ff88"
        elif horario < hora_atual:
            status_text = "⚠️ ATRASADO"
            status_color = "#E63946"
        else:
            status_text = "⏳ Pendente"
            status_color = "#ffa500"
        
        ctk.CTkLabel(
            header,
            text=status_text,
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=status_color
        ).pack(side="right")
        
        # Botão editar
        ctk.CTkButton(
            header,
            text="✏️ Editar",
            command=lambda h=horario: self.abrir_modal_editar(h),
            width=80,
            height=28,
            font=ctk.CTkFont(size=11),
            fg_color="#333",
            hover_color=dados["cor"]
        ).pack(side="right", padx=10)
        
        # Título
        titulo_color = "white" if not tarefa_concluida else "#00ff88"
        ctk.CTkLabel(
            card,
            text=dados["titulo"],
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            text_color=titulo_color,
            anchor="w"
        ).pack(fill="x", padx=15, pady=(0, 10))
        
        # Tarefas
        for tarefa in dados.get("tarefas", []):
            texto_cor = "#ccc" if not tarefa_concluida else "#88cc88"
            ctk.CTkLabel(
                card,
                text=f"  {tarefa}",
                font=ctk.CTkFont(family="Segoe UI", size=12),
                text_color=texto_cor,
                anchor="w",
                wraplength=1000
            ).pack(fill="x", padx=15, pady=2)
        
        # Botão testar alerta
        btn_frame = ctk.CTkFrame(card, fg_color="transparent")
        btn_frame.pack(fill="x", padx=15, pady=10)
        
        ctk.CTkButton(
            btn_frame,
            text="🔔 Testar Alerta",
            command=lambda h=horario: self.disparar_alerta_manual(h),
            width=120,
            height=28,
            font=ctk.CTkFont(size=11),
            fg_color="#333",
            hover_color=dados["cor"]
        ).pack(side="right")
    
    def toggle_conclusao(self, horario, var):
        """Marca/desmarca tarefa como concluída"""
        self.tarefas_concluidas[horario] = var.get()
        self.salvar_conclusoes()
        self.criar_tab_rotina()  # Recriar para atualizar visual
    
    def resetar_conclusoes(self):
        """Reseta todas as conclusões do dia"""
        if messagebox.askyesno("Confirmar", "Resetar todas as conclusões de hoje?"):
            self.tarefas_concluidas.clear()
            self.salvar_conclusoes()
            self.criar_tab_rotina()
    
    def abrir_modal_editar(self, horario):
        """Abre o modal de edição"""
        if horario in self.rotina:
            ModalEditarTarefa(self, horario, self.rotina[horario], self.salvar_edicao)
    
    def abrir_modal_nova_tarefa(self):
        """Abre o modal de nova tarefa"""
        ModalNovaTarefa(self, self.adicionar_tarefa)
    
    def salvar_edicao(self, horario_original, novo_horario, novos_dados):
        """Salva a edição de uma tarefa"""
        # Excluir tarefa
        if novo_horario is None:
            if horario_original in self.rotina:
                del self.rotina[horario_original]
        else:
            # Remover original se mudou o horário
            if horario_original != novo_horario and horario_original in self.rotina:
                del self.rotina[horario_original]
            
            # Adicionar/atualizar
            self.rotina[novo_horario] = novos_dados
        
        self.salvar_rotina()
        self.criar_tab_rotina()
        messagebox.showinfo("Sucesso", "✅ Tarefa salva com sucesso!")
    
    def adicionar_tarefa(self, horario, dados):
        """Adiciona uma nova tarefa"""
        if horario in self.rotina:
            if not messagebox.askyesno("Conflito", f"Já existe uma tarefa às {horario}. Substituir?"):
                return
        
        self.rotina[horario] = dados
        self.salvar_rotina()
        self.criar_tab_rotina()
        messagebox.showinfo("Sucesso", "✅ Nova tarefa criada!")
    
    def criar_tab_compras(self, parent):
        """Cria o conteúdo da tab de lista de compras"""
        self.tab_compras_parent = parent
        self.recriar_tab_compras()
    
    def recriar_tab_compras(self):
        """Recria a tab de compras"""
        parent = self.tab_compras_parent
        
        # Limpar tab
        for widget in parent.winfo_children():
            widget.destroy()
        
        self.checkboxes_compras = {}
        
        # Botão adicionar categoria
        btn_frame = ctk.CTkFrame(parent, fg_color="transparent")
        btn_frame.pack(fill="x", padx=10, pady=10)
        
        ctk.CTkButton(
            btn_frame,
            text="➕ Nova Categoria",
            command=self.adicionar_categoria,
            width=160,
            height=40,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color="#00ff88",
            text_color="black",
            hover_color="#00cc6a"
        ).pack(side="left")
        
        ctk.CTkButton(
            btn_frame,
            text="🔄 Resetar Lista Padrão",
            command=self.resetar_lista_compras,
            width=180,
            height=40,
            font=ctk.CTkFont(size=14),
            fg_color="#E63946",
            hover_color="#ff6b6b"
        ).pack(side="right")
        
        scroll_frame = ctk.CTkScrollableFrame(parent, fg_color="transparent")
        scroll_frame.pack(fill="both", expand=True, padx=10, pady=10)
        
        cores_categoria = {
            "🥬 MERCADO / FEIRA": "#00ff88",
            "💊 SUPLEMENTOS (O Kit)": "#00d4ff",
            "🚿 HIGIENE & BANHO": "#4ECDC4",
            "🧴 ESTÉTICA & BANCADA": "#7B2CBF"
        }
        
        for categoria, itens in self.lista_compras.items():
            cor_cat = cores_categoria.get(categoria, "#7B2CBF")
            
            card = ctk.CTkFrame(
                scroll_frame,
                fg_color="#1a1a2e",
                corner_radius=12,
                border_width=2,
                border_color=cor_cat
            )
            card.pack(fill="x", pady=10, padx=5)
            
            # Header com botões
            header = ctk.CTkFrame(card, fg_color=cor_cat, corner_radius=8)
            header.pack(fill="x", padx=10, pady=10)
            
            ctk.CTkLabel(
                header,
                text=categoria,
                font=ctk.CTkFont(family="Segoe UI", size=18, weight="bold"),
                text_color="white"
            ).pack(side="left", padx=15, pady=10)
            
            # Botão remover categoria
            ctk.CTkButton(
                header,
                text="🗑️",
                width=35,
                height=35,
                fg_color="#aa0000",
                hover_color="#cc0000",
                command=lambda c=categoria: self.remover_categoria(c)
            ).pack(side="right", padx=5, pady=5)
            
            # Botão adicionar item
            ctk.CTkButton(
                header,
                text="➕ Item",
                width=80,
                height=35,
                fg_color="#00aa00",
                hover_color="#00cc00",
                command=lambda c=categoria: self.adicionar_item_lista(c)
            ).pack(side="right", padx=5, pady=5)
            
            # Itens
            for item_text in itens:
                item_frame = ctk.CTkFrame(card, fg_color="transparent")
                item_frame.pack(fill="x", padx=15, pady=3)
                
                item_key = f"{categoria}|{item_text}"
                
                checkbox = ctk.CTkCheckBox(
                    item_frame,
                    text=item_text,
                    font=ctk.CTkFont(size=14),
                    checkbox_width=22,
                    checkbox_height=22,
                    border_color=cor_cat,
                    fg_color=cor_cat,
                    command=lambda k=item_key: self.toggle_item_compra(k)
                )
                checkbox.pack(side="left", pady=5)
                
                # Botão remover item
                ctk.CTkButton(
                    item_frame,
                    text="✕",
                    width=28,
                    height=28,
                    font=ctk.CTkFont(size=12),
                    fg_color="#444",
                    hover_color="#E63946",
                    command=lambda c=categoria, i=item_text: self.remover_item_lista(c, i)
                ).pack(side="right")
                
                self.checkboxes_compras[item_key] = checkbox
                if item_key in self.itens_marcados:
                    checkbox.select()
            
            # Se não tem itens
            if not itens:
                ctk.CTkLabel(
                    card,
                    text="  Nenhum item. Clique em '➕ Item' para adicionar.",
                    font=ctk.CTkFont(size=12),
                    text_color="#888"
                ).pack(pady=10)
            
            ctk.CTkFrame(card, fg_color="transparent", height=10).pack()
    
    def resetar_lista_compras(self):
        """Reseta a lista de compras para o padrão"""
        if messagebox.askyesno("Confirmar", "Isso vai apagar suas personalizações e voltar à lista padrão. Continuar?"):
            self.lista_compras = copy.deepcopy(LISTA_COMPRAS_PADRAO)
            self.itens_marcados.clear()
            self.salvar_lista_compras()
            self.salvar_itens_compras()
            self.recriar_tab_compras()
    
    def criar_tab_controles(self, parent):
        """Cria o conteúdo da tab de controles"""
        container = ctk.CTkFrame(parent, fg_color="transparent")
        container.pack(fill="both", expand=True, padx=20, pady=20)
        
        # System Tray
        tray_card = ctk.CTkFrame(container, fg_color="#1a1a2e", corner_radius=12)
        tray_card.pack(fill="x", pady=10)
        
        ctk.CTkLabel(
            tray_card,
            text="🖥️ System Tray",
            font=ctk.CTkFont(size=18, weight="bold"),
            text_color="#00d4ff"
        ).pack(pady=15)
        
        ctk.CTkButton(
            tray_card,
            text="📥 Minimizar para Bandeja",
            command=self.minimizar_para_tray,
            width=250,
            height=40,
            fg_color="#7B2CBF",
            hover_color="#9B4BDF"
        ).pack(pady=10)
        
        ctk.CTkLabel(
            tray_card,
            text="O app continua rodando e os alertas funcionam",
            font=ctk.CTkFont(size=12),
            text_color="#888"
        ).pack(pady=(0, 15))
        
        # Alertas
        alertas_card = ctk.CTkFrame(container, fg_color="#1a1a2e", corner_radius=12)
        alertas_card.pack(fill="x", pady=10)
        
        ctk.CTkLabel(
            alertas_card,
            text="🔔 Controle de Alertas",
            font=ctk.CTkFont(size=18, weight="bold"),
            text_color="#00d4ff"
        ).pack(pady=15)
        
        ctk.CTkButton(
            alertas_card,
            text="🔄 Resetar Alertas do Dia",
            command=self.resetar_alertas,
            width=250,
            height=40,
            fg_color="#E63946",
            hover_color="#ff6b6b"
        ).pack(pady=10)
        
        ctk.CTkLabel(
            alertas_card,
            text="Permite que os alertas toquem novamente",
            font=ctk.CTkFont(size=12),
            text_color="#888"
        ).pack(pady=(0, 15))
        
        # Teste
        teste_card = ctk.CTkFrame(container, fg_color="#1a1a2e", corner_radius=12)
        teste_card.pack(fill="x", pady=10)
        
        ctk.CTkLabel(
            teste_card,
            text="🧪 Testar Sistema",
            font=ctk.CTkFont(size=18, weight="bold"),
            text_color="#00d4ff"
        ).pack(pady=15)
        
        ctk.CTkButton(
            teste_card,
            text="🔔 Testar Alerta Agora",
            command=self.testar_alerta,
            width=250,
            height=40,
            fg_color="#00d4ff",
            hover_color="#0099cc"
        ).pack(pady=10)
        
        ctk.CTkLabel(
            teste_card,
            text=f"Senha: {'*' * len(SENHA_ALERTA)}",
            font=ctk.CTkFont(size=12),
            text_color="#888"
        ).pack(pady=(0, 15))
        
        # Próximo alerta
        proximo_card = ctk.CTkFrame(container, fg_color="#1a1a2e", corner_radius=12)
        proximo_card.pack(fill="x", pady=10)
        
        ctk.CTkLabel(
            proximo_card,
            text="⏰ Próximo Alerta",
            font=ctk.CTkFont(size=18, weight="bold"),
            text_color="#00d4ff"
        ).pack(pady=15)
        
        self.label_proximo = ctk.CTkLabel(
            proximo_card,
            text="Calculando...",
            font=ctk.CTkFont(size=16),
            text_color="#00ff88"
        )
        self.label_proximo.pack(pady=(0, 15))
    
    def atualizar_relogio(self):
        if not self.app_running:
            return
        try:
            agora = datetime.now()
            self.label_relogio.configure(
                text=f"📅 {agora.strftime('%d/%m/%Y')}  |  🕐 {agora.strftime('%H:%M:%S')}"
            )
            self.after(1000, self.atualizar_relogio)
        except:
            pass
    
    def atualizar_proximo_alerta(self):
        if not self.app_running:
            return
        try:
            hora_atual = datetime.now().strftime("%H:%M")
            proximo = None
            for horario in sorted(self.rotina.keys()):
                if horario > hora_atual and horario not in self.alertas_disparados:
                    proximo = horario
                    break
            
            if proximo:
                dados = self.rotina[proximo]
                self.label_proximo.configure(text=f"🕐 {proximo} - {dados['titulo']}")
            else:
                self.label_proximo.configure(text="✅ Todos os alertas disparados")
            
            self.after(60000, self.atualizar_proximo_alerta)
        except:
            pass
    
    def toggle_alertas(self):
        self.alertas_ativos = self.switch_alertas.get()
    
    def disparar_alerta(self, horario):
        if horario not in self.rotina:
            return
        dados = self.rotina[horario]
        self._restaurar_janela_main_thread()
        AlertaComSenha(self, dados["titulo"], dados["tarefas"], dados["cor"])
    
    def disparar_alerta_manual(self, horario):
        if horario not in self.rotina:
            return
        dados = self.rotina[horario]
        AlertaComSenha(self, dados["titulo"], dados["tarefas"], dados["cor"])
    
    def testar_alerta(self):
        self._restaurar_janela_main_thread()
        AlertaComSenha(
            self,
            "🧪 TESTE DE ALERTA",
            ["✅ Este é um teste", "🔐 Digite a senha para fechar", "🔔 Som repete a cada 10s"],
            "#00d4ff"
        )
    
    def resetar_alertas(self):
        self.alertas_disparados.clear()
        self.salvar_alertas_disparados()
        self.atualizar_proximo_alerta()
        messagebox.showinfo("Resetado", "✅ Alertas resetados!")
    
    def toggle_item_compra(self, item_key):
        if item_key in self.itens_marcados:
            self.itens_marcados.remove(item_key)
        else:
            self.itens_marcados.add(item_key)
        self.salvar_itens_compras()
    
    def salvar_alertas_disparados(self):
        try:
            dados = {
                "data": datetime.now().strftime("%Y-%m-%d"),
                "alertas": list(self.alertas_disparados)
            }
            with open(ARQUIVO_ALERTAS, "w") as f:
                json.dump(dados, f)
        except:
            pass
    
    def carregar_alertas_disparados(self):
        try:
            if os.path.exists(ARQUIVO_ALERTAS):
                with open(ARQUIVO_ALERTAS, "r") as f:
                    dados = json.load(f)
                if dados.get("data") == datetime.now().strftime("%Y-%m-%d"):
                    self.alertas_disparados = set(dados.get("alertas", []))
                else:
                    self.alertas_disparados = set()
        except:
            self.alertas_disparados = set()
    
    def salvar_itens_compras(self):
        try:
            with open(ARQUIVO_COMPRAS, "w", encoding="utf-8") as f:
                json.dump(list(self.itens_marcados), f, ensure_ascii=False)
        except:
            pass
    
    def carregar_itens_compras(self):
        try:
            if os.path.exists(ARQUIVO_COMPRAS):
                with open(ARQUIVO_COMPRAS, "r", encoding="utf-8") as f:
                    self.itens_marcados = set(json.load(f))
            else:
                self.itens_marcados = set()
        except:
            self.itens_marcados = set()
    
    def carregar_lista_compras(self):
        """Carrega a lista de compras personalizada"""
        try:
            if os.path.exists(ARQUIVO_LISTA_COMPRAS):
                with open(ARQUIVO_LISTA_COMPRAS, "r", encoding="utf-8") as f:
                    self.lista_compras = json.load(f)
            else:
                self.lista_compras = copy.deepcopy(LISTA_COMPRAS_PADRAO)
                self.salvar_lista_compras()
        except:
            self.lista_compras = copy.deepcopy(LISTA_COMPRAS_PADRAO)
    
    def salvar_lista_compras(self):
        """Salva a lista de compras personalizada"""
        try:
            with open(ARQUIVO_LISTA_COMPRAS, "w", encoding="utf-8") as f:
                json.dump(self.lista_compras, f, ensure_ascii=False, indent=2)
        except:
            pass
    
    def adicionar_item_lista(self, categoria):
        """Adiciona um item à lista de compras"""
        dialog = ctk.CTkInputDialog(
            text=f"Digite o nome do item para {categoria}:",
            title="Adicionar Item"
        )
        texto = dialog.get_input()
        
        if texto and texto.strip():
            if categoria in self.lista_compras:
                if texto.strip() not in self.lista_compras[categoria]:
                    self.lista_compras[categoria].append(texto.strip())
                    self.salvar_lista_compras()
                    self.recriar_tab_compras()
                else:
                    messagebox.showinfo("Info", "Este item já existe na lista!")
    
    def remover_item_lista(self, categoria, item):
        """Remove um item da lista de compras"""
        if categoria in self.lista_compras:
            if item in self.lista_compras[categoria]:
                self.lista_compras[categoria].remove(item)
                # Remover também dos marcados
                item_key = f"{categoria}|{item}"
                if item_key in self.itens_marcados:
                    self.itens_marcados.remove(item_key)
                    self.salvar_itens_compras()
                self.salvar_lista_compras()
                self.recriar_tab_compras()
    
    def adicionar_categoria(self):
        """Adiciona uma nova categoria"""
        dialog = ctk.CTkInputDialog(
            text="Digite o nome da categoria (ex: 🏠 Casa):",
            title="Nova Categoria"
        )
        texto = dialog.get_input()
        
        if texto and texto.strip():
            if texto.strip() not in self.lista_compras:
                self.lista_compras[texto.strip()] = []
                self.salvar_lista_compras()
                self.recriar_tab_compras()
            else:
                messagebox.showinfo("Info", "Esta categoria já existe!")
    
    def remover_categoria(self, categoria):
        """Remove uma categoria inteira"""
        if messagebox.askyesno("Confirmar", f"Remover a categoria '{categoria}' e todos os itens?"):
            if categoria in self.lista_compras:
                # Remover itens marcados dessa categoria
                itens_remover = [k for k in self.itens_marcados if k.startswith(f"{categoria}|")]
                for item_key in itens_remover:
                    self.itens_marcados.remove(item_key)
                self.salvar_itens_compras()
                
                del self.lista_compras[categoria]
                self.salvar_lista_compras()
                self.recriar_tab_compras()


def main():
    app = AgendaPessoal()
    app.mainloop()


if __name__ == "__main__":
    main()
