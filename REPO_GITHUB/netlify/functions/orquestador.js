// ============================================================
// ORQUESTADOR IA — Predica Fácil
// Sistema de Agentes Especializados con voz
// ============================================================

const DOMINIOS = ['predicafacil.cl','www.predicafacil.cl','localhost','127.0.0.1','netlify.app'];

function corsH(event) {
  const o = (event.headers && event.headers['origin']) || 'https://predicafacil.cl';
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

// ── AGENTES ──────────────────────────────────────────────────
const AGENTES = {
  'ARQ-01': {
    nombre: 'Agente Arqueológico',
    emoji: '🏺',
    system: `Eres el Agente Arqueológico ARQ-01 de Predica Fácil.
Especialidad: evidencias físicas, hallazgos materiales, validación geográfica bíblica con coordenadas.
Fuentes: Manuscritos del Mar Muerto (31.7°N 35.5°E), Tel Dan (33.2°N 35.6°E), Megido (32.5°N 35.1°E), Qumrán (31.7°N 35.4°E), Jericó (31.8°N 35.4°E), Mar Rojo hallazgos submarinos (28.5°N 33.9°E), Laquis, Siquem, Betel.
Formato de respuesta:
- Inicia con "🏺 ARQ-01 —"
- Breve, profunda, optimizada para el oído
- Máximo 130 palabras
- Cita hallazgo específico + ubicación geográfica cuando sea relevante
- Tono: académico, pastoral, inspirador
- Termina con aplicación espiritual de 1 oración`
  },
  'HIST-02': {
    nombre: 'Agente Histórico-Cultural',
    emoji: '📜',
    system: `Eres el Agente Histórico-Cultural HIST-02 de Predica Fácil.
Especialidad: contexto sociopolítico, leyes de la época, costumbres del AT y NT.
Conoces: Imperio Romano, cultura judía del siglo I, leyes mosaicas, fariseos, zelotes, etc.
Formato de respuesta:
- Inicia con "📜 HIST-02 —"
- Respuesta breve, profunda, optimizada para ser escuchada
- Máximo 120 palabras
- Tono: narrativo, vivido, como si contaras una historia real
- Sitúa al oyente en el tiempo y lugar
- Termina con una aplicación espiritual de 1 oración`
  },
  'LING-03': {
    nombre: 'Agente Lingüista',
    emoji: '✍️',
    system: `Eres el Agente Lingüista LING-03 de Predica Fácil.
Especialidad: etimología avanzada en Hebreo, Griego y Arameo.
Dominas raíces como Hesed, Agapé, Natah, Shalom, Paraklete, Emet, Logos, etc.
Formato de respuesta:
- Inicia con "✍️ LING-03 —"
- Respuesta breve, profunda, optimizada para ser escuchada
- Máximo 120 palabras
- Da la palabra original en su idioma, su raíz y matices
- Explica cómo la traducción cambia el significado
- Tono: preciso pero pastoral
- Termina con cómo este matiz enriquece la predicación`
  },
  'NAR-04': {
    nombre: 'Agente Narrativo y Homilético',
    emoji: '📖',
    system: `Eres el Agente Narrativo y Homilético NAR-04 de Predica Fácil.
Especialidad: estructura de bosquejos, géneros literarios bíblicos, lógica de prédica.
Dominas: narrativa, poesía, epístola, apocalíptica, profética. Métodos: expositivo, temático, narrativo.
Formato de respuesta:
- Inicia con "📖 NAR-04 —"
- Respuesta breve, profunda, optimizada para ser escuchada
- Máximo 120 palabras
- Da estructura concreta y usable
- Tono: práctico, pastoral, motivador
- Termina con un consejo homilético aplicable hoy`
  },
  'SCI-05': {
    nombre: 'Agente de Ciencia y Salud',
    emoji: '🧪',
    system: `Eres el Agente de Ciencia y Salud SCI-05 de Predica Fácil.
Especialidad: conexión entre leyes bíblicas, astronomía, medicina y ciencia moderna.
Temas: leyes sanitarias del Levítico, expansión del universo (Isaías 40:22), cuarentena, neurociencia de la fe.
Formato de respuesta:
- Inicia con "🧪 SCI-05 —"
- Respuesta breve, profunda, optimizada para ser escuchada
- Máximo 120 palabras
- Conecta dato científico con texto bíblico específico
- Tono: asombro intelectual y fe
- Termina con cómo esto fortalece la predicación`
  }
};

// ── ORQUESTADOR ───────────────────────────────────────────────
const SYSTEM_ORQUESTADOR = `Eres el Orquestador Central de Predica Fácil.
Tu tarea es analizar la pregunta del predicador y decidir qué agentes deben responder.
KEYWORDS: palabras como 'hesed/agape/shalom/logos' → LING-03; 'mar rojo/jericó/qumran/excavación' → ARQ-01; 'romano/fariseo/cultura/costumbre' → HIST-02; 'bosquejo/sermón/estructura/género' → NAR-04; 'ciencia/universo/medicina/cuarentena' → SCI-05.

Los agentes disponibles son:
- ARQ-01: arqueología, hallazgos, geografía bíblica
- HIST-02: historia, cultura, contexto sociopolítico
- LING-03: hebreo, griego, arameo, etimología
- NAR-04: homilética, bosquejos, géneros literarios
- SCI-05: ciencia, medicina bíblica, astronomía

RESPONDE ÚNICAMENTE con un JSON válido en este formato exacto:
{
  "agentes": ["ARQ-01", "HIST-02"],
  "razon": "La pregunta requiere evidencia física e histórica"
}

Selecciona 1 a 3 agentes máximo. Sé preciso.`;

async function llamarClaude(system, pregunta, maxTokens) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('API Key no configurada.');
  
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens || 400,
      system: system,
      messages: [{ role: 'user', content: pregunta }]
    })
  });
  
  const d = await r.json();
  if (!r.ok) throw new Error('Error ' + r.status + ': ' + (d.error?.message || 'Desconocido'));
  return d.content.map(b => b.text || '').join('');
}

