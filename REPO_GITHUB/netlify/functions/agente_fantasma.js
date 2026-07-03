// ============================================================
// AGENTE FANTASMA v3.7 — Predica Facil
// ESTRATEGIA: N llamados paralelos — 1 por sección de 5 minutos
// Cada llamado < 5 segundos. Todos en paralelo. Se unen al final.
// Modelo: Sonnet — máxima calidad teológica
// ============================================================

const rateMap = new Map();
const intentosMap = new Map();

function checkRate(ip) {
  const now = Date.now();
  const e = rateMap.get(ip);
  if (!e || now > e.reset) { rateMap.set(ip, { count: 1, reset: now + 60000 }); return true; }
  if (e.count >= 60) return false;
  e.count++; return true;
}

function tokenOk(token, esSermon) {
  if (!token || typeof token !== 'string') return false;
  if (esSermon) return true;
  const ts = parseInt(token.split('.')[0], 10);
  if (isNaN(ts)) return false;
  return (Date.now() - ts) <= 120000;
}

const DOMINIOS = ['predicafacil.cl','www.predicafacil.cl','localhost','127.0.0.1','netlify.app'];
function origenOk(h) {
  const src = h['origin'] || h['referer'] || '';
  if (!src) return true;
  return DOMINIOS.some(d => src.includes(d));
}

function corsH(event) {
  const o = (event.headers && event.headers['origin']) || 'https://predicafacil.cl';
  return { 'Content-Type':'application/json','Access-Control-Allow-Origin':o,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type' };
}

const SYS_SERMON = `Eres Salomon IA, predicador expositivo doctoral cristocentrico.
Escribe con profundidad teologica, lenguaje pastoral calido y fidelidad textual absoluta.
Todo apunta a Cristo. Cada parrafo edificante y sustancioso.
Cuando generes una seccion, desarrollala COMPLETA — no uses frases como "desarrollar aqui" o "[contenido]".
Escribe el contenido real, jugoso, contundente.
MUY IMPORTANTE: NUNCA cortes una oracion a la mitad. Siempre termina el pensamiento completo antes de finalizar.`;

async function llamarSonnet(prompt, tokens) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('API Key no configurada en Netlify → Environment variables → Production.');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: tokens,
      system: SYS_SERMON,
      messages: [{ role:'user', content: prompt }]
    })
  });
  const d = await r.json();
  if (!r.ok) {
    if (r.status === 401) throw new Error('API Key invalida.');
    if (r.status === 429) throw new Error('Limite alcanzado. Intenta en un momento.');
    throw new Error('Error ' + r.status + ': ' + (d.error && d.error.message ? d.error.message : 'Desconocido'));
  }
  if (!d.content || !d.content.length) throw new Error('Seccion vacia.');
  return d.content.map(b => b.text || '').join('');
}

