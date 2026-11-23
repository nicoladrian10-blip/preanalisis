// Tests de la lógica del pre-análisis (indicadores, umbrales, texto de WhatsApp, enlace y condicionales).
// Ejecutar:  node --test tests/      (o)  node tests/logica.test.js
// Carga los bloques <script id="config"> y <script id="logica"> directamente desde index.html,
// así se prueba exactamente el código publicado.
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function bloque(id) {
  const m = HTML.match(new RegExp('<script id="' + id + '">([\\s\\S]*?)</script>'));
  if (!m) throw new Error('No se encuentra <script id="' + id + '">');
  return m[1];
}
// Carga una instancia nueva; `ajustar` permite modificar CONFIG antes de construir la lógica.
function cargar(ajustar) {
  const ctx = vm.createContext({});
  vm.runInContext(bloque('config'), ctx);
  if (ajustar) ajustar(ctx.CONFIG);
  vm.runInContext(bloque('logica'), ctx);
  return { PA: ctx.PA, CONFIG: ctx.CONFIG };
}
const { PA, CONFIG } = cargar();
const ind = (A, id) => PA.indicadores(A).find((i) => i.id === id);
const FECHA = new Date(2026, 10, 23);

// Caso base: ingresos 1.000 €/mes (12 pagas), sin otros datos
const base = (extra) => Object.assign({ ingTitular: 1000, laboral: 'autonomo' }, extra || {});

// Familia completa (modalidad Completo)
const FAMILIA = {
  edad: '35-44', pareja: 'si', hogar: '4', hijos: '2', hijoEdad1: '6-11', hijoEdad2: '12-17',
  laboral: 'asalariado', laboralPareja: 'asalariado', vivienda: 'hipoteca',
  ingTitular: 2100, pagasTitular: '14', ingPareja: 1500, pagasPareja: '12', estabilidad: 'fijos',
  cuotaHipoteca: 750, gSuministros: 180, gSeguros: 90, gColegios: 200, gTransporte: 250, gOtrosFijos: 130,
  gVariables: 900, ahorroMensual: 600,
  savCuentas: '10-30', savDepositos: 'nada', savFondos: 'lt3', savPlanes: '3-10', savAcciones: 'nada', savOtros: 'nada',
  hipPendiente: 140000, hipTipo: 'variable', hipAnos: 22, deudas: ['coche'], d_coche_pend: 9000, d_coche_cuota: 250,
  valorVivienda: '200-300', otrosInmuebles: 'no',
  seg_vida: 'si', seg_vida_prima: 25, seg_vida_capital: 150000, seg_salud: 'no', seg_hogar: 'si', seg_hogar_prima: 30, seg_decesos: 'nose', seg_ahorro: 'no',
  edadJubilacion: 67, anosCotizados: 15,
  objetivos: ['colchon', 'estudios'], o_colchon_importe: 10000, o_colchon_plazo: '1-3', o_estudios_importe: 20000, o_estudios_plazo: '10-20',
  r1: '2', r2: '2', r3: '2', r4: '1',
  preocupacion: 'jubilacion', comentario: 'Quiero saber si llegaremos bien a la jubilación', horario: ['tardes']
};

// Exprés (solo bloques esenciales)
const EXPRES = {
  edad: '25-34', pareja: 'no', hogar: '1', hijos: '0', laboral: 'asalariado', vivienda: 'alquiler',
  ingTitular: 1800, pagasTitular: '12', estabilidad: 'fijos',
  gAlquiler: 700, gSuministros: 90, gSeguros: 20, gTransporte: 60, gOtrosFijos: 50,
  gVariables: 450, ahorroMensual: 300, ahorroDisponible: '3-10',
  deudas: ['ninguna'], objetivos: ['vivienda'], o_vivienda_importe: 30000, o_vivienda_plazo: '3-5',
  preocupacion: 'vivienda', horario: ['mananas', 'tardes']
};

