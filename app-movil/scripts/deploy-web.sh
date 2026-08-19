#!/usr/bin/env bash
# Genera el build web y lo despliega a Vercel.
#
# Tres problemas que esto evita, ninguno los resuelve expo export solo:
#
# 1. Vercel ignora por defecto cualquier ruta que contenga una carpeta
#    "node_modules", pero expo export coloca ahí las fuentes/íconos de
#    terceros (assets/node_modules/...). Sin este paso, la app se ve con
#    la fuente del sistema y sin íconos en producción, aunque local esté
#    perfecta. Por eso se renombra a "vendor" antes de subir.
#
# 2. expo export borra y recrea toda la carpeta dist/ en cada build, así
#    que un .vercel/ (el link al proyecto) guardado ahí dentro se pierde
#    cada vez y el siguiente deploy crea un proyecto nuevo por error. Por
#    eso el link vive en web-deploy/, una carpeta aparte que expo nunca
#    toca, y solo se copia el contenido de dist/ hacia ahí.
#
# 3. El index.html que genera expo export no trae ninguna de las
#    etiquetas que iOS necesita para "Añadir a pantalla de inicio": ni
#    ícono (apple-touch-icon) ni el modo standalone (sin la barra de
#    Safari). Sin esto, quedaba un ícono genérico y se abría como una
#    pestaña normal del navegador, no como una app.
set -euo pipefail
cd "$(dirname "$0")/.."

npx expo export --platform web

if [ -d "dist/assets/node_modules" ]; then
  mv dist/assets/node_modules dist/assets/vendor
  sed -i 's#assets/node_modules/#assets/vendor/#g' dist/_expo/static/js/web/index-*.js
fi

cp assets/icon.png dist/apple-touch-icon.png
sed -i 's#</head>#  <link rel="apple-touch-icon" href="/apple-touch-icon.png">\n  <meta name="apple-mobile-web-app-capable" content="yes">\n  <meta name="apple-mobile-web-app-title" content="Kubo">\n  <meta name="apple-mobile-web-app-status-bar-style" content="default">\n</head>#' dist/index.html

mkdir -p web-deploy
find web-deploy -mindepth 1 -not -name ".vercel" -not -path "web-deploy/.vercel/*" -delete
cp -r dist/* web-deploy/

if [ ! -d "web-deploy/.vercel" ]; then
  vercel link --cwd web-deploy --project kubo-web --yes
fi

(cd web-deploy && vercel deploy --prod --yes)

# Vercel reasigna los alias existentes del proyecto en cada deploy de
# producción, pero se reafirma aquí explícitamente por las dudas: es la
# URL que se comparte fuera (LinkedIn, README), tiene que ser estable.
vercel alias set dist-delta-sandy-54.vercel.app kubo-finanzas.vercel.app

