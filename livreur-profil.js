// ==========================================
// DAKPRO ÉLITE — Module : livreur-profil.js
// ==========================================

import { getDatabase, ref, get, child, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export async function init() {
    console.log("Initialisation du Profil Livreur & Vérification - DAKPRO ÉLITE");
    
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const container = document.getElementById('dashboard-container');

    if (!currentUser) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ffcc00;">
                <h3>🔒 Authentification Requise</h3>
                <p style="color: #a1a1aa; margin-top: 10px; font-size: 14px;">Veuillez vous connecter pour accéder à votre profil.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ffcc00;">
            <p>Chargement de votre profil livreur VIP...</p>
        </div>
    `;

    const db = getDatabase();
    const dbRef = ref(db);
    let profilData = {};

    try {
        const snapshot = await get(child(dbRef, `user/${currentUser.uid}/profil`));
        if (snapshot.exists()) {
            profilData = snapshot.val();
        }
    } catch (error) {
        console.error("Erreur chargement profil :", error);
    }

    const nomComplet = profilData.nomComplet || '';
    const pays = profilData.pays || '';
    const departement = profilData.departement || '';
    const commune = profilData.commune || '';
    const quartierVille = profilData.quartierVille || '';
    const whatsapp = profilData.whatsapp || '';
    const numeroPiece = profilData.numeroPiece || '';
    const statutValidation = profilData.statutValidation || 'En cours de traitement'; // En cours de traitement, Validé, Refusé
    const motifRefus = profilData.motifRefus || '';
    const avatarSrc = profilData.avatarSrc || '';
    const photoPieceSrc = profilData.photoPieceSrc || '';
    const photoIdentiteSrc = profilData.photoIdentiteSrc || '';

    let initiales = "VIP";
    if (nomComplet) {
        const parts = nomComplet.trim().split('es');
        initiales = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : nomComplet.substring(0, 2).toUpperCase();
    }

    let statutBadgeStyle = "background: rgba(255, 204, 0, 0.1); border: 1px solid #ffcc00; color: #ffcc00;";
    if (statutValidation === 'Validé') {
        statutBadgeStyle = "background: rgba(52, 211, 153, 0.1); border: 1px solid #34d399; color: #34d399;";
    } else if (statutValidation === 'Refusé') {
        statutBadgeStyle = "background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444;";
    }

    let htmlContent = `
        <style>
            .profil-header {
                margin-bottom: 25px;
                border-bottom: 1px solid #2a2a32;
                padding-bottom: 15px;
            }
            .profil-card {
                background: #161619;
                border: 1px solid #2a2a32;
                border-radius: 16px;
                padding: 25px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                margin-bottom: 20px;
            }
            .avatar-box {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin-bottom: 25px;
            }
            .avatar-cercle {
                width: 90px;
                height: 90px;
                border-radius: 50%;
                background: linear-gradient(135deg, #34d399 0%, #059669 100%);
                color: #0b0b0d;
                font-size: 30px;
                font-weight: 800;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid #34d399;
                overflow: hidden;
                margin-bottom: 10px;
                box-shadow: 0 4px 15px rgba(52, 211, 153, 0.3);
            }
            .avatar-cercle img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .form-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 15px;
            }
            @media(min-width: 768px) {
                .form-grid { grid-template-columns: repeat(2, 1fr); }
            }
            @media(min-width: 1024px) {
                .form-grid { grid-template-columns: repeat(3, 1fr); }
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
            .form-input {
                background: #101012;
                border: 1px solid #2a2a32;
                border-radius: 8px;
                padding: 12px;
                color: #f5f5f7;
                font-size: 14px;
                outline: none;
                transition: border-color 0.2s;
            }
            .form-input:focus {
                border-color: #34d399;
            }
            .btn-enregistrer {
                background: linear-gradient(135deg, #34d399 0%, #059669 100%);
                color: #0b0b0d;
                border: none;
                padding: 14px;
                border-radius: 8px;
                font-weight: 800;
                font-size: 14px;
                cursor: pointer;
                width: 100%;
                margin-top: 20px;
                transition: opacity 0.2s;
            }
            .btn-enregistrer:hover {
                opacity: 0.9;
            }
            .statut-banner {
                padding: 15px;
                border-radius: 10px;
                font-size: 13px;
                font-weight: 700;
                text-align: center;
                margin-bottom: 25px;
                ${statutBadgeStyle}
            }
            .doc-preview {
                width: 100%;
                height: 100px;
                background: #101012;
                border: 1px dashed #2a2a32;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-top: 8px;
                overflow: hidden;
                color: #71717a;
                font-size: 11px;
            }
            .doc-preview img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
        </style>

        <div class="profil-header">
            <h2 style="color: #34d399; margin-bottom: 5px;">👤 Profil Livreur & Vérification Administrative</h2>
            <p style="color: #a1a1aa; font-size: 13px;">Gérez vos informations, votre photo avec compression intelligente et vos documents officiels.</p>
        </div>

        <div class="statut-banner">
            Statut du compte : ${statutValidation.toUpperCase()}
            ${statutValidation === 'Refusé' && motifRefus ? `<br><span style="font-weight:400; font-size:12px; color:#fca5a5; margin-top:5px; display:block;">Motif : ${motifRefus}</span>` : ''}
        </div>

        <div class="profil-card">
            <div class="avatar-box">
                <div class="avatar-cercle" id="avatar-apercu">
                    ${avatarSrc ? `<img src="${avatarSrc}" alt="Avatar">` : initiales}
                </div>
                <input type="file" id="input-avatar" accept="image/*" capture="environment" style="display:none;" onchange="window.compresserEtChargerImage(event, 'avatar')">
                <button type="button" style="background:#101012; border:1px solid #34d399; color:#34d399; padding:6px 15px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;" onclick="document.getElementById('input-avatar').click()">📷 Changer la Photo de Profil (Caméra/Galerie)</button>
            </div>

            <div class="form-grid">
                <div class="form-group full">
                    <label class="form-label">Nom Complet</label>
                    <input type="text" id="prof-nom" class="form-input" value="${nomComplet}" placeholder="Votre nom et prénom">
                </div>
                <div class="form-group">
                    <label class="form-label">Numéro WhatsApp Complet</label>
                    <input type="text" id="prof-whatsapp" class="form-input" value="${whatsapp}" placeholder="+22997000000">
                </div>
                <div class="form-group">
                    <label class="form-label">Pays</label>
                    <input type="text" id="prof-pays" class="form-input" value="${pays}" placeholder="Ex: Bénin">
                </div>
                <div class="form-group">
                    <label class="form-label">Département / Région</label>
                    <input type="text" id="prof-departement" class="form-input" value="${departement}" placeholder="Département">
                </div>
                <div class="form-group">
                    <label class="form-label">Commune</label>
                    <input type="text" id="prof-commune" class="form-input" value="${commune}" placeholder="Commune">
                </div>
                <div class="form-group full">
                    <label class="form-label">Quartier ou Ville</label>
                    <input type="text" id="prof-quartier" class="form-input" value="${quartierVille}" placeholder="Quartier, Ville précise">
                </div>
            </div>
        </div>

        <div class="profil-card">
            <h3 style="color: #34d399; font-size: 15px; margin-bottom: 15px;">📂 Documents Administratifs et Pièce d'Identité</h3>
            
            <div class="form-grid">
                <div class="form-group full">
                    <label class="form-label">Numéro de la Carte CNI ou Passeport</label>
                    <input type="text" id="prof-numero-piece" class="form-input" value="${numeroPiece}" placeholder="Ex: CNI-123456789 ou Passeport">
                </div>

                <div class="form-group">
                    <label class="form-label">Photo d'Identité (Visage)</label>
                    <input type="file" id="input-identite" accept="image/*" capture="environment" style="display:none;" onchange="window.compresserEtChargerImage(event, 'identite')">
                    <button type="button" style="background:#101012; border:1px solid #2a2a32; color:#f5f5f7; padding:8px; border-radius:6px; font-size:12px; cursor:pointer;" onclick="document.getElementById('input-identite').click()">📸 Prendre / Choisir Photo Identité</button>
                    <div class="doc-preview" id="preview-identite">
                        ${photoIdentiteSrc ? `<img src="${photoIdentiteSrc}">` : 'Aucune photo'}
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Photo CNI ou Passeport (Pièce)</label>
                    <input type="file" id="input-piece" accept="image/*" capture="environment" style="display:none;" onchange="window.compresserEtChargerImage(event, 'piece')">
                    <button type="button" style="background:#101012; border:1px solid #2a2a32; color:#f5f5f7; padding:8px; border-radius:6px; font-size:12px; cursor:pointer;" onclick="document.getElementById('input-piece').click()">📸 Prendre / Choisir Pièce</button>
                    <div class="doc-preview" id="preview-piece">
                        ${photoPieceSrc ? `<img src="${photoPieceSrc}">` : 'Aucune photo'}
                    </div>
                </div>
            </div>

            <button class="btn-enregistrer" onclick="window.sauvegarderProfilLivreur()">Enregistrer et Soumettre pour Validation</button>
        </div>
    `;

    container.innerHTML = htmlContent;

    // Variables temporaires pour stocker les images en base64 compressées à 60%
    let currentAvatarBase64 = avatarSrc;
    let currentIdentiteBase64 = photoIdentiteSrc;
    let currentPieceBase64 = photoPieceSrc;

    // Fonction de compression d'image à 60% (0.6) via Canvas
    window.compresserEtChargerImage = function(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Redimensionnement intelligent pour alléger
                let width = img.width;
                let height = img.height;
                const maxDim = 800;
                if (width > height && width > maxDim) {
                    height *= maxDim / width;
                    width = maxDim;
                } else if (height > maxDim) {
                    width *= maxDim / height;
                    height = maxDim;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Compression à 60% (0.6)
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);

                if (type === 'avatar') {
                    currentAvatarBase64 = compressedDataUrl;
                    document.getElementById('avatar-apercu').innerHTML = `<img src="${compressedDataUrl}" alt="Avatar">`;
                } else if (type === 'identite') {
                    currentIdentiteBase64 = compressedDataUrl;
                    document.getElementById('preview-identite').innerHTML = `<img src="${compressedDataUrl}">`;
                } else if (type === 'piece') {
                    currentPieceBase64 = compressedDataUrl;
                    document.getElementById('preview-piece').innerHTML = `<img src="${compressedDataUrl}">`;
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    // Fonction de sauvegarde globale du profil livreur
    window.sauvegarderProfilLivreur = async function() {
        const nomCompletVal = document.getElementById('prof-nom').value.trim();
        const whatsappVal = document.getElementById('prof-whatsapp').value.trim();
        const paysVal = document.getElementById('prof-pays').value.trim();
        const departementVal = document.getElementById('prof-departement').value.trim();
        const communeVal = document.getElementById('prof-commune').value.trim();
        const quartierVal = document.getElementById('prof-quartier').value.trim();
        const numeroPieceVal = document.getElementById('prof-numero-piece').value.trim();

        if (!nomCompletVal || !whatsappVal || !numeroPieceVal) {
            alert("Veuillez remplir votre nom complet, votre numéro WhatsApp et le numéro de votre pièce d'identité.");
            return;
        }

        try {
            const profilRef = ref(db, `user/${currentUser.uid}/profil`);
            
            // Conserver le statut actuel s'il existe déjà, sinon mettre "En cours de traitement"
            const nouveauStatut = statutValidation === 'Validé' ? 'Validé' : 'En cours de traitement';

            await set(profilRef, {
                nomComplet: nomCompletVal,
                whatsapp: whatsappVal,
                pays: paysVal,
                departement: departementVal,
                commune: communeVal,
                quartierVille: quartierVal,
                numeroPiece: numeroPieceVal,
                avatarSrc: currentAvatarBase64,
                photoIdentiteSrc: currentIdentiteBase64,
                photoPieceSrc: currentPieceBase64,
                statutValidation: nouveauStatut,
                verifie: nouveauStatut === 'Validé',
                email: currentUser.email
            });

            alert("Profil et documents mis à jour avec succès ! Soumis à l'administration.");
            init();
        } catch (error) {
            console.error("Erreur lors de la sauvegarde du profil :", error);
            alert("Erreur lors de l'enregistrement de votre profil.");
        }
    };
}