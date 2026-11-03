// ==========================================
// DAKPRO ÉLITE — Module : livreur-dashboard.js
// ==========================================

import { getDatabase, ref, get, child, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
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
    let nomLivreur = currentUser.displayName || currentUser.email;
    let livreurId = currentUser.uid;

    let totalCommandesAssignees = 0;
    let totalMessagesEnvoyes = 0;
    let totalLivrees = 0;
    let totalRevenus = 0;
    let commandesList = [];

    try {
        // 1. Récupération des données du profil livreur
        const userSnapshot = await get(child(dbRef, `users/${currentUser.uid}`));
        if (userSnapshot.exists()) {
            livreurData = userSnapshot.val();
            if (livreurData.nom) {
                nomLivreur = livreurData.nom;
            }
        }

        // 2. Récupération globale des commandes de la base de données
        const commandesSnapshot = await get(child(dbRef, `commandes`));
        if (commandesSnapshot.exists()) {
            const commandesRoot = commandesSnapshot.val();
            
            // Parcours des utilisateurs / acheteurs et de leurs commandes respectives[span_1](start_span)[span_1](end_span)
            Object.entries(commandesRoot).forEach(([acheteurId, userCommandes]) => {
                if (userCommandes && typeof userCommandes === 'object') {
                    Object.entries(userCommandes).forEach(([commandeId, cmdData]) => {
                        // Vérifie si la commande est assignée à ce livreur (via son ID ou son nom exact stocké dans livraison.livreurId)
                        const assignedLivreur = cmdData.livraison?.livreurId || cmdData.livreurId;
                        
                        if (assignedLivreur === livreurId || assignedLivreur === nomLivreur) {
                            totalCommandesAssignees++;
                            
                            const statut = cmdData.livraison?.statut || cmdData.statut || 'En attente';
                            if (statut === 'Terminée' || statut === 'Livré' || statut === 'Livrée') {
                                totalLivrees++;
                                totalRevenus += parseFloat(cmdData.montantTotal || cmdData.montant || 0);
                            }

                            if (cmdData.messageEnvoye) {
                                totalMessagesEnvoyes++;
                            }

                            commandesList.push({
                                id: commandeId,
                                acheteurId: acheteurId,
                                ...cmdData,
                                statutActuel: statut
                            });
                        }
                    });
                }
            });
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des données logistiques :", error);
    }

    // Injection du design et du tableau dynamique
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
                margin-bottom: 25px;
            }
            @media(min-width: 768px) {
                .dash-grid-stats { grid-template-columns: repeat(4, 1fr); }
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
            .panel-commandes {
                background: #161619;
                border: 1px solid #2a2a32;
                border-radius: 14px;
                padding: 20px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            }
            .table-responsive {
                width: 100%;
                overflow-x: auto;
                margin-top: 15px;
            }
            table.dakpro-table {
                width: 100%;
                border-collapse: collapse;
                text-align: left;
                font-size: 13px;
                color: #f3f4f6;
            }
            table.dakpro-table th {
                background: #1c1c21;
                color: #34d399;
                padding: 12px;
                border-bottom: 2px solid #2a2a32;
            }
            table.dakpro-table td {
                padding: 12px;
                border-bottom: 1px solid #2a2a32;
            }
            .btn-whatsapp {
                background: #25d366;
                color: white;
                border: none;
                padding: 8px 14px;
                border-radius: 8px;
                font-weight: 700;
                font-size: 12px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                text-decoration: none;
                transition: 0.2s;
            }
            .btn-whatsapp:hover {
                background: #20ba5a;
            }
            .form-config-box {
                background: #1c1c21;
                border: 1px solid #2a2a32;
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 20px;
            }
            .form-config-box label {
                display: block;
                font-size: 12px;
                color: #a1a1aa;
                margin-bottom: 5px;
            }
            .form-config-box textarea {
                width: 100%;
                background: #101012;
                border: 1px solid #2a2a32;
                color: #fff;
                padding: 10px;
                border-radius: 6px;
                font-size: 13px;
                resize: vertical;
            }
        </style>

        <div class="dash-welcome">
            <h2 style="color: #34d399; margin-bottom: 8px;">Bienvenue, ${nomLivreur} 🚀</h2>
            <p style="color: #a1a1aa; font-size: 14px; line-height: 1.5;">
                Gérez vos livraisons assignées, contactez directement vos clients via WhatsApp et suivez vos performances en temps réel.
            </p>
        </div>

        <div class="dash-grid-stats">
            <div class="stat-card">
                <div class="stat-label">Total Commandes</div>
                <div class="stat-value">${totalCommandesAssignees}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Messages / Contacts</div>
                <div class="stat-value" style="color: #60a5fa;">${totalMessagesEnvoyes}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Colis Livrés</div>
                <div class="stat-value" style="color: #34d399;">${totalLivrees}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Revenus Cumulés</div>
                <div class="stat-value" style="color: #ffcc00;">${totalRevenus} XOF</div>
            </div>
        </div>

        <div class="panel-commandes">
            <h3 style="color: #fff; font-size: 16px; margin-bottom: 10px;">📋 Gestion des Commandes & Clients</h3>
            
            <div class="form-config-box">
                <label for="custom-msg-template">💬 Modèle de message automatique pour le client :</label>
                <textarea id="custom-msg-template" rows="2">Bonjour, je suis votre livreur officiel DAKPRO ÉLITE. Je prends en charge la livraison de votre commande. Merci de me confirmer votre position exacte.</textarea>
            </div>

            <div class="table-responsive">
                <table class="dakpro-table">
                    <thead>
                        <tr>
                            <th>ID Commande</th>
                            <th>Client / Contact</th>
                            <th>Montant</th>
                            <th>Statut</th>
                            <th>Action WhatsApp</th>
                        </tr>
                    </thead>
                    <tbody id="commandes-table-body">
                        ${commandesList.length === 0 ? `
                            <tr>
                                <td colspan="5" style="text-align: center; color: #a1a1aa; padding: 25px;">Aucune commande assignée pour le moment.</td>
                            </tr>
                        ` : commandesList.map(cmd => {
                            // Extraction sécurisée des informations client et de contact
                            const clientNom = cmd.client?.nom || cmd.contactLivraison?.nom || "Client DAKPRO";
                            const clientTel = cmd.client?.telephone || cmd.contactLivraison?.telephone || cmd.telephone || "";
                            const montant = cmd.montantTotal || cmd.montant || 0;
                            const formatTel = clientTel.replace(/[^0-9]/g, '');

                            return `
                                <tr>
                                    <td><b>${cmd.id}</b></td>
                                    <td>
                                        <div>${clientNom}</div>
                                        <div style="font-size: 11px; color: #a1a1aa;">📞 ${clientTel || 'Non renseigné'}</div>
                                    </td>
                                    <td>${montant} XOF</td>
                                    <td><span style="padding: 4px 8px; border-radius: 6px; font-size: 11px; background: ${cmd.statutActuel === 'Livrée' || cmd.statutActuel === 'Terminée' ? 'rgba(52,211,153,0.15); color: #34d399;' : 'rgba(255,204,0,0.15); color: #ffcc00;'}">${cmd.statutActuel}</span></td>
                                    <td>
                                        ${formatTel ? `
                                            <a href="#" class="btn-whatsapp" data-tel="${formatTel}" data-cmdid="${cmd.id}" data-acheteur="${cmd.acheteurId}">
                                                💬 Notifier WhatsApp
                                            </a>
                                        ` : `
                                            <span style="color: #ef4444; font-size: 11px;">Numéro invalide</span>
                                        `}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Gestionnaire d'événement pour l'envoi dynamique vers WhatsApp et mise à jour du compteur de messages
    document.querySelectorAll('.btn-whatsapp').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const tel = btn.getAttribute('data-tel');
            const cmdId = btn.getAttribute('data-cmdid');
            const acheteurId = btn.getAttribute('data-acheteur');
            const templateText = document.getElementById('custom-msg-template').value;

            const finalMessage = encodeURIComponent(`${templateText} (Réf Commande : ${cmdId})`);
            const whatsappUrl = `https://wa.me/${tel}?text=${finalMessage}`;

            // Enregistrement de l'action de message envoyé dans Firebase pour mettre à jour les compteurs dynamiques
            try {
                if (acheteurId && cmdId) {
                    await update(ref(db, `commandes/${acheteurId}/${cmdId}`), {
                        messageEnvoye: true,
                        dateDernierContact: Date.now()
                    });
                }
            } catch (err) {
                console.error("Erreur lors de la mise à jour du statut du message :", err);
            }

            // Redirection vers l'application WhatsApp du téléphone
            window.open(whatsappUrl, '_blank');
        });
    });
}
