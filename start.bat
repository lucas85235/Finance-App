@echo off
title Finance Dashboard
echo.
echo ========================================
echo   💰 Finance Dashboard
echo ========================================
echo.
echo Iniciando servidor em http://localhost:8080
echo Pressione Ctrl+C para encerrar
echo.

:: Abre o navegador após 2 segundos
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8080"

:: Inicia o servidor Python
python -m http.server 8080
