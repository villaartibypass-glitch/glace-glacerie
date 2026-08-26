@echo off
title Pont d'impression Xprinter
echo Demarrage du pont d'impression...
echo Branche la Xprinter en USB avant de continuer.
echo Laisse cette fenetre ouverte tant que tu imprimes des tickets.
echo.
cd print-bridge
call npm start