// Definir las secciones según duración
function getSecciones(pasaje, duracion, tipo, tono, contexto) {
  const dur = parseInt(duracion) || 5;
  const ctx = contexto ? ' | Contexto: ' + contexto : '';
  const base = `Pasaje: "${pasaje}" | Tipo: ${tipo} | Tono: ${tono}${ctx}`;
  
  // REGLA DE ORO: Cada seccion debe tener entre 500 y 550 palabras.
  // Puedes extenderte hasta 580 si necesitas terminar una idea.
  // NUNCA superes las 600 palabras. NUNCA cortes a mitad de oracion.
  // Siempre termina con oracion completa y punto final.
  const REGLA = 'IMPORTANTE: Escribe entre 500 y 550 palabras. Puedes llegar hasta 580 si necesitas terminar una idea. NUNCA superes 600 palabras. NUNCA cortes a mitad de oracion — siempre termina con punto final.';

  if (dur <= 5) {
    return [
      {
        prompt: `${base}\n\nEscribe el sermon COMPLETO de 5 minutos con esta estructura exacta:\n\n## SALOMON IA - ${pasaje}\n**Pasaje:** [cita completa]\n**Duracion:** 5 minutos\n---\n### INTRODUCCION\n[1 parrafo impactante]\n\n### EL TEXTO\n[Exegesis breve y clara]\n\n### PUNTO CENTRAL\n[El mensaje cristocentrico desarrollado]\n\n### APLICACION\n[Como cambia mi vida hoy]\n\n### LLAMADO FINAL\n[Desafio y oracion breve]`,
        tokens: 1200
      }
    ];
  }

  // Secciones para sermones largos — 1 llamado por sección de 5 minutos
  const secciones = [];

  // SECCION 1: Encabezado + Introducción
  secciones.push({
    prompt: `${base}\n\nEscribe SOLO el encabezado y la introduccion del sermon de ${dur} minutos:\n\n## SALOMON IA - ${pasaje}\n**Pasaje:** [cita completa del texto biblico]\n**Tipo:** ${tipo} | **Tono:** ${tono}\n**Duracion:** ${dur} minutos\n---\n### INTRODUCCION\n[Escribe una introduccion narrativa poderosa que enganche a la congregacion. Usa una historia, pregunta o situacion de la vida real.]

${REGLA}`,
    tokens: 900
  });

  // SECCION 2: Contexto bíblico
  secciones.push({
    prompt: `${base} | Sermon de ${dur} minutos.\n\nEscribe SOLO la seccion de contexto biblico:\n\n### CONTEXTO BIBLICO E HISTORICO\n[Desarrolla quien escribio este texto, a quien, en que momento historico, que problema o situacion enfrentaban, cual es el genero literario, como encaja en el canon. Profundo y edificante.]

${REGLA}`,
    tokens: 950
  });

  // SECCION 3: Punto I
  secciones.push({
    prompt: `${base} | Sermon de ${dur} minutos.\n\nEscribe SOLO el Punto I del sermon:\n\n### PUNTO I — [pon un titulo cristocentrico poderoso]\n[Desarrolla el primer movimiento del texto. Exegesis solida palabra por palabra de los versiculos clave. Que dice el autor inspirado exactamente. No lo que queremos que diga — lo que dice.]

${REGLA}`,
    tokens: 1000
  });

  // SECCION 4: Punto II
  secciones.push({
    prompt: `${base} | Sermon de ${dur} minutos.\n\nEscribe SOLO el Punto II del sermon:\n\n### PUNTO II — [titulo teologico profundo]\n[Desarrolla la teologia que emerge del texto. Conecta con la teologia sistematica. Que dice este pasaje sobre Dios, el hombre, el pecado, la gracia, la redencion. Profundo y pastoral.]

${REGLA}`,
    tokens: 1100
  });

  // SECCION 5: Punto III (Cristología) — solo si hay tiempo
  if (dur >= 30) {
    secciones.push({
      prompt: `${base} | Sermon de ${dur} minutos.\n\nEscribe SOLO el Punto III cristologico:\n\n### PUNTO III — CRISTO EN ESTE TEXTO\n[Muestra como este pasaje apunta a Cristo, se cumple en Cristo o es explicado por Cristo. Usa tipologia, profecia, promesa o principio que converge en el Evangelio. Esto es el corazon del sermon. ]

${REGLA}`,
      tokens: 1100
    });
  }

  // SECCION extra: Punto IV para sermones de 45-60 min
  if (dur >= 45) {
    secciones.push({
      prompt: `${base} | Sermon de ${dur} minutos.\n\nEscribe SOLO el Punto IV pastoral:\n\n### PUNTO IV — IMPLICACIONES PARA HOY\n[Desarrolla 3-4 implicaciones pastorales concretas. Como cambia este texto la manera en que vivimos, oramos, nos relacionamos, servimos. Casos reales de la vida pastoral. ]

${REGLA}`,
      tokens: 1300
    });
  }

  // SECCION: Aplicación
  secciones.push({
    prompt: `${base} | Sermon de ${dur} minutos.\n\nEscribe SOLO la seccion de aplicacion:\n\n### APLICACION PERSONAL Y CONGREGACIONAL\n[${dur <= 30 ? '2-3' : '3-4'} aplicaciones concretas y especificas. No genericas — situaciones reales: el que esta pasando por una crisis, el que duda, el que necesita perdonar, el lider cansado. Que hacer esta semana con este texto. ]

${REGLA}`,
    tokens: 1200
  });

  // SECCION FINAL: Conclusión + Llamado
  secciones.push({
    prompt: `${base} | Sermon de ${dur} minutos.

### CONCLUSION
Sintesis poderosa del mensaje (2-3 parrafos concisos).

### LLAMADO FINAL
Invitacion directa al compromiso (2 parrafos).

### ORACION DE CIERRE
Oracion pastoral que cierre el sermon. La ULTIMA LINEA debe ser exactamente: "En el nombre de Jesucristo, Amen."

${REGLA}
ADICIONAL: La oracion de cierre es OBLIGATORIA. Si te acercas al limite de palabras, abrevia los parrafos anteriores pero NUNCA omitas la oracion final.`,
    tokens: 2500
  });

  return secciones;
}

