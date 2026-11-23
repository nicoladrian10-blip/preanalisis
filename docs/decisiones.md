# Decisiones tomadas

Registro de lo que decidí sin preguntarte, para que puedas revisarlo o cambiarlo.

## Estilo y marca
- **Referencia de estilo:** usé tu `Generador_de_presentaciones.html` de Drive (`Mi unidad/OVB/Generador presentaciones`): titulares en serif (Cambria), azul marino, tarjetas con borde fino y esquinas redondeadas, fondo claro. **No abrí presentaciones de clientes** porque contienen datos personales; el generador ya define la maquetación.
- **Logo:** de tu carpeta `LOGOS` elegí la versión azul (`Gemini_Generated_Image_ywihoc…jpg`). La convertí en un PNG transparente del azul exacto, sin el fondo de papel. El negro (`LOGO.jpg`) no tiene azul del que extraer el acento.
- **Azul de marca:** medido en el logo: `rgb(24,68,116)` = `#184474`. Tonos derivados como tokens CSS: `--brand-700 #0F2E52`, `--brand-800 #0B2340`, `--brand-300 #9DB4D1`, `--brand-200 #C9D7E8`, `--brand-100 #E7EEF6`, `--brand-50 #F4F7FB`.
- **Tipografía:** fuentes del sistema, sin descargar nada (privacidad). Serif (Cambria/Georgia/Noto Serif) para títulos, como tus presentaciones, y la sans del sistema para el texto.
- **Semáforos:** verde, ámbar y rojo suaves, siempre con icono (✓, triángulo, octógono) y texto («Bien», «Mejorable», «Atención»), nunca solo color. Contraste del texto entre 5,9:1 y 15,6:1 (AA); bordes de campos 3,4:1.
- **Sin modo oscuro:** pediste blanco con acento azul.

## Contenido y flujo
- **Orden de modalidades:** «Completo (recomendado)» aparece primero.
- **Exprés incluye además** (1) «Dinero disponible en cuentas y depósitos» (un tramo) para poder calcular el colchón de emergencia, y (2) el bloque final (preocupación y horario), necesario para agendar la reunión. Sigue siendo de 7 pantallas cortas.
- **Vivienda habitual** se pregunta en Perfil porque decide qué aparece después (alquiler, cuota hipotecaria, valor de la vivienda, detalles de la hipoteca).
- **La cuota de la hipoteca se pregunta una sola vez**, en Gastos fijos, y se reutiliza en Deudas, así no se cuenta dos veces.
- **Pagas extra:** se pregunta el número de pagas solo a asalariados, funcionarios y jubilados. Los ingresos se prorratean (`nómina × pagas / 12`).
- **Respuestas ocultas por condicionales** (por ejemplo, si cambia de «hipoteca» a «alquiler») se ignoran en cálculos y en el resumen, aunque sigan guardadas.
- **Único requisito obligatorio:** al menos un ingreso (o marcar «Prefiero no decirlo»). Todo lo demás es opcional.
- **«Prefiero no decirlo»** en ingresos, ahorro mensual, capitales pendientes de deudas y todos los tramos de patrimonio y ahorro.
- **Capital asegurado** se pide para vida, hogar, decesos y ahorro, no para salud (no aplica).
- **Hijos:** se pide la edad de hasta 4 hijos. «Estudios de los hijos» solo aparece como objetivo si hay hijos.
- **Texto libre:** «Otro objetivo» (60 caracteres) y comentario final (200 caracteres), con aviso y detección automática de email, teléfono, DNI o IBAN.
- **Horario:** mañanas, mediodía, tardes o «me da igual» (multiselección).
- **Modo demostración** `?demo=completo` / `?demo=expres` con datos ficticios, para que puedas enseñar el resultado o revisarlo sin rellenar nada.