describe('Formato español de números', () => {
  it('separador de miles siempre (también con 4 cifras) y coma decimal', () => {
    assert.equal(PA.formatearMiles('1250'), '1.250');
    assert.equal(PA.formatearMiles('0001250'), '1.250');
    assert.equal(PA.formatearMiles('1234567'), '1.234.567');
    assert.equal(PA.formatearNumero(1250.5, 2), '1.250,50');
    assert.equal(PA.formatearNumero(-3200), '-3.200');
    assert.equal(PA.formatearNumero(0), '0');
    assert.equal(PA.eur(1250.4), '1.250 €');
    assert.equal(PA.eur(999.5), '1.000 €');
    assert.equal(PA.pct(0.2), '20 %');
  });
  it('interpreta importes escritos con puntos', () => {
    assert.equal(PA.parseImporte('1.250'), 1250);
    assert.equal(PA.parseImporte(''), null);
    assert.equal(PA.parseImporte(300), 300);
  });
});

describe('Indicador: tasa de ahorro (≥20 % verde · 10-20 % ámbar · <10 % rojo)', () => {
  const casos = [[200, 'verde'], [199, 'ambar'], [100, 'ambar'], [99, 'rojo'], [0, 'rojo']];
  for (const [ahorro, estado] of casos) {
    it(ahorro + ' € de 1.000 € → ' + estado, () => assert.equal(ind(base({ ahorroMensual: ahorro }), 'tasaAhorro').estado, estado));
  }
  it('sin ahorro declarado usa ingresos − gastos (estimado)', () => {
    const i = ind(base({ gOtrosFijos: 700, gVariables: 150 }), 'tasaAhorro'); // 1.000 − 850 = 150 → 15 %
    assert.equal(i.estado, 'ambar');
    assert.match(i.corto, /\(estimado\)/);
  });
  it('prorratea pagas extra: 2.100 € × 14 pagas = 2.450 €/mes', () => {
    assert.equal(PA.calculos({ laboral: 'asalariado', ingTitular: 2100, pagasTitular: '14' }).ingresos, 2450);
  });
  it('"prefiero no decirlo" en ingresos → sin datos', () => {
    assert.equal(ind({ ingTitular: 'pnd', ahorroMensual: 100 }, 'tasaAhorro').estado, 'na');
  });
});

describe('Indicador: endeudamiento (≤30 % verde · 30-40 % ámbar · >40 % rojo)', () => {
  const casos = [[300, 'verde'], [301, 'ambar'], [400, 'ambar'], [401, 'rojo']];
  for (const [cuota, estado] of casos) {
    it('cuota ' + cuota + ' € de 1.000 € → ' + estado, () => {
      assert.equal(ind(base({ vivienda: 'hipoteca', cuotaHipoteca: cuota }), 'endeudamiento').estado, estado);
    });
  }
  it('suma hipoteca y otros préstamos', () => {
    const A = base({ vivienda: 'hipoteca', cuotaHipoteca: 250, deudas: ['personal', 'tarjetas'], d_personal_cuota: 100, d_tarjetas_cuota: 60 });
    assert.equal(PA.calculos(A).cuotas, 410);
    assert.equal(ind(A, 'endeudamiento').estado, 'rojo');
  });
  it('sin deudas → verde con frase específica', () => {
    const i = ind(base({ deudas: ['ninguna'] }), 'endeudamiento');
    assert.equal(i.estado, 'verde');
    assert.equal(i.frase, CONFIG.frases.endeudamiento.sinDeudas);
  });
});

describe('Indicador: colchón de emergencia (≥6 meses verde · 3-6 ámbar · <3 rojo)', () => {
  // gastos 1.000 €/mes; líquido por tramo (punto medio): lt3=1.500, 3-10=6.500
  const A = (tramo, gastos) => base({ gOtrosFijos: gastos, savCuentas: tramo });
  it('6,5 meses → verde', () => assert.equal(ind(A('3-10', 1000), 'colchon').estado, 'verde'));
  it('exactamente 6 meses → verde', () => assert.equal(ind(base({ gOtrosFijos: 1000, ahorroDisponible: 'gt150' }), 'colchon').estado, 'verde'));
  it('3,25 meses → ámbar', () => assert.equal(ind(A('3-10', 2000), 'colchon').estado, 'ambar'));
  it('1,5 meses → rojo', () => assert.equal(ind(A('lt3', 1000), 'colchon').estado, 'rojo'));
  it('en Exprés usa "dinero disponible en cuentas y depósitos"', () => {
    const i = ind(EXPRES, 'colchon');
    assert.equal(i.estado, 'ambar'); // 6.500 / 1.370 = 4,7 meses
    assert.match(i.valor, /^4,7 meses$/);
  });
  it('umbral exacto 3 meses → ámbar (límites configurables)', () => {
    const { PA: P2 } = cargar((C) => { C.tramos.ahorro.push(['x', 'x', 3000]); });
    assert.equal(P2.indicadores(base({ gOtrosFijos: 1000, savCuentas: 'x' })).find((i) => i.id === 'colchon').estado, 'ambar');
  });
});

