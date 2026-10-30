// ==========================================
// DAKPRO ÉLITE — Module : livreur-revenus.js
// ==========================================

import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export async function init() {
    console.log("Initialisation des Revenus Livreur - DAKPRO ÉLITE");
    
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const container = document.getElementById('dashboard-container');

    if (!currentUser) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ffcc00;">
                <h3>🔒 Authentification Requise</h3>
                <p style="color: #a1a1aa; margin-top: 10px; font-size: 14px;">Veuillez vous connecter pour consulter vos revenus.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ffcc00;">
            <p>Calcul automatique de vos gains et commissions...</p>
        </div>
    `;

    const db = getDatabase();
    const dbRef = ref(db);
    let totalRevenus = 0;
    let totalCoursesReussies = 0;
    let historiqueGains = [];

    try {
        const snapshot = await get(child(dbRef, `user/${currentUser.uid}/livraisons`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.keys(data).forEach(key => {
                const liv = data[key];
                if (liv.statut === 'Terminée' || liv.statut === 'Livré') {
                    const montant = parseFloat(liv.montantLivreur || liv.montant || 0);
                    totalRevenus += montant;
                    totalCoursesReussies++;
                    historiqueGains.push({
                        id: key,
                        montant: montant,
                        date: liv.datePriseEnCharge || Date.now(),
                        commandeId: liv.commandeId || 'N/A'
                    });
                }
            });
        }
    } catch (error) {
        console.error("Erreur lors du calcul des revenus :", error);
    }

    let htmlContent = `
        <style>
            .revenus-header {
                margin-bottom: 25px;
                border-bottom: 1px solid #2a2a32;
                padding-bottom: 15px;
            }
            .solde-card {
                background: linear-gradient(135deg, #1c1c21 0%, #101012 100%);
                border: 1px solid #ffcc00;
                border-radius: 16px;
                padding: 30px;
                text-align: center;
                margin-bottom: 25px;
                box-shadow: 0 8px 30px rgba(212, 175, 55, 0.2);
            }
            .revenus-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                margin-bottom: 25px;
            }
            @media(min-width: 768px) {
                .revenus-grid { grid-template-columns: repeat(4, 1fr); }
            }
            @media(min-width: 1024px) {
                .revenus-grid { grid-template-columns: repeat(6, 1fr); }
            }
            .revenu-item-card {
                background: #161619;
                border: 1px solid #2a2a32;
                border-radius: 12px;
                padding: 15px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            }
        </style>

        <div class="revenus-header">
            <h2 style="color: #ffcc00; margin-bottom: 5px;">💰 Mes Revenus & Commissions</h2>
            <p style="color: #a1a1aa; font-size: 13px;">Suivi détaillé de vos gains calculés automatiquement après chaque livraison réussie.</p>
        </div>

        <div class="solde-card">
            <div style="color: #a1a1aa; font-size: 14px; margin-bottom: 8px; font-weight: 600;">Solde Total Disponible :</div>
            <div style="color: #34d399; font-size: 36px; font-weight: 800; margin-bottom: 10px;">${totalRevenus} XOF</div>
            <div style="color: #ffcc00; font-size: 13px;">Généré sur ${totalCoursesReussies} course(s) validée(s)</div>
        </div>

        <h3 style="color: #f5f5f7; font-size: 15px; margin-bottom: 15px; font-weight: 600;">Historique des Gains par Course :</h3>
    `;

    if (historiqueGains.length === 0) {
        htmlContent += `
            <div style="text-align: center; padding: 40px; color: #a1a1aa;">
                <p>Aucun revenu enregistré pour le moment. Effectuez des livraisons pour cumuler des gains.</p>
            </div>
        `;
    } else {
        htmlContent += `<div class="revenus-grid">`;
        historiqueGains.forEach(gain => {
            const dateStr = new Date(gain.date).toLocaleDateString();
            htmlContent += `
                <div class="revenu-item-card">
                    <div>
                        <div style="font-size: 11px; color: #a1a1aa; margin-bottom: 4px;">Course #${gain.id.substring(0, 6)}</div>
                        <div style="font-size: 16px; font-weight: 800; color: #34d399; margin-bottom: 8px;">+${gain.montant} XOF</div>
                        <div style="font-size: 11px; color: #f5f5f7;">Statut : <span style="color:#34d399">Crédité</span></div>
                    </div>
                    <div style="font-size: 10px; color: #71717a; text-align: right; margin-top: 10px;">${dateStr}</div>
                </div>
            `;
        });
        htmlContent += `</div>`;
    }

    container.innerHTML = htmlContent;
}