@echo off
title ERP Etablissement
echo Demarrage de l'ERP en cours...
echo.

cd backend
start "ERP - Serveur (ne pas fermer)" /min cmd /c "npm start"
cd ..

timeout /t 3 /nobreak >nul
start "" http://localhost:4000

echo.
echo L'ERP est lance dans la fenetre minimisee "ERP - Serveur".
echo Laisse cette fenetre ouverte tant que tu utilises l'application.
echo Pour tout arreter, ferme la fenetre "ERP - Serveur" depuis la barre des taches.
echo.
pause