describe('Indicadores del caso familia (Completo)', () => {
  const I = PA.indicadores(FAMILIA);
  const e = (id) => I.find((i) => i.id === id);
  it('ingresos 3.950 €, gastos 2.750 €, referencia 1.200 €', () => {
    const c = PA.calculos(FAMILIA);
    assert.equal(c.ingresos, 3950);
    assert.equal(c.gastos, 2750);
    assert.equal(c.referencia, 1200);
  });
  it('tasa de ahorro 15 % → ámbar', () => { assert.equal(e('tasaAhorro').estado, 'ambar'); assert.equal(e('tasaAhorro').valor, '15 %'); });
  it('endeudamiento 25 % → verde', () => { assert.equal(e('endeudamiento').estado, 'verde'); assert.equal(e('endeudamiento').valor, '25 %'); });
  it('colchón 7,3 meses → verde', () => { assert.equal(e('colchon').estado, 'verde'); assert.equal(e('colchon').valor, '7,3 meses'); });
  it('patrimonio neto ≈ 129.000 € (activos por punto medio − deudas)', () => {
    assert.equal(e('patrimonio').estado, 'info');
    assert.equal(e('patrimonio').num, 278000 - 149000);
    assert.equal(e('patrimonio').valor, '129.000 €');
  });
  it('protección: seguro de vida con capital corto → ámbar', () => assert.equal(e('proteccion').estado, 'ambar'));
  it('jubilación: ahorro a largo plazo bajo para 40 años → rojo', () => assert.equal(e('jubilacion').estado, 'rojo'));
  it('diversificación: 71 % en cuentas → ámbar', () => assert.equal(e('diversificacion').estado, 'ambar'));
  it('objetivos: 528 €/mes necesarios con 600 € de capacidad → verde', () => {
    assert.equal(e('objetivos').estado, 'verde');
    assert.equal(e('objetivos').valor, '528 €/mes necesarios');
  });
  it('resumen global y mensaje', () => {
    const g = PA.resumenGlobal(I);
    assert.deepEqual([g.rojos, g.ambar, g.verdes], [1, 3, 3]);
    assert.equal(g.texto, 'Hay 1 punto que conviene atender con prioridad y 3 que se pueden mejorar.');
  });
});

describe('Indicador: protección familiar', () => {
  it('hijos a cargo y sin seguro de vida → rojo', () => assert.equal(ind(base({ hijos: '1', seg_vida: 'no' }), 'proteccion').estado, 'rojo'));
  it('hipoteca y sin seguro de vida → rojo', () => assert.equal(ind(base({ vivienda: 'hipoteca', seg_vida: 'no' }), 'proteccion').estado, 'rojo'));
  it('sin cargas ni hipoteca y sin seguro → verde', () => assert.equal(ind(base({ hijos: '0', vivienda: 'alquiler', seg_vida: 'no' }), 'proteccion').estado, 'verde'));
  it('no sabe si tiene seguro y tiene hijos → ámbar', () => assert.equal(ind(base({ hijos: '2', seg_vida: 'nose' }), 'proteccion').estado, 'ambar'));
  it('con seguro suficiente → verde', () => assert.equal(ind(base({ hijos: '1', seg_vida: 'si', seg_vida_capital: 200000 }), 'proteccion').estado, 'verde'));
  it('pareja sin ingresos cuenta como persona a cargo', () => assert.equal(ind(base({ pareja: 'si', ingPareja: 0, seg_vida: 'no' }), 'proteccion').estado, 'rojo'));
  it('no preguntado (Exprés) → sin datos', () => assert.equal(ind(EXPRES, 'proteccion').estado, 'na'));
});

