// ==========================================
// DAKPRO ÉLITE — Module : livreur-retraits.js
// ==========================================

import { getDatabase, ref, get, child, set, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export async function init() {
    console.log("Initialisation des Retraits Livreur - DAKPRO ÉLITE");
    
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
    let coordonneesEnregistrees = {};

    try {
        const userSnap = await get(child(dbRef, `user/${currentUser.uid}`));
        if (userSnap.exists()) {
            const userData = userSnap.val();
            livreurProfil = userData.profil || {};
            coordonneesEnregistrees = userData.retraits?.coordonnees || {};

            // Calcul des revenus validés
            if (userData.livraisons) {
                Object.values(userData.livraisons).forEach(liv => {
                    if (liv.statut === 'Terminée' || liv.statut === 'Livré') {
                        totalRevenus += parseFloat(liv.montantLivreur || liv.montant || 0);
                    }
                });
            }
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
    }

    const estVerifie = livreurProfil.verifie === true; // Vérification du statut admin/documents
    const moyenActuel = coordonneesEnregistrees.moyen || 'MTN Mobile Money';
    const numeroActuel = coordonneesEnregistrees.numero || '';
    const titulaireActuel = coordonneesEnregistrees.titulaire || '';

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
        </style>

        <div class="retrait-header">
            <h2 style="color: #ffcc00; margin-bottom: 5px;">🏦 Gestion des Retraits Élite</h2>
            <p style="color: #a1a1aa; font-size: 13px;">Enregistrez vos coordonnées de paiement et lancez vos demandes à partir de 10 900 XOF.</p>
        </div>

        <div class="solde-box">
            <div style="color: #a1a1aa; font-size: 13px; margin-bottom: 5px; font-weight: 600;">Solde Disponible pour Retrait :</div>
            <div style="color: #34d399; font-size: 32px; font-weight: 800; margin-bottom: 5px;">${totalRevenus} XOF</div>
            <div style="color: #ffcc00; font-size: 12px;">Seuil minimum requis : 10 900 XOF</div>
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
            <h3 style="color: #ffcc00; font-size: 15px; margin-bottom: 15px;">📍 Coordonnées de Retrait (Mobile Money / Banque)</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Moyen de Paiement</label>
                    <select id="retrait-moyen" class="form-select">
                        <option value="MTN Mobile Money" ${moyenActuel === 'MTN Mobile Money' ? 'selected' : ''}>MTN Mobile Money</option>
                        <option value="Moov Money" ${moyenActuel === 'Moov Money' ? 'selected' : ''}>Moov Money</option>
                        <option value="Orange Money" ${moyenActuel === 'Orange Money' ? 'selected' : ''}>Orange Money</option>
                        <option value="Wave" ${moyenActuel === 'Wave' ? 'selected' : ''}>Wave</option>
                        <option value="Virement Bancaire" ${moyenActuel === 'Virement Bancaire' ? 'selected' : ''}>Virement Bancaire</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Numéro de Compte / Téléphone Complet</label>
                    <input type="text" id="retrait-numero" class="form-input" value="${numeroActuel}" placeholder="Ex: +22997000000">
                </div>
                <div class="form-group full">
                    <label class="form-label">Nom et Prénom du Titulaire</label>
                    <input type="text" id="retrait-titulaire" class="form-input" value="${titulaireActuel}" placeholder="Nom exact du compte">
                </div>
            </div>
            <button class="btn-action" onclick="window.sauvegarderCoordonneesRetrait()">Enregistrer mes coordonnées</button>
        </div>

        <div class="form-section">
            <h3 style="color: #34d399; font-size: 15px; margin-bottom: 15px;">💸 Lancer une Demande de Retrait</h3>
            <div class="form-group full" style="margin-bottom: 15px;">
                <label class="form-label">Montant à retirer (XOF)</label>
                <input type="number" id="retrait-montant" class="form-input" placeholder="Minimum 10900 XOF" min="10900">
            </div>
            <button class="btn-action" style="background: linear-gradient(135deg, #34d399 0%, #059669 100%); color: #0b0b0d;" onclick="window.lancerDemandeRetrait(${totalRevenus}, ${estVerifie})">Soumettre la Demande à l'Admin</button>
        </div>
    `;

    container.innerHTML = htmlContent;

    // Fonction pour enregistrer les coordonnées dans la Realtime Database
    window.sauvegarderCoordonneesRetrait = async function() {
        const moyen = document.getElementById('retrait-moyen').value;
        const numero = document.getElementById('retrait-numero').value.trim();
        const titulaire = document.getElementById('retrait-titulaire').value.trim();

        if (!numero || !titulaire) {
            alert("Veuillez remplir tous les champs de vos coordonnées de retrait.");
            return;
        }

        try {
            await set(ref(db, `user/${currentUser.uid}/retraits/coordonnees`), {
                moyen,
                numero,
                titulaire
            });
            alert("Coordonnées de retrait enregistrées avec succès !");
            init();
        } catch (error) {
            console.error("Erreur enregistrement coordonnées :", error);
            alert("Erreur lors de la sauvegarde.");
        }
    };

    // Fonction pour lancer la demande de retrait
    window.lancerDemandeRetrait = async function(soldeDisponible, verifie) {
        if (!verifie) {
            alert("Action impossible : Votre compte n'est pas encore vérifié par l'administration.");
            return;
        }

        const montantInput = document.getElementById('retrait-montant').value;
        const montantRetrait = parseFloat(montantInput);

        if (isNaN(montantRetrait) || montantRetrait < 10900) {
            alert("Le montant minimum pour effectuer un retrait est de 10 900 XOF.");
            return;
        }

        if (montantRetrait > soldeDisponible) {
            alert("Le montant demandé dépasse votre solde disponible.");
            return;
        }

        if (!coordonneesEnregistrees.numero) {
            alert("Veuillez d'abord enregistrer vos coordonnées de retrait ci-dessus.");
            return;
        }

        if (!confirm(`Confirmez-vous la demande de retrait de ${montantRetrait} XOF ? Elle sera analysée et validée par un administrateur.`)) return;

        try {
            const timestamp = Date.now();
            const nouvelleDemandeRef = push(ref(db, `user/${currentUser.uid}/retraits/demandes`));
            
            await set(nouvelleDemandeRef, {
                montant: montantRetrait,
                coordonnees: coordonneesEnregistrees,
                statut: 'En attente d\'analyse administrateur',
                date: timestamp
            });

            alert("Demande de retrait soumise avec succès ! Elle est en cours d'analyse par l'administration.");
            document.getElementById('retrait-montant').value = '';
            init();
        } catch (error) {
            console.error("Erreur lors de la demande de retrait :", error);
            alert("Erreur technique lors de la soumission.");
        }
    };
}