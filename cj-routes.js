const express = require('express');
const router = express.Router();
const axios = require('axios');
const admin = require('firebase-admin');

const CJ_API_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
let cjAccessToken = null;
let tokenExpiresAt = null;

// Fonction pour obtenir le token d'accès CJdropshipping
async function getCJAccessToken() {
    const CJ_EMAIL = process.env.CJ_EMAIL;
    const CJ_API_KEY = process.env.CJ_API_KEY;

    if (!CJ_EMAIL || !CJ_API_KEY) {
        throw new Error("Les identifiants CJ_EMAIL ou CJ_API_KEY sont manquants dans les variables d'environnement.");
    }

    if (cjAccessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
        return cjAccessToken;
    }

    const response = await axios.post(`${CJ_API_BASE}/authentication/getAccessToken`, {
        email: CJ_EMAIL,
        apiKey: CJ_API_KEY
    });

    const resData = response.data;
    if ((resData.code === 200 || resData.result) && resData.data && resData.data.accessToken) {
        cjAccessToken = resData.data.accessToken;
        tokenExpiresAt = Date.now() + (14 * 24 * 60 * 60 * 1000); // Valide 14 jours
        return cjAccessToken;
    }

    throw new Error(resData.message || "Échec d'authentification auprès de l'API CJdropshipping.");
}

// Route de recherche de produits : /api/dakpro/cj/search
router.get('/cj/search', async (req, res) => {
    try {
        const token = await getCJAccessToken();
        const { keyword, categoryId, pageNum = 1, pageSize = 20 } = req.query;

        const response = await axios.get(`${CJ_API_BASE}/product/list`, {
            headers: { 'CJ-Access-Token': token },
            params: { keyword, categoryId, pageNum, pageSize }
        });

        return res.json({
            success: true,
            data: response.data.data || response.data
        });
    } catch (error) {
        console.error('Erreur recherche CJ :', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Route des détails d'un produit : /api/dakpro/cj/product/:pid
router.get('/cj/product/:pid', async (req, res) => {
    try {
        const token = await getCJAccessToken();
        const { pid } = req.params;

        const response = await axios.get(`${CJ_API_BASE}/product/detail`, {
            headers: { 'CJ-Access-Token': token },
            params: { pid }
        });

        return res.json({
            success: true,
            data: response.data.data || response.data
        });
    } catch (error) {
        console.error('Erreur détails produit CJ :', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Route d'importation des produits : /api/dakpro/products/import
router.post('/products/import', async (req, res) => {
    try {
        const productData = req.body;
        const db = admin.database();
        
        // Détermine la destination (Brouillons ou Catalogue Marketplace actif)
        const targetPath = productData.publishNow ? 'products/active' : 'products/drafts';
        const newRef = db.ref(targetPath).push();

        await newRef.set({
            ...productData,
            importedAt: new Date().toISOString()
        });

        return res.json({
            success: true,
            message: productData.publishNow ? 'Produit publié avec succès sur la marketplace !' : 'Produit enregistré dans les brouillons.'
        });
    } catch (error) {
        console.error('Erreur importation produit :', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