describe('Indicador: jubilación', () => {
  const J = (extra) => base(Object.assign({ edad: '45-54', laboral: 'asalariado', savCuentas: 'nada', savFondos: 'nada', savPlanes: 'nada' }, extra));
  it('50 años con 2 años de ingresos ahorrados a largo plazo → verde', () => {
    // objetivo = 2 × 12.000 = 24.000; planes 10-30 → 20.000 (0,83) + fondos lt3 1.500 + acciones 3-10 6.500 = 28.000 → ≥1
    assert.equal(ind(J({ savPlanes: '10-30', savFondos: 'lt3', savAcciones: '3-10' }), 'jubilacion').estado, 'verde');
  });
  it('a mitad de camino → ámbar', () => assert.equal(ind(J({ savPlanes: '10-30' }), 'jubilacion').estado, 'ambar'));
  it('sin ahorro a largo plazo → rojo', () => assert.equal(ind(J({}), 'jubilacion').estado, 'rojo'));
  it('pocos años cotizados baja un nivel', () => {
    assert.equal(ind(J({ savPlanes: '10-30', savFondos: 'lt3', savAcciones: '3-10', anosCotizados: 10, edadJubilacion: 67 }), 'jubilacion').estado, 'ambar');
  });
  it('jubilado/a → dato informativo', () => assert.equal(ind(base({ laboral: 'jubilado', edad: '65+', savCuentas: 'lt3' }), 'jubilacion').estado, 'info'));
  it('menor de 25 con hábito de ahorro → verde', () => assert.equal(ind(base({ edad: '18-24', savCuentas: 'lt3', ahorroMensual: 150 }), 'jubilacion').estado, 'verde'));
});

describe('Indicador: diversificación', () => {
  it('todo en cuentas (≥85 %) → rojo', () => assert.equal(ind(base({ savCuentas: '30-60' }), 'diversificacion').estado, 'rojo'));
  it('bien repartido → verde', () => assert.equal(ind(base({ savCuentas: '10-30', savFondos: '10-30', savPlanes: '10-30' }), 'diversificacion').estado, 'verde'));
  it('un solo producto no líquido (≥90 %) → rojo', () => assert.equal(ind(base({ savFondos: '60-150', savCuentas: 'lt3' }), 'diversificacion').estado, 'rojo'));
  it('poco ahorro (<10.000 €) → informativo, sin semáforo', () => assert.equal(ind(base({ savCuentas: '3-10' }), 'diversificacion').estado, 'info'));
});

describe('Indicador: viabilidad de objetivos (necesario/capacidad ≤1 verde · ≤1,5 ámbar · >1,5 rojo)', () => {
  const O = (imp, ahorro) => base({ ahorroMensual: ahorro, objetivos: ['vivienda'], o_vivienda_importe: imp, o_vivienda_plazo: '1-3' }); // 24 meses
  it('2.400 € en 2 años con 100 €/mes → verde', () => assert.equal(ind(O(2400, 100), 'objetivos').estado, 'verde'));
  it('3.600 € con 100 €/mes → ámbar', () => assert.equal(ind(O(3600, 100), 'objetivos').estado, 'ambar'));
  it('3.700 € con 100 €/mes → rojo', () => assert.equal(ind(O(3700, 100), 'objetivos').estado, 'rojo'));
  it('sin capacidad de ahorro → rojo', () => assert.equal(ind(O(1000, 0), 'objetivos').estado, 'rojo'));
  it('sin importes → sin datos', () => assert.equal(ind(base({ objetivos: ['vivienda'] }), 'objetivos').estado, 'na'));
});

