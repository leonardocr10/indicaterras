@echo off
setlocal
cd /d "%~dp0"

if not exist "backend\.env" (
  echo A conexao com o Supabase ainda nao foi configurada.
  call configurar-supabase.bat
  if errorlevel 1 exit /b 1
)

echo Abrindo API em http://localhost:3000 e site em http://localhost:4200 ...
start "Terras Alphas API" /D "%~dp0backend" cmd /k "npm run prisma:generate && npm run start:dev"
start "Terras Alphas Frontend" /D "%~dp0frontend" cmd /k "npm start"

timeout /t 4 /nobreak >nul
start "" "http://localhost:4200"
endlocal
