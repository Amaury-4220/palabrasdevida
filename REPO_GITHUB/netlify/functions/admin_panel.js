// /.netlify/functions/admin_panel.js
// Firebase Admin SDK — Panel de administración seguro
// Requiere variables de entorno en Netlify:
//   FIREBASE_PROJECT_ID = predicador-inspirado
//   FIREBASE_CLIENT_EMAIL = (de la service account)
//   FIREBASE_PRIVATE_KEY = (de la service account)

const admin = require('firebase-admin');

// Inicializar solo una vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined,
    }),
  });
}

const db = admin.firestore();
const auth = admin.auth();

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Verificar que el solicitante es admin
  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'No autorizado' }) };
  }

  let callerUid;
  try {
    const decoded = await auth.verifyIdToken(token);
    callerUid = decoded.uid;
    // Verificar que es admin en Firestore
    const callerDoc = await db.collection('usuarios').doc(callerUid).get();
    const callerData = callerDoc.data() || {};
    if (callerData.rol !== 'admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Solo administradores' }) };
    }
  } catch (e) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token inválido: ' + e.message }) };
  }

  const body = JSON.parse(event.body || '{}');
  const accion = body.accion;

  try {
    // ── LISTAR USUARIOS ──────────────────────────────────────
    if (accion === 'listar') {
      const snap = await db.collection('usuarios').get();
      const users = [];
      snap.forEach(doc => {
        const d = doc.data();
        users.push({
          id: doc.id,
          nombre: d.nombre || '',
          email: d.email || '',
          estado: d.estado || 'activo',
          plan: d.plan || 'gratis',
          iglesia: d.iglesia || '',
          rol: d.rol || 'usuario',
          pergaminos: d.pergaminos || 0,
          fecha_expiracion: d.fecha_expiracion ? d.fecha_expiracion.toDate().toISOString() : null,
          creado: d.creado ? d.creado.toDate().toISOString() : null,
          ultimo_acceso: d.ultimo_acceso ? d.ultimo_acceso.toDate().toISOString() : null,
        });
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, usuarios: users }) };
    }

    // ── ACTUALIZAR POR EMAIL (cuando ya existe) ──────────────
    if (accion === 'actualizar_por_email') {
      const { email, nombre, iglesia, plan, dias } = body;
      // Buscar el uid por email
      const userRecord = await auth.getUserByEmail(email);
      const uid = userRecord.uid;
      const exp = new Date(Date.now() + (dias || 30) * 86400000);
      await db.collection('usuarios').doc(uid).set({
        email, nombre, iglesia: iglesia || '',
        estado: 'activo', plan: plan || 'ofrenda',
        pergaminos: 999, rol: 'usuario',
        fecha_expiracion: admin.firestore.Timestamp.fromDate(exp),
        actualizado: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, uid, mensaje: 'Usuario actualizado: ' + nombre }) };
    }

    // ── CREAR USUARIO ────────────────────────────────────────
    if (accion === 'crear') {
      const { email, password, nombre, iglesia, plan, dias } = body;
      if (!email || !password || !nombre) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan campos obligatorios' }) };
      }
      // Crear en Firebase Auth
      const newUser = await auth.createUser({ email, password, displayName: nombre });
      // Crear documento en Firestore
      const exp = new Date(Date.now() + (dias || 30) * 86400000);
      await db.collection('usuarios').doc(newUser.uid).set({
        email, nombre, iglesia: iglesia || '',
        estado: 'activo', plan: plan || 'ofrenda',
        pergaminos: 999, rol: 'usuario',
        fecha_expiracion: admin.firestore.Timestamp.fromDate(exp),
        creado: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, uid: newUser.uid, mensaje: 'Usuario creado: ' + nombre }) };
    }

    // ── CAMBIAR ESTADO ───────────────────────────────────────
    if (accion === 'estado') {
      const { uid, estado } = body;
      await db.collection('usuarios').doc(uid).update({ estado });
      if (estado === 'bloqueado') await auth.updateUser(uid, { disabled: true });
      if (estado === 'activo')    await auth.updateUser(uid, { disabled: false });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // ── EXTENDER ACCESO ──────────────────────────────────────
    if (accion === 'extender') {
      const { uid, dias } = body;
      const doc = await db.collection('usuarios').doc(uid).get();
      const data = doc.data() || {};
      const base = data.fecha_expiracion ? data.fecha_expiracion.toDate() : new Date();
      const nueva = new Date(Math.max(base.getTime(), Date.now()) + (dias || 30) * 86400000);
      await db.collection('usuarios').doc(uid).update({
        fecha_expiracion: admin.firestore.Timestamp.fromDate(nueva)
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, nueva: nueva.toISOString() }) };
    }

    // ── CAMBIAR PLAN ─────────────────────────────────────────
    if (accion === 'plan') {
      const { uid, plan } = body;
      await db.collection('usuarios').doc(uid).update({ plan, pergaminos: 999 });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // ── ELIMINAR USUARIO ─────────────────────────────────────
    if (accion === 'eliminar') {
      const { uid } = body;
      await db.collection('usuarios').doc(uid).delete();
      try { await auth.deleteUser(uid); } catch(e) { /* puede ya no existir */ }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Acción desconocida: ' + accion }) };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