## Cálculos (orientativos, todo editable en `CONFIG`)
- **Tramos → punto medio:** p. ej. 10.000-30.000 € → 20.000 €; «Más de 150.000 €» → 200.000 €; «Más de 1 M€» → 1.200.000 €.
- **Gastos del mes** = fijos + variables + cuotas de préstamos distintos de la hipoteca (la hipoteca ya está en fijos).
- **Ahorro mensual:** si no lo indica, se usa ingresos − gastos y se marca como «estimado».
- **Colchón:** cuentas + depósitos (o el tramo de «dinero disponible» en Exprés) / gastos del mes.
- **Patrimonio neto:** solo se muestra si no falta el valor de la vivienda cuando es propietario (para no dar una cifra engañosa).
- **Protección familiar:** «personas a cargo» = hijos o pareja sin ingresos. Rojo si hay personas a cargo o hipoteca y no tiene seguro de vida. Ámbar si «no lo sabe» o si el capital indicado es menor que deudas + 3 años de ingresos.
- **Jubilación:** compara el ahorro a largo plazo (fondos, planes, acciones y seguros de ahorro) con una referencia por edad en veces los ingresos anuales (30 años: 0,25×; 40: 1×; 50: 2×; 60: 3×; 67: 4×). Es más baja que las reglas anglosajonas porque en España hay pensión pública. Baja un nivel si los años cotizados previstos no llegan a 37. Para jubilados es un dato informativo. Menores de 25: se valora el hábito de ahorro.
- **Diversificación:** sin semáforo por debajo de 10.000 € (tenerlo en cuenta es razonable). Rojo con ≥85 % en cuentas y depósitos o ≥90 % en un producto. Ámbar con ≥60 %.
- **Viabilidad de objetivos:** Σ importe / meses de plazo (punto medio del tramo), comparado con el ahorro mensual.
- **Perfil de riesgo:** 4 preguntas de 1 a 3 puntos → 4-6 conservador, 7-9 moderado, 10-12 dinámico. Con 2-3 respuestas se escala.
- **Indicadores sin datos** se agrupan en una tarjeta «Pendientes de calcular» en lugar de mostrar semáforos vacíos.

## WhatsApp
- **Número por defecto:** `34687040876` en `CONFIG.asesor.telefono` (README §1). Si se deja vacío, el botón abre WhatsApp para elegir el contacto.
- **Emojis:** solo los de semáforo 🟢🟡🔴. Los indicadores sin semáforo llevan «•».
- **Recorte:** cada línea tiene prioridad. Si el mensaje supera el objetivo (1.500/2.500 caracteres) o el enlace supera 4.000 caracteres codificado, se quitan primero los detalles (desglose de gastos, seguros secundarios, ahorro por producto) y se añade «Versión abreviada». «Copiar texto» copia siempre la versión íntegra.
- **Espacio no separable** entre cifra y €/% para que WhatsApp no parta «750 €».
- **El enlace se abre en una pestaña nueva** para que la página siga ahí y pueda ofrecer «Borrar mis respuestas» después de enviar.

## Privacidad y técnica
- **Content-Security-Policy** con `connect-src 'none'`: además de no hacer peticiones, el navegador las bloquearía. `referrer: no-referrer`.
- **`sessionStorage`** (no `localStorage`): se borra solo al cerrar la pestaña.
- **Logo e iconos incrustados** como data-URI: un único `index.html` de unos 215 KB, sin peticiones adicionales.
- **`noindex` por meta y no por `robots.txt`:** un `robots.txt` bloqueante impediría a WhatsApp leer la vista previa.
- **Publicación:** GitHub Pages en tu cuenta `nicoladrian10-blip` (había credenciales guardadas), repositorio público `preanalisis` (Pages gratis lo exige). Los commits usan tu dirección *noreply* de GitHub para no publicar tu email.
- **Tests con `node:test`**, sin dependencias. Cargan el código directamente de `index.html` para probar exactamente lo publicado.
- **Sin escalas de compilación:** las herramientas de `tools/` son opcionales (logo, servidor local, revisión visual).
