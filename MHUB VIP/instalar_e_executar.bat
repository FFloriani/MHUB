@echo off
title Agenda Pessoal - Instalador
color 0B
echo.
echo ========================================
echo    AGENDA PESSOAL - INSTALADOR
echo ========================================
echo.

echo [1/3] Verificando Python...
python --version
if errorlevel 1 (
    echo ERRO: Python nao encontrado! Instale o Python primeiro.
    pause
    exit
)

echo.
echo [2/3] Instalando dependencias...
pip install -r requirements.txt

echo.
echo [3/3] Iniciando aplicativo...
echo.
echo ========================================
echo    Senha para fechar alertas: 25798463
echo ========================================
echo.

python agenda_pessoal.py

pause



