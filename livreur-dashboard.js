// ==========================================
// DAKPRO ÉLITE — Module : livreur-dashboard.js
// ==========================================

import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export async function init() {
    console.log("Initialisation du Tableau de Bord Livreur - DAKPRO ÉLITE");
    
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const container = document.getElementById('dashboard-container');

    if (!currentUser) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ffcc00;">
                <h3>🔒 Authentification Requise</h3>
                <p style="color: #a1a1aa; margin-top: 10px; font-size: 14px;">Veuillez vous connecter pour accéder à votre espace livreur.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ffcc00;">
            <p>Chargement de votre tableau de bord logistique...</p>
        </div>
    `;

    const db = getDatabase();
    const dbRef = ref(db);
    let livreurData = null;
    let livraisonsEffectuees = 0;
    let totalRevenus = 0;

    try {
        // CORRECTION DE L'ARCHITECTURE : Utilisation du nœud "users/" cohérent avec l'inscription
        const userSnapshot = await get(child(dbRef, `users/${currentUser.uid}`));
        if (userSnapshot.exists()) {
            livreurData = userSnapshot.val();
            
            // Calcul des livraisons terminées et des revenus associés (si le nœud existe)
            if (livreurData.livraisons) {
                const livraisonsList = Object.values(livreurData.livraisons);
                livraisonsList.forEach(livraison => {
                    if (livraison.statut === 'Terminée' || livraison.statut === 'Livré') {
                        livraisonsEffectuees++;
                        totalRevenus += parseFloat(livraison.montantLivreur || livraison.montant || 0);
                    }
                });
            }
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des données livreur :", error);
    }

    // Récupération dynamique du nom depuis Realtime Database ou le profil Auth
    const nomLivreur = (livreurData && livreurData.nom) ? livreurData.nom : (currentUser.displayName || currentUser.email);

    container.innerHTML = `
        <style>
            .dash-welcome {
                background: linear-gradient(135deg, #1c1c21 0%, #101012 100%);
                border: 1px solid #34d399;
                border-radius: 14px;
                padding: 25px;
                margin-bottom: 25px;
                box-shadow: 0 4px 20px rgba(52, 211, 153, 0.15);
            }
            .dash-grid-stats {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
            }
            @media(min-width: 768px) {
                .dash-grid-stats { grid-template-columns: repeat(4, 1fr); }
            }
            @media(min-width: 1024px) {
                .dash-grid-stats { grid-template-columns: repeat(6, 1fr); }
            }
            .stat-card {
                background: #161619;
                border: 1px solid #2a2a32;
                border-radius: 12px;
                padding: 20px 15px;
                text-align: center;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            }
            .stat-value {
                font-size: 22px;
                font-weight: 800;
                color: #34d399;
                margin-top: 8px;
            }
            .stat-label {
                font-size: 12px;
                color: #a1a1aa;
                font-weight: 600;
            }
        </style>

        <div class="dash-welcome">
            <h2 style="color: #34d399; margin-bottom: 8px;">Bienvenue, ${nomLivreur} 🚀</h2>
            <p style="color: #a1a1aa; font-size: 14px; line-height: 1.5;">
                Votre tableau de bord livreur est connecté et sécurisé. Retrouvez ci-dessous vos statistiques de courses et l'état de vos livraisons.
            </p>
        </div>

        <div class="dash-grid-stats">
            <div class="stat-card">
                <div class="stat-label">Livraisons Réussies</div>
                <div class="stat-value">${livraisonsEffectuees}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Revenus Cumulés</div>
                <div class="stat-value" style="color: #ffcc00;">${totalRevenus} XOF</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Statut Partenaire</div>
                <div class="stat-value" style="font-size: 15px; color: #34d399;">Actif VIP</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Sécurité Réseau</div>
                <div class="stat-value" style="font-size: 15px; color: #ffcc00;">Protégé</div>
            </div>
        </div>
    `;
}
