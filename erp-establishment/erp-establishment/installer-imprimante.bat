@echo off
echo Installation du pont d'impression (Xprinter ESC/POS)...
echo Ce script est optionnel : ne l'utilise que sur le PC branche a l'imprimante.
echo.
cd print-bridge
call npm install
if %errorlevel% neq 0 (
  echo.
  echo [ERREUR] L'installation a echoue. Il faut generalement les
  echo "Build Tools" Windows pour compiler les pilotes USB. Recherche
  echo "windows-build-tools" ou installe Python + Visual Studio Build Tools,
  echo puis relance ce script.
  pause
  exit /b 1
)
echo.
echo Installation terminee. Utilise "demarrer-imprimante.bat" pour la lancer.
pause