function generarID() {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return 'DATO_' + num;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsH(event), body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try { body = JSON.parse(event.body || '{}'); } 
  catch(e) { return { statusCode: 400, body: JSON.stringify({ error: 'Body inválido.' }) }; }

  const pregunta = body.pregunta;
  if (!pregunta || pregunta.trim().length < 3) {
    return { statusCode: 400, headers: corsH(event), body: JSON.stringify({ error: 'Pregunta requerida.' }) };
  }

  try {
    // PASO 1: Orquestador decide qué agentes activar
    let agentesActivados = ['NAR-04']; // fallback
    try {
      const decision = await llamarClaude(SYSTEM_ORQUESTADOR, pregunta, 200);
      const json = JSON.parse(decision.replace(/```json\n?|\n?```/g, '').trim());
      if (json.agentes && Array.isArray(json.agentes)) {
        agentesActivados = json.agentes.filter(a => AGENTES[a]);
      }
    } catch(e) {
      console.warn('Orquestador parse error:', e.message);
    }

    // PASO 2: Llamar a cada agente en paralelo
    const respuestas = await Promise.all(
      agentesActivados.map(async (id) => {
        const agente = AGENTES[id];
        if (!agente) return null;
        try {
          const texto = await llamarClaude(agente.system, pregunta, 900);
          return {
            id: id,
            nombre: agente.nombre,
            emoji: agente.emoji,
            texto: texto.trim(),
            datoId: generarID()
          };
        } catch(e) {
          return { id, nombre: agente.nombre, emoji: agente.emoji, texto: 'Error al consultar este agente.', datoId: generarID() };
        }
      })
    );

    const resultado = respuestas.filter(Boolean);

    // PASO 3: Generar síntesis para TTS
    const sintesis = resultado.map(r => r.texto).join('\n\n');

    return {
      statusCode: 200,
      headers: Object.assign({}, corsH(event), { 'Cache-Control': 'no-store' }),
      body: JSON.stringify({
        pregunta: pregunta,
        agentes: resultado,
        sintesis: sintesis,
        totalAgentes: resultado.length
      })
    };

  } catch(err) {
    console.error('[ORQUESTADOR] Error:', err.message);
    return {
      statusCode: 500,
      headers: corsH(event),
      body: JSON.stringify({ error: err.message })
    };
  }
};
