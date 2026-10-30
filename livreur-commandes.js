// ==========================================
// DAKPRO ÉLITE — Module : livreur-commandes.js
// ==========================================

import { getDatabase, ref, get, child, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export async function init() {
    console.log("Initialisation des Commandes à Prendre - DAKPRO ÉLITE");
    
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const container = document.getElementById('dashboard-container');

    if (!currentUser) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ffcc00;">
                <h3>🔒 Authentification Requise</h3>
                <p style="color: #a1a1aa; margin-top: 10px; font-size: 14px;">Veuillez vous connecter pour voir les commandes disponibles.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ffcc00;">
            <p>Recherche des commandes prêtes pour la livraison...</p>
        </div>
    `;

    const db = getDatabase();
    const dbRef = ref(db);
    let commandesDisponibles = [];

    try {
        // Lecture directe de la structure exacte visible sur vos captures : racine "commandes/{acheteurUid}/{commandeId}"
        const snapshot = await get(child(dbRef, `commandes`));
        if (snapshot.exists()) {
            const acheteursData = snapshot.val();
            Object.keys(acheteursData).forEach(acheteurUid => {
                const commandesAcheteur = acheteursData[acheteurUid];
                Object.keys(commandesAcheteur).forEach(cmdId => {
                    const cmd = commandesAcheteur[cmdId];
                    
                    // Vérification du statut (ex: en attente de livraison ou non assignée)
                    const statutCmd = cmd.statut || (cmd.client && cmd.client.statut);
                    const livreurAssigne = cmd.livreurId || (cmd.client && cmd.client.livreurId);

                    if (!livreurAssigne) {
                        commandesDisponibles.push({
                            id: cmdId,
                            acheteurUid: acheteurUid,
                            ...cmd
                        });
                    }
                });
            });
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des commandes :", error);
    }

    let htmlContent = `
        <style>
            .commandes-header {
                margin-bottom: 25px;
                border-bottom: 1px solid #2a2a32;
                padding-bottom: 15px;
            }
            .commandes-grid {
                display: grid;
                grid-template-columns: repeat(1, 1fr);
                gap: 15px;
            }
            @media(min-width: 768px) {
                .commandes-grid { grid-template-columns: repeat(2, 1fr); }
            }
            @media(min-width: 1024px) {
                .commandes-grid { grid-template-columns: repeat(3, 1fr); }
            }
            .commande-card {
                background: #161619;
                border: 1px solid #2a2a32;
                border-radius: 12px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
            }
            .commande-card:hover {
                border-color: #34d399;
                transform: translateY(-3px);
            }
            .btn-accepter {
                background: linear-gradient(135deg, #34d399 0%, #059669 100%);
                color: #0b0b0d;
                border: none;
                padding: 12px;
                border-radius: 8px;
                font-weight: 800;
                font-size: 13px;
                cursor: pointer;
                width: 100%;
                margin-top: 15px;
                transition: opacity 0.2s;
            }
            .btn-accepter:hover {
                opacity: 0.9;
            }
        </style>

        <div class="commandes-header">
            <h2 style="color: #34d399; margin-bottom: 5px;">📦 Commandes Disponibles à Prendre</h2>
            <p style="color: #a1a1aa; font-size: 13px;">Sélectionnez une course issue du catalogue global pour l'ajouter à vos tournées.</p>
        </div>
    `;

    if (commandesDisponibles.length === 0) {
        htmlContent += `
            <div style="text-align: center; padding: 50px; color: #a1a1aa;">
                <p>Aucune commande disponible pour le moment. Revenez un peu plus tard !</p>
            </div>
        `;
    } else {
        htmlContent += `<div class="commandes-grid">`;
        commandesDisponibles.forEach(cmd => {
            const montant = cmd.montantTotal ? `${cmd.montantTotal} ${cmd.devise || 'XOF'}` : '0 XOF';
            const emailAcheteur = cmd.acheteurEmail || 'Client DAKPRO';
            const commandeRefId = cmd.id;
            
            // Extraction sécurisée des infos de livraison depuis l'objet "client" ou "livraison"
            let adresseLivraison = "Adresse standard / Port de Cotonou";
            if (cmd.client && cmd.client.adresse) {
                adresseLivraison = cmd.client.adresse;
            } else if (cmd.livraisons && cmd.livraisons.adresse) {
                adresseLivraison = cmd.livraisons.adresse;
            }

            htmlContent += `
                <div class="commande-card">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span style="font-size: 12px; color: #ffcc00; font-weight: bold;">ID: ${commandeRefId}</span>
                            <span style="font-size: 13px; color: #34d399; font-weight: 800;">${montant}</span>
                        </div>
                        <div style="font-size: 13px; font-weight: 700; color: #f5f5f7; margin-bottom: 6px;">👤 ${emailAcheteur}</div>
                        <div style="font-size: 12px; color: #a1a1aa; margin-bottom: 10px; line-height: 1.4;">📍 ${adresseLivraison}</div>
                    </div>
                    <button class="btn-accepter" onclick="window.prendreCommande('${cmd.acheteurUid}', '${commandeRefId}', ${cmd.montantTotal || 0})">Prendre la course</button>
                </div>
            `;
        });
        htmlContent += `</div>`;
    }

    container.innerHTML = htmlContent;

    // Fonction globale pour assigner la commande au livreur connecté dans la base de données
    window.prendreCommande = async function(acheteurUid, cmdId, montant) {
        if (!confirm("Voulez-vous accepter cette course de livraison ?")) return;

        try {
            const timestamp = Date.now();
            
            // 1. Enregistrer la course dans le profil du livreur connecté sous "users/{uid}/livraisons/{cmdId}"
            await set(ref(db, `users/${currentUser.uid}/livraisons/${cmdId}`)), {
                commandeId: cmdId,
                acheteurUid: acheteurUid,
                montantLivreur: montant * 0.1, // Commission de 10%
                montantTotalCommande: montant,
                statut: 'En cours de route',
                datePriseEnCharge: timestamp
            };

            // 2. Mettre à jour le statut directement dans le nœud global "commandes/{acheteurUid}/{cmdId}"
            await set(ref(db, `commandes/${acheteurUid}/${cmdId}/statut`), 'Pris en charge');
            await set(ref(db, `commandes/${acheteurUid}/${cmdId}/livreurId`), currentUser.uid);

            alert("Course acceptée avec succès !");
            init(); // Rafraîchir la liste
        } catch (error) {
            console.error("Erreur lors de l'acceptation de la commande :", error);
            alert("Erreur technique lors de la prise en charge.");
        }
    };
}
