# Pre-análisis financiero anónimo

Formulario web que el cliente rellena **antes de la primera reunión**. Al terminar ve un diagnóstico con semáforos y puede enviarte un resumen por WhatsApp. No pide ningún dato identificativo y no envía nada a ningún servidor.

- **Enlace para clientes:** <https://nicoladrian10-blip.github.io/preanalisis/>
- **Demostración con datos ficticios:** [`?demo=completo`](https://nicoladrian10-blip.github.io/preanalisis/?demo=completo) · [`?demo=expres`](https://nicoladrian10-blip.github.io/preanalisis/?demo=expres)
- **Versión actual: v2** (cifras exactas: edad, edad de pareja e hijos, ahorro por producto en €, valor de inmuebles en € y plazos en años). La v1 (por tramos) queda archivada en [`/v1/`](https://nicoladrian10-blip.github.io/preanalisis/v1/) y no se mantiene. `/prueba-v2/` redirige al enlace principal.

Todo está en un único fichero, [`index.html`](index.html): HTML, CSS y JavaScript sin librerías ni compilación. Se edita con cualquier editor de texto.

---

## 1. Cambiar mi número de WhatsApp

Abre `index.html`, busca el bloque `CONFIG` (al principio del primer `<script>`) y rellena:

```js
asesor: {
  telefono: '34600111222',   // tu número con prefijo de país, solo dígitos
  nombre: 'Nicol'            // aparece como "Envíaselo a Nicol"
},
```

Mientras `telefono` esté vacío, el botón abre WhatsApp y el cliente elige a quién mandárselo. Todo lo demás funciona igual.

## 2. Enlaces para otros asesores

No hace falta copiar el fichero. Basta con añadir parámetros al enlace:

```
https://nicoladrian10-blip.github.io/preanalisis/?asesor=34611222333&nombreAsesor=Ana
```

| Parámetro | Qué hace | Formato |
|---|---|---|
| `asesor` | Número al que se envía el resumen | Con prefijo de país. Se aceptan `34611222333`, `+34611222333`, `0034611222333` y también `611222333` (se añade el 34). Entre 10 y 15 dígitos. |
| `nombreAsesor` | Nombre que ve el cliente («Envíaselo a Ana») | Solo letras y espacios, máx. 40 caracteres. Los espacios se escriben `%20`: `nombreAsesor=Ana%20Ruiz`. |

Si `asesor` no es válido, se usa tu número de `CONFIG` (o, si está vacío, WhatsApp pide elegir el contacto). El logo sigue siendo el tuyo. Si otro asesor quiere su propio logo, se duplica el repositorio (sección 4).

## 3. Cambiar umbrales, textos o límites

Todo está en `CONFIG`, dentro de `index.html`:

- `CONFIG.umbrales`: semáforos (tasa de ahorro, endeudamiento, colchón, jubilación, diversificación, objetivos, protección).
- `CONFIG.textos`: portada, aviso de privacidad, mensaje de modalidad, aviso «orientativo», etc.
- `CONFIG.frases`: la frase que acompaña a cada indicador según su color y el resumen global.
- `CONFIG.limites`: edades y plazos admitidos (la v2 pide cifras exactas: edad, ahorro por producto, valor de inmuebles y plazos en años).
- `CONFIG.whatsapp`: longitud objetivo del mensaje y límite seguro del enlace.

Las preguntas están en el bloque `<script id="logica">`, sección «Preguntas por bloques».

## 4. Cambiar el logo o el color

- **Logo:** sustituye `assets/logo-original-azul.jpg` (logo sobre fondo claro) y ejecuta:
  ```powershell
  .\tools\procesar-logo.ps1          # genera logo.png, iconos e imagen para compartir en el azul del logo
  node tools\incrustar-recursos.js   # los incrusta en index.html
  ```
  También puedes pegar a mano cualquier imagen como data-URI en `window.LOGO_SRC = "…"` (bloque `<script id="logo-data">`). Ese es el único sitio donde vive el logo de la página.
- **Color:** variables CSS en `:root` (`--brand` = `#184474`, el azul medido en el logo, y sus tonos claros y oscuros). Si cambias el azul, cámbialo también en `tools/procesar-logo.ps1` (`$brand`).

> En este equipo, `node` no está en el PATH: usa `C:\Users\Usuario\AppData\Local\nodejs-portable\node-v24.22.2-win-x64\node.exe`.

## 5. Publicar cambios

La web está en GitHub Pages (repositorio `nicoladrian10-blip/preanalisis`, rama `main`). Tras editar:

```bash
git add -A
git commit -m "Describe el cambio"
git push
```

En 1 o 2 minutos la web se actualiza. WhatsApp guarda en caché la vista previa del enlace: si cambias la imagen o el título, comparte el enlace con un parámetro nuevo (`…/preanalisis/?v=2`) para forzar que se regenere.

## 6. Tests y revisión

```bash
node --test tests/                # lógica: indicadores, umbrales, texto de WhatsApp, enlace, condicionales
node tools/servidor-local.js      # http://localhost:8765/
node tools/revision-visual.js     # (con el servidor arrancado) recorre el formulario a 375 y 1440 px,
                                  # guarda capturas en docs/capturas/ y lista todas las peticiones de red
```

## 7. Privacidad, cómo está garantizada

- La página declara una *Content-Security-Policy* con `connect-src 'none'` y `default-src 'none'`: el navegador **no le permite** hacer peticiones de red ni cargar nada externo (fuentes del sistema, logo e iconos incrustados).
- Sin cookies, analítica ni base de datos. El progreso se guarda en `sessionStorage`: solo en ese dispositivo y esa pestaña, y se borra al cerrarla o con «Borrar mis respuestas».
- Los datos solo salen cuando el cliente pulsa «Enviar por WhatsApp» y luego «Enviar» dentro de WhatsApp.
- `noindex` para que los buscadores no la indexen. No hay `robots.txt` bloqueante para que WhatsApp pueda leer la vista previa.
- El texto libre avisa si detecta un email, teléfono, DNI o IBAN.

## 8. Comprobación en móviles (pendiente de hacer a mano)

Prueba el enlace en **Android**, **iPhone** y **WhatsApp Web**: rellena un Exprés, pulsa «Enviar a mi asesor por WhatsApp» y comprueba que se abre tu chat con el texto y las negritas. Si algún dispositivo cortara el mensaje, baja `CONFIG.whatsapp.maxUrl` (p. ej. a 3000). «Copiar texto» siempre copia la versión íntegra.

## Estructura

```
index.html                 La aplicación completa (CONFIG + lógica + interfaz + logo incrustado)
assets/                    Logo original, logo procesado, iconos y og-image.png (vista previa al compartir)
tests/logica.test.js       Tests (node --test tests/)
tools/                     Procesar logo, incrustar recursos, servidor local y revisión visual/red
docs/decisiones.md         Decisiones tomadas
docs/capturas/             Capturas a 375 px (m-*) y 1440 px (d-*) y texto de WhatsApp de ejemplo
```