async function generarSermon(pasaje, duracion, tipo, tono, contexto) {
  const secciones = getSecciones(pasaje, duracion, tipo, tono, contexto);
  console.log('[AGENTE] Sermon ' + duracion + 'min | ' + secciones.length + ' secciones en paralelo | Sonnet');

  // TODAS las secciones en paralelo — máxima velocidad
  const resultados = await Promise.all(
    secciones.map((sec, i) => 
      llamarSonnet(sec.prompt, sec.tokens)
        .then(txt => { console.log('[SEC ' + (i+1) + '] OK'); return txt; })
        .catch(err => { console.error('[SEC ' + (i+1) + '] Error:', err.message); return ''; })
    )
  );

  const sermon = resultados.filter(r => r.length > 0).join('\n\n');
  
  // Check if conclusion was cut off - if so, regenerate it
  const lastSection = resultados[resultados.length - 1] || '';
  const hasClosure = lastSection.includes('Amen') || lastSection.includes('amén') || 
                     lastSection.includes('ORACION') || lastSection.includes('Oración');
  if (!hasClosure && lastSection.length > 0 && lastSection.length < 500) {
    console.log('[AGENTE] Conclusion parece incompleta, regenerando...');
    const secFinal = secciones[secciones.length - 1];
    const retry = await llamarSonnet(secFinal.prompt + '\n\nIMPORTANTE: El texto DEBE terminar con la oracion completa y "Amen."', 3000).catch(() => lastSection);
    resultados[resultados.length - 1] = retry;
  }
  
  const sermonFinal = resultados.filter(r => r.length > 0).join('\n\n');
  if (!sermonFinal || sermonFinal.length < 100) throw new Error('No se pudo generar el sermon. Intenta de nuevo.');
  return sermon;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode:200, headers:corsH(event), body:'' };
  if (event.httpMethod !== 'POST') return { statusCode:405, body:JSON.stringify({ error:'Metodo no permitido.' }) };

  const ip = (event.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();

  if (!origenOk(event.headers)) {
    const n = (intentosMap.get(ip)||0)+1; intentosMap.set(ip,n);
    console.warn('[DETECTIVE] Bloqueado #'+n+' IP:'+ip);
    return { statusCode:403, headers:corsH(event), body:JSON.stringify({ error:'Acceso denegado.', accion:n>=3?'REINICIAR':null }) };
  }

  if (!checkRate(ip)) return { statusCode:429, headers:corsH(event), body:JSON.stringify({ error:'Demasiadas peticiones.' }) };

  let body;
  try { body = JSON.parse(event.body||'{}'); }
  catch(e) { return { statusCode:400, body:JSON.stringify({ error:'Body invalido.' }) }; }

  const token  = body.token;
  const datos  = body.datos || {};
  const accion = body.accion || 'llamada_directa';
  const esSermon = accion === 'generar_sermon';

  if (!tokenOk(token, esSermon)) {
    return { statusCode:403, headers:corsH(event), body:JSON.stringify({ error:'Token expirado. Recarga la pagina.', accion:'REINICIAR' }) };
  }

  try {
    if (esSermon) {
      const pasaje   = datos.pasaje || 'el pasaje indicado';
      const duracion = datos.duracion || 5;
      const tipo     = datos.tipo || 'Expositiva';
      const tono     = datos.tono || 'Reflexivo';
      const contexto = datos.contexto || '';

      const texto = await generarSermon(pasaje, duracion, tipo, tono, contexto);
      console.log('[AGENTE] Sermon OK | Palabras:' + texto.split(' ').length);
      return { statusCode:200, headers:Object.assign({},corsH(event),{'Cache-Control':'no-store'}), body:JSON.stringify({ texto:texto }) };

    } else {
      const system   = datos.system;
      const messages = datos.messages;
      if (!system) throw new Error('Falta system.');
      if (!messages || !Array.isArray(messages) || !messages.length) throw new Error('Faltan messages.');
      const ultimo = messages[messages.length-1].content;
      const texto  = await llamarSonnet(system + '\n\n' + ultimo, datos.max_tokens || 4096);
      return { statusCode:200, headers:Object.assign({},corsH(event),{'Cache-Control':'no-store'}), body:JSON.stringify({ texto:texto }) };
    }

  } catch(err) {
    console.error('[AGENTE] Error:', err.message);
    return { statusCode:500, headers:corsH(event), body:JSON.stringify({ error:err.message }) };
  }
};