describe('Preguntas condicionales y modalidades', () => {
  const ids = (A, modo) => [...PA.bloquesVisibles(A, modo).map((b) => b.id)];
  const visible = (k, A, modo) => PA.campoVisible(PA.CAMPOS[k], A, modo || 'full');
  it('Exprés: perfil, ingresos, gastos, ahorro, deudas, objetivos y cierre', () => {
    assert.deepEqual(ids({}, 'express'), ['perfil', 'ingresos', 'gastos', 'ahorro-mes', 'deudas', 'objetivos', 'final']);
  });
  it('Completo: los 12 bloques', () => assert.equal(ids({}, 'full').length, 12));
  it('jubilado/a: no se pregunta el bloque de jubilación', () => assert.ok(!ids({ laboral: 'jubilado' }, 'full').includes('jubilacion')));
  it('sin hipoteca no se preguntan sus detalles', () => {
    for (const k of ['cuotaHipoteca', 'hipPendiente', 'hipTipo', 'hipAnos']) {
      assert.equal(visible(k, { vivienda: 'alquiler' }), false, k);
      assert.equal(visible(k, { vivienda: 'hipoteca' }), true, k);
    }
    assert.equal(visible('gAlquiler', { vivienda: 'alquiler' }), true);
    assert.equal(visible('gAlquiler', { vivienda: 'hipoteca' }), false);
  });
  it('sin hijos no se pregunta por colegios ni edades', () => {
    assert.equal(visible('gColegios', { hijos: '0' }), false);
    assert.equal(visible('gColegios', { hijos: '2' }), true);
    assert.equal(visible('hijoEdad2', { hijos: '2' }), true);
    assert.equal(visible('hijoEdad3', { hijos: '2' }), false);
  });
  it('la opción "Estudios de los hijos" solo aparece con hijos', () => {
    const op = PA.CAMPOS.objetivos.opts.find((o) => o[0] === 'estudios');
    assert.equal(PA.opcionVisible(op, { hijos: '0' }), false);
    assert.equal(PA.opcionVisible(op, { hijos: '1' }), true);
  });
  it('pareja: ingresos y pagas solo si vive en pareja (y cobra pagas)', () => {
    assert.equal(visible('ingPareja', { pareja: 'no' }), false);
    assert.equal(visible('ingPareja', { pareja: 'si' }), true);
    assert.equal(visible('pagasPareja', { pareja: 'si', laboralPareja: 'autonomo' }), false);
    assert.equal(visible('pagasPareja', { pareja: 'si', laboralPareja: 'funcionario' }), true);
  });
  it('detalles de cada deuda y seguro solo si se marcan', () => {
    assert.equal(visible('d_coche_cuota', { deudas: ['personal'] }), false);
    assert.equal(visible('d_coche_cuota', { deudas: ['coche'] }), true);
    assert.equal(visible('seg_vida_capital', { seg_vida: 'no' }), false);
    assert.equal(visible('seg_vida_capital', { seg_vida: 'si' }), true);
  });
  it('Exprés oculta preguntas solo del Completo y viceversa', () => {
    assert.equal(visible('hipTipo', { vivienda: 'hipoteca' }, 'express'), false);
    assert.equal(visible('ahorroDisponible', {}, 'express'), true);
    assert.equal(visible('ahorroDisponible', {}, 'full'), false);
  });
  it('al cambiar de respuesta se ignoran los datos de preguntas ocultas', () => {
    const A = base({ vivienda: 'alquiler', cuotaHipoteca: 900, gAlquiler: 600, hijos: '0', gColegios: 300 });
    const E = PA.efectivas(A);
    assert.equal(E.cuotaHipoteca, undefined);
    assert.equal(E.gColegios, undefined);
    assert.equal(PA.calculos(A).fijos, 600);
  });
  it('validación amable: hace falta al menos un ingreso (o "prefiero no decirlo")', () => {
    const b = PA.BLOQUES.find((x) => x.id === 'ingresos');
    assert.equal(PA.validarBloque(b, {}, 'full').length, 1);
    assert.equal(PA.validarBloque(b, { ingTitular: 'pnd' }, 'full').length, 0);
    assert.equal(PA.validarBloque(b, { ingOtros: 300 }, 'full').length, 0);
    const g = PA.BLOQUES.find((x) => x.id === 'gastos');
    assert.equal(PA.validarBloque(g, {}, 'full').length, 0, 'gastos no obligatorios');
    const j = PA.BLOQUES.find((x) => x.id === 'jubilacion');
    assert.equal(PA.validarBloque(j, { edadJubilacion: 90 }, 'full').length, 1);
  });
  it('no se pide ningún dato identificativo', () => {
    const prohibido = /nombre|apellido|e-?mail|correo|tel[eé]fono|m[oó]vil|dni|nie|direcci[oó]n|domicilio|c[oó]digo postal|iban/i;
    for (const f of Object.values(PA.CAMPOS)) {
      assert.ok(!prohibido.test(f.k), 'clave ' + f.k);
      if (f.label) assert.ok(!prohibido.test(f.label), 'pregunta: ' + f.label);
    }
  });
});

