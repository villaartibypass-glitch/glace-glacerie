@echo off
echo ============================================
echo   Installation de l'ERP Etablissement
echo ============================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERREUR] Node.js n'est pas installe sur ce PC.
  echo Telecharge-le sur https://nodejs.org ^(version LTS^) puis relance ce script.
  pause
  exit /b 1
)

echo [1/4] Installation du backend...
cd backend
if not exist ".env" copy .env.example .env >nul
call npm install
if %errorlevel% neq 0 goto :error

echo.
echo [2/4] Preparation de la base de donnees...
call npx prisma generate
call npx prisma db push
if not exist "prisma\dev.db" goto :error

if not exist "prisma\.seeded" (
  echo Creation des donnees de demonstration...
  call npm run seed
  echo ok > prisma\.seeded
)
cd ..

echo.
echo [3/4] Installation et construction de l'interface...
cd frontend
call npm install
if %errorlevel% neq 0 goto :error
call npm run build
if %errorlevel% neq 0 goto :error
cd ..

echo.
echo [4/4] Termine !
echo.
echo ============================================
echo Installation reussie. Double-clique sur
echo "demarrer.bat" pour lancer l'application.
echo ============================================
pause
exit /b 0

:error
echo.
echo [ERREUR] L'installation a echoue. Verifie les messages ci-dessus.
pause
exit /b 1
