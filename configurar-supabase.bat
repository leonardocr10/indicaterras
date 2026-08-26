@echo off
setlocal
cd /d "%~dp0"

echo.
echo === Configuracao do Supabase - Terras Alphas Indica ===
echo.
echo 1. Abra: https://supabase.com/dashboard/project/bvkftjwbclulgatyhwve/settings/database
echo 2. Em "Connect", copie a URI de conexao (Database URL).
echo 3. Cole a URI no arquivo backend\.env que sera aberto agora.
echo.

if not exist "backend\.env" (
  copy /Y "backend\.env.example" "backend\.env" >nul
  echo Arquivo backend\.env criado.
) else (
  echo O arquivo backend\.env ja existe; ele nao sera sobrescrito.
)

notepad "backend\.env"
echo.
set /p CONTINUAR="A DATABASE_URL foi salva? Digite S para criar as tabelas no Supabase: "
if /I not "%CONTINUAR%"=="S" (
  echo Configuracao pausada. Execute este arquivo novamente apos salvar a URL.
  exit /b 0
)

pushd backend
call npm install
if errorlevel 1 goto :erro
call npm run prisma:generate
if errorlevel 1 goto :erro
call npx prisma db push
if errorlevel 1 goto :erro
call npm run prisma:seed
if errorlevel 1 goto :erro
popd

echo.
echo Supabase conectado. As tabelas e os dados iniciais foram criados.
echo Execute iniciar.bat para abrir a aplicacao.
pause
exit /b 0

:erro
popd
echo.
echo Nao foi possivel conectar ao Supabase. Confira a DATABASE_URL em backend\.env.
pause
exit /b 1