describe('Perfil de riesgo', () => {
  it('4 respuestas → conservador / moderado / dinámico', () => {
    assert.equal(PA.perfilRiesgo({ r1: '1', r2: '1', r3: '2', r4: '1' }).perfil, 'Conservador');
    assert.equal(PA.perfilRiesgo({ r1: '2', r2: '2', r3: '2', r4: '1' }).perfil, 'Moderado');
    assert.equal(PA.perfilRiesgo({ r1: '3', r2: '3', r3: '2', r4: '3' }).perfil, 'Dinámico');
    assert.equal(PA.perfilRiesgo({ r1: '3' }), null);
  });
});

describe('Texto para WhatsApp', () => {
  // El texto usa espacio no separable entre cifra y €/%: se normaliza para comparar
  const sinNbsp = (r) => Object.assign({}, r, { completo: r.completo.replace(/ /g, ' '), whatsapp: r.whatsapp.replace(/ /g, ' ') });
  const tF = sinNbsp(PA.textoResumen(FAMILIA, 'full', { fecha: FECHA, telefono: '34600111222' }));
  const tE = sinNbsp(PA.textoResumen(EXPRES, 'express', { fecha: FECHA }));
  it('cifra y símbolo (€ / %) no se separan en WhatsApp', () => {
    const r = PA.textoResumen(FAMILIA, 'full', { fecha: FECHA });
    assert.match(r.completo, /750 €/);
    assert.doesNotMatch(r.completo, /\d (€|%)/);
  });
  it('títulos en negrita y en el orden pedido', () => {
    const orden = ['*Pre-análisis financiero*', 'Modalidad: Completo · 23/11/2026', '*Indicadores clave*', '*Perfil*', '*Ingresos netos/mes*', '*Gastos/mes*',
      '*Ahorro*', '*Deudas*', '*Patrimonio*', '*Protección*', '*Jubilación*', '*Objetivos*', '*Perfil de riesgo*', '*Preocupación y horario*'];
    let pos = -1;
    for (const t of orden) { const p = tF.completo.indexOf(t); assert.ok(p > pos, 'falta o desordenado: ' + t); pos = p; }
  });
  it('semáforos con emoji y formato español', () => {
    assert.match(tF.completo, /🟡 Tasa de ahorro: 15 % de los ingresos/);
    assert.match(tF.completo, /🟢 Endeudamiento: 25 % de los ingresos en cuotas/);
    assert.match(tF.completo, /🔴 Preparación para la jubilación/);
    assert.match(tF.completo, /• Titular: 2\.100 € \(14 pagas\)/);
    assert.match(tF.completo, /• Hipoteca: 140\.000 € pendientes · cuota 750 € · tipo variable · 22 años/);
    assert.match(tF.completo, /Moderado \(7\/12\)/);
  });
  it('dentro de los objetivos de longitud (Exprés < 1.500 · Completo < 2.500)', () => {
    assert.ok(tE.whatsapp.length < 1500, 'exprés: ' + tE.whatsapp.length);
    assert.ok(tF.whatsapp.length < 2500, 'completo: ' + tF.whatsapp.length);
  });
  it('omite respuestas vacías y "prefiero no decirlo"', () => {
    const t = PA.textoResumen(Object.assign({}, EXPRES, { ingTitular: 'pnd', ingOtros: 900 }), 'express', { fecha: FECHA }).completo;
    assert.ok(!/Titular/.test(t));
    assert.ok(!/Prefiero/.test(t));
    assert.ok(!/\*Protección\*|\*Patrimonio\*|\*Perfil de riesgo\*|\*Jubilación\*/.test(t), 'sin secciones no respondidas');
    assert.match(t, /Modalidad: Exprés/);
  });
  it('si supera el límite de URL, recorta detalle y deja el texto íntegro para copiar', () => {
    const r = PA.textoResumen(FAMILIA, 'full', { fecha: FECHA, telefono: '34600111222', maxUrl: 1800 });
    assert.ok(r.recortado);
    assert.ok(r.enlace.length <= 1800, 'enlace ' + r.enlace.length);
    assert.equal(sinNbsp(r).completo, tF.completo);
    assert.match(r.whatsapp, /Versión abreviada/);
    assert.match(r.whatsapp, /\*Indicadores clave\*/, 'mantiene lo importante');
    const duro = PA.textoResumen(FAMILIA, 'full', { fecha: FECHA, maxUrl: 900 });
    assert.ok(duro.enlace.length <= 900);
  });
  it('limpia el comentario libre (sin saltos ni formato) y lo limita a 200 caracteres', () => {
    const t = PA.textoResumen(base({ comentario: 'Hola\n*negrita* ' + 'x'.repeat(300) }), 'express', { fecha: FECHA }).completo;
    const linea = t.split('\n').find((l) => l.startsWith('• Comentario'));
    assert.ok(linea && !linea.includes('*'));
    assert.ok(linea.length <= 200 + 20);
  });
});

