const express = require('express');
const admin = require('firebase-admin');

// Initialisation de Firebase Admin (si ce n'est pas déjà fait ailleurs)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
    });
}

const app = express();
app.use(express.json());

// Importation et enregistrement des routes de l'API CJdropshipping
const cjRoutes = require('./cj-routes');
app.use('/api/dakpro', cjRoutes);

// Route de test pour vérifier que le serveur répond en JSON valide
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Le serveur DAKPRO ÉLITE fonctionne parfaitement !' });
});

// Exportation pour Vercel
module.exports = app;
