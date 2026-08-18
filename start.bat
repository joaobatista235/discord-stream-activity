@echo off
echo Iniciando o Discord Stream Activity...
echo.

echo [1/3] Iniciando os servicos do Docker (API e LiveKit)...
docker-compose up -d
echo.

echo [2/3] Iniciando o Frontend (Activity, Transmitter e API local)...
:: Inicia o pnpm dev em uma nova janela de terminal para nao travar este script
start cmd /k "pnpm dev"
echo Frontend iniciado em uma nova janela!
echo.

echo [3/3] Iniciando o Tunel da Cloudflare...
echo Copie a URL gerada abaixo e cole no Discord Developer Portal (URL Mappings)
echo.
cloudflared tunnel --url http://localhost:5173