describe('Enlace de WhatsApp y parámetros', () => {
  it('codifica el texto y se puede decodificar sin pérdida', () => {
    const texto = '*Título*\n• Línea con acentos: ñ á €\n🟢 Bien & 50 %';
    const url = PA.enlaceWhatsApp('34600111222', texto);
    assert.ok(url.startsWith('https://wa.me/34600111222?text='));
    assert.ok(!/[\s\n]/.test(url), 'sin espacios ni saltos literales');
    assert.match(url, /%0A/);
    assert.match(url, /%26/); // &
    assert.equal(decodeURIComponent(url.split('?text=')[1]), texto);
  });
  it('sin número abre WhatsApp para elegir contacto', () => {
    assert.ok(PA.enlaceWhatsApp('', 'hola').startsWith('https://wa.me/?text='));
  });
  it('normaliza y valida números', () => {
    assert.equal(PA.normalizarTelefono('+34 600 111 222'), '34600111222');
    assert.equal(PA.normalizarTelefono('0034600111222'), '34600111222');
    assert.equal(PA.normalizarTelefono('600111222'), '34600111222');
    assert.equal(PA.normalizarTelefono('34-600-111-222'), '34600111222');
    assert.equal(PA.normalizarTelefono('5215512345678'), '5215512345678');
    assert.equal(PA.normalizarTelefono('12345'), null);
    assert.equal(PA.normalizarTelefono('34600abc222'), null);
    assert.equal(PA.normalizarTelefono('1234567890123456'), null);
    assert.equal(PA.normalizarTelefono(''), null);
  });
  it('?asesor y ?nombreAsesor', () => {
    const p = PA.leerParametros('?asesor=34611222333&nombreAsesor=Ana%20Ruiz');
    assert.equal(p.telefono, '34611222333');
    assert.equal(p.nombre, 'Ana Ruiz');
    assert.equal(p.telefonoInvalido, false);
  });
  it('?asesor no válido → número por defecto y aviso interno', () => {
    const { PA: P2 } = cargar((C) => { C.asesor.telefono = '34699000111'; });
    const p = P2.leerParametros('?asesor=hola');
    assert.equal(p.telefono, '34699000111');
    assert.equal(p.telefonoInvalido, true);
  });
  it('sin parámetros → número y nombre de CONFIG', () => {
    const { PA: P2 } = cargar((C) => { C.asesor.telefono = '+34 699 000 111'; C.asesor.nombre = 'Nicol'; });
    assert.deepEqual({ ...P2.leerParametros('') }, { telefono: '34699000111', telefonoInvalido: false, nombre: 'Nicol' });
  });
  it('el nombre del asesor se sanea (sin HTML)', () => {
    assert.equal(PA.leerParametros('?nombreAsesor=%3Cscript%3Ealert(1)%3C%2Fscript%3E').nombre, 'scriptalertscript');
    assert.equal(PA.leerParametros('?nombreAsesor=%E0%A4%A').nombre, CONFIG.asesor.nombre); // mal codificado
  });
});

describe('Aviso de datos personales en texto libre', () => {
  it('detecta email, teléfono, DNI e IBAN', () => {
    assert.ok(PA.detectarDatosPersonales('escríbeme a ana@mail.com'));
    assert.ok(PA.detectarDatosPersonales('llámame al 600 111 222'));
    assert.ok(PA.detectarDatosPersonales('mi dni 12345678Z'));
    assert.ok(PA.detectarDatosPersonales('ES12 3456 7890'));
    assert.ok(!PA.detectarDatosPersonales('Me preocupa la hipoteca y ahorrar 300 € al mes'));
  });
});

describe('Umbrales editables en CONFIG', () => {
  it('cambiar el umbral verde de ahorro al 15 % cambia el semáforo', () => {
    const { PA: P2 } = cargar((C) => { C.umbrales.tasaAhorro.verde = 0.15; });
    assert.equal(P2.indicadores(base({ ahorroMensual: 150 })).find((i) => i.id === 'tasaAhorro').estado, 'verde');
  });
});
