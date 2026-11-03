// ==========================================
// DAKPRO ÉLITE — Module : livreur-retraits.js
// ==========================================

import { getDatabase, ref, get, child, set, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export async function init() {
    console.log("Initialisation des Retraits Livreur Élite - DAKPRO ÉLITE");
    
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const container = document.getElementById('dashboard-container');

    if (!currentUser) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ffcc00;">
                <h3>🔒 Authentification Requise</h3>
                <p style="color: #a1a1aa; margin-top: 10px; font-size: 14px;">Veuillez vous connecter pour accéder aux retraits.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ffcc00;">
            <p>Chargement du module de retrait sécurisé...</p>
        </div>
    `;

    const db = getDatabase();
    const dbRef = ref(db);
    let totalRevenus = 0;
    let livreurProfil = {};
    let profilRetraitData = {};
    let historiqueDemandes = [];

    try {
        // 1. Récupération du profil utilisateur global
        const userSnap = await get(child(dbRef, `users/${currentUser.uid}`));
        if (userSnap.exists()) {
            livreurProfil = userSnap.val();
        }

        // 2. Récupération depuis le nœud officiel "profil_livre_retrait/{uid}"
        const retraitSnap = await get(child(dbRef, `profil_livre_retrait/${currentUser.uid}`));
        if (retraitSnap.exists()) {
            profilRetraitData = retraitSnap.val();
            if (profilRetraitData.demandes) {
                historiqueDemandes = Object.keys(profilRetraitData.demandes).map(key => ({
                    id: key,
                    ...profilRetraitData.demandes[key]
                })).reverse();
            }
        }

        // 3. Calcul des revenus validés à partir des livraisons terminées
        const livraisonsSnap = await get(child(dbRef, `users/${currentUser.uid}/livraisons`));
        if (livraisonsSnap.exists()) {
            const livData = livraisonsSnap.val();
            Object.values(livData).forEach(liv => {
                if (liv.statut === 'Terminée' || liv.statut === 'Livré' || liv.statut === 'Livrée') {
                    totalRevenus += parseFloat(liv.montantLivreur || liv.montant || 0);
                }
            });
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
    }

    const estVerifie = livreurProfil.verifie === true || livreurProfil.statutValidation === 'Validé' || livreurProfil.statutValidation === 'valide';
    
    const coordonnees = profilRetraitData.coordonnees || {};
    const moyenActuel = coordonnees.moyen || 'MTN Mobile Money';
    const numeroActuel = coordonnees.numero || '';
    const titulaireActuel = coordonnees.titulaire || '';
    
    // Si des coordonnées sont déjà enregistrées, on verrouille le formulaire par défaut
    const coordonneesVerrouillees = !!numeroActuel;
    const SEUIL_MINIMUM = 10500; // Seuil minimum configuré à 10 500 XOF

    let htmlContent = `
        <style>
            .retrait-header {
                margin-bottom: 25px;
                border-bottom: 1px solid #2a2a32;
                padding-bottom: 15px;
            }
            .solde-box {
                background: linear-gradient(135deg, #1c1c21 0%, #101012 100%);
                border: 1px solid #ffcc00;
                border-radius: 14px;
                padding: 25px;
                text-align: center;
                margin-bottom: 25px;
                box-shadow: 0 4px 20px rgba(212, 175, 55, 0.15);
            }
            .form-section {
                background: #161619;
                border: 1px solid #2a2a32;
                border-radius: 14px;
                padding: 20px;
                margin-bottom: 25px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            }
            .form-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 15px;
            }
            @media(min-width: 768px) {
                .form-grid { grid-template-columns: repeat(2, 1fr); }
            }
            .form-group {
                display: flex;
                flex-direction: column;
            }
            .form-group.full {
                grid-column: 1 / -1;
            }
            .form-label {
                font-size: 12px;
                font-weight: 700;
                color: #a1a1aa;
                margin-bottom: 6px;
            }
            .form-input, .form-select {
                background: #101012;
                border: 1px solid #2a2a32;
                border-radius: 8px;
                padding: 12px;
                color: #f5f5f7;
                font-size: 14px;
                outline: none;
                transition: border-color 0.2s;
            }
            .form-input:focus, .form-select:focus {
                border-color: #ffcc00;
            }
            .form-input:disabled, .form-select:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            .btn-action {
                background: linear-gradient(135deg, #ffcc00 0%, #d4af37 100%);
                color: #0b0b0d;
                border: none;
                padding: 14px;
                border-radius: 8px;
                font-weight: 800;
                font-size: 14px;
                cursor: pointer;
                width: 100%;
                margin-top: 15px;
                transition: opacity 0.2s;
            }
            .btn-action:hover {
                opacity: 0.9;
            }
            .btn-action:disabled {
                background: #2a2a32;
                color: #71717a;
                cursor: not-allowed;
            }
            .alerte-box {
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid #ef4444;
                color: #fca5a5;
                padding: 15px;
                border-radius: 10px;
                font-size: 13px;
                margin-bottom: 20px;
                text-align: center;
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
                color: #ffcc00;
                padding: 12px;
                border-bottom: 2px solid #2a2a32;
            }
            table.dakpro-table td {
                padding: 12px;
                border-bottom: 1px solid #2a2a32;
            }
        </style>

        <div class="retrait-header">
            <h2 style="color: #ffcc00; margin-bottom: 5px;">🏦 Gestion des Retraits Élite</h2>
            <p style="color: #a1a1aa; font-size: 13px;">Publiez vos coordonnées de paiement et lancez vos demandes de retrait à partir de ${SEUIL_MINIMUM.toLocaleString()} XOF.</p>
        </div>

        <div class="solde-box">
            <div style="color: #a1a1aa; font-size: 13px; margin-bottom: 5px; font-weight: 600;">Solde Disponible pour Retrait :</div>
            <div style="color: #34d399; font-size: 32px; font-weight: 800; margin-bottom: 5px;">${totalRevenus.toLocaleString()} XOF</div>
            <div style="color: #ffcc00; font-size: 12px;">Seuil minimum requis : ${SEUIL_MINIMUM.toLocaleString()} XOF</div>
        </div>
    `;

    if (!estVerifie) {
        htmlContent += `
            <div class="alerte-box">
                ⚠️ <strong>Compte non vérifié par l'administration</strong><br>
                Vos documents ou votre profil n'ont pas encore été validés par les administrateurs. Vous ne pouvez pas lancer de demande de retrait pour le moment.
            </div>
        `;
    }

    htmlContent += `
        <div class="form-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="color: #ffcc00; font-size: 15px; margin: 0;">📍 Coordonnées de Paiement (Mobile Money / Banque)</h3>
                ${coordonneesVerrouillees ? `
                    <button type="button" style="background:transparent; border:1px solid #ffcc00; color:#ffcc00; padding:5px 10px; border-radius:6px; font-size:11px; cursor:pointer;" onclick="window.deverrouillerCoordonneesRetrait()">Modifier mes coordonnées</button>
                ` : ''}
            </div>
            
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Moyen de Paiement</label>
                    <select id="retrait-moyen" class="form-select" ${coordonneesVerrouillees ? 'disabled' : ''}>
                        <option value="MTN Mobile Money" ${moyenActuel === 'MTN Mobile Money' ? 'selected' : ''}>MTN Mobile Money</option>
                        <option value="Moov Money" ${moyenActuel === 'Moov Money' ? 'selected' : ''}>Moov Money</option>
                        <option value="Celtiis Cash" ${moyenActuel === 'Celtiis Cash' ? 'selected' : ''}>Celtiis Cash</option>
                        <option value="Orange Money" ${moyenActuel === 'Orange Money' ? 'selected' : ''}>Orange Money</option>
                        <option value="Wave" ${moyenActuel === 'Wave' ? 'selected' : ''}>Wave</option>
                        <option value="Virement Bancaire" ${moyenActuel === 'Virement Bancaire' ? 'selected' : ''}>Virement Bancaire</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Numéro de Téléphone / Compte</label>
                    <input type="text" id="retrait-numero" class="form-input" value="${numeroActuel}" placeholder="Ex: +22997000000" ${coordonneesVerrouillees ? 'disabled' : ''}>
                </div>
                <div class="form-group full">
                    <label class="form-label">Nom Exact du Titulaire (Nom sur le compte)</label>
                    <input type="text" id="retrait-titulaire" class="form-input" value="${titulaireActuel}" placeholder="Nom et prénom exacts enregistrés" ${coordonneesVerrouillees ? 'disabled' : ''}>
                </div>
            </div>

            ${!coordonneesVerrouillees ? `
                <button id="btn-sauvegarder-coords" class="btn-action" onclick="window.sauvegarderCoordonneesRetrait()">Publier et Verrouiller mes coordonnées</button>
            ` : `
                <div style="margin-top: 15px; font-size: 11px; color: #34d399; text-align: center;">
                    🔒 Vos coordonnées sont enregistrées et verrouillées dans le profil de retrait.
                </div>
            `}
        </div>

        <div class="form-section">
            <h3 style="color: #34d399; font-size: 15px; margin-bottom: 15px;">💸 Lancer une Demande de Retrait</h3>
            <div class="form-group full" style="margin-bottom: 15px;">
                <label class="form-label">Montant à retirer (XOF)</label>
                <input type="number" id="retrait-montant" class="form-input" placeholder="Minimum 10 500 XOF" min="${SEUIL_MINIMUM}">
            </div>
            <button class="btn-action" style="background: linear-gradient(135deg, #34d399 0%, #059669 100%); color: #0b0b0d;" onclick="window.lancerDemandeRetrait(${totalRevenus}, ${estVerifie})">Soumettre la Demande à l'Admin</button>
        </div>

        <div class="form-section">
            <h3 style="color: #f5f5f7; font-size: 15px; margin-bottom: 15px;">📋 Historique de vos Demandes de Retrait</h3>
            <div class="table-responsive">
                <table class="dakpro-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Moyen & Numéro</th>
                            <th>Montant</th>
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${historiqueDemandes.length === 0 ? `
                            <tr>
                                <td colspan="4" style="text-align: center; color: #a1a1aa; padding: 20px;">Aucune demande de retrait effectuée pour le moment.</td>
                            </tr>
                        ` : historiqueDemandes.map(dem => `
                            <tr>
                                <td style="font-size: 11px; color: #a1a1aa;">${new Date(dem.date).toLocaleString('fr-FR')}</td>
                                <td>
                                    <div><b>${dem.coordonnees?.moyen || 'N/A'}</b></div>
                                    <div style="font-size: 11px; color: #a1a1aa;">${dem.coordonnees?.numero || ''} (${dem.coordonnees?.titulaire || ''})</div>
                                </td>
                                <td style="font-weight: bold; color: #ffcc00;">${Number(dem.montant).toLocaleString()} XOF</td>
                                <td>
                                    <span style="padding: 4px 8px; border-radius: 6px; font-size: 11px; background: ${dem.statut?.includes('Confirmé') || dem.statut?.includes('Validé') ? 'rgba(52,211,153,0.15); color: #34d399;' : 'rgba(255,204,0,0.15); color: #ffcc00;'}">
                                        ${dem.statut}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = htmlContent;

    // Fonction pour déverrouiller temporairement les coordonnées pour modification
    window.deverrouillerCoordonneesRetrait = function() {
        document.getElementById('retrait-moyen').disabled = false;
        document.getElementById('retrait-numero').disabled = false;
        document.getElementById('retrait-titulaire').disabled = false;
        
        // Remplacer la zone par un bouton de sauvegarde
        const section = document.querySelector('.form-section');
        // On réinitialise l'interface en rechargeant le module avec le verrou levé
        init();
    };

    // Fonction d'enregistrement dynamique dans le nœud officiel "profil_livre_retrait/{uid}/coordonnees"
    window.sauvegarderCoordonneesRetrait = async function() {
        const moyen = document.getElementById('retrait-moyen').value;
        const numero = document.getElementById('retrait-numero').value.trim();
        const titulaire = document.getElementById('retrait-titulaire').value.trim();

        if (!numero || !titulaire) {
            alert("Veuillez renseigner votre numéro ainsi que le nom exact du titulaire.");
            return;
        }

        try {
            const coordonneesPayload = {
                moyen,
                numero,
                titulaire,
                updatedAt: new Date().toISOString()
            };

            // Écriture directe dans le nœud demandé : profil_livre_retrait/{uid}/coordonnees
            await set(ref(db, `profil_livre_retrait/${currentUser.uid}/coordonnees`), coordonneesPayload);
            
            // On sauvegarde aussi une copie de secours dans users/{uid}/profil_retrait si nécessaire pour l'architecture globale
            await set(ref(db, `users/${currentUser.uid}/profil_retrait`), coordonneesPayload);

            alert("✅ Vos coordonnées de retrait ont été publiées et enregistrées avec succès ! Elles sont maintenant verrouillées.");
            init();
        } catch (error) {
            console.error("Erreur enregistrement coordonnées :", error);
            alert("Erreur lors de la sauvegarde des coordonnées.");
        }
    };

    // Fonction pour lancer la demande de retrait avec vérification du solde et du seuil minimum (10 500 XOF)
    window.lancerDemandeRetrait = async function(soldeDisponible, verifie) {
        if (!verifie) {
            alert("Action impossible : Votre compte livreur n'est pas encore vérifié ou validé par l'administration.");
            return;
        }

        const montantInput = document.getElementById('retrait-montant').value;
        const montantRetrait = parseFloat(montantInput);

        if (isNaN(montantRetrait) || montantRetrait < SEUIL_MINIMUM) {
            alert(`Le montant minimum pour effectuer un retrait est de ${SEUIL_MINIMUM.toLocaleString()} XOF.`);
            return;
        }

        if (montantRetrait > soldeDisponible) {
            alert("Le montant demandé dépasse votre solde disponible.");
            return;
        }

        // Vérification des coordonnées enregistrées dans profil_livre_retrait
        const snapCoords = await get(child(dbRef, `profil_livre_retrait/${currentUser.uid}/coordonnees`));
        if (!snapCoords.exists() || !snapCoords.val().numero) {
            alert("Veuillez d'abord publier et enregistrer vos coordonnées de retrait ci-dessus avant de lancer une demande.");
            return;
        }

        const coords = snapCoords.val();

        if (!confirm(`Confirmez-vous la demande de retrait de ${montantRetrait.toLocaleString()} XOF vers votre compte ${coords.moyen} (${coords.numero}) ?`)) return;

        try {
            const timestamp = Date.now();
            const nouvelleDemandeRef = push(ref(db, `profil_livre_retrait/${currentUser.uid}/demandes`));
            
            await set(nouvelleDemandeRef, {
                montant: montantRetrait,
                coordonnees: coords,
                statut: "En attente d'analyse administrateur",
                date: timestamp
            });

            alert("🎉 Demande de retrait soumise avec succès ! Elle est en cours d'analyse par l'administration.");
            document.getElementById('retrait-montant').value = '';
            init();
        } catch (error) {
            console.error("Erreur lors de la demande de retrait :", error);
            alert("Erreur technique lors de la soumission de la demande.");
        }
    };
}
