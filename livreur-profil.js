// ==========================================
// DAKPRO ÉLITE — Module : livreur-profil.js
// ==========================================

import { getDatabase, ref, get, child, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Configuration Cloudinary officielle pour DAKPRO ÉLITE
const CLOUDINARY_CLOUD_NAME = "iufene3y";
const CLOUDINARY_UPLOAD_PRESET = "dakproelite_preset";

// Fonction d'upload direct vers Cloudinary avec suivi de progression (XHR)
async function uploadToCloudinaryWithProgress(file, onProgress = () => {}) {
    if (!file) {
        throw new Error("Aucun fichier sélectionné.");
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
        throw new Error("Format non accepté. Sélectionnez une image ou une vidéo.");
    }

    const resourceType = isVideo ? "video" : "image";
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", `dakproelite/${resourceType}s`);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", endpoint);

        xhr.upload.addEventListener("progress", event => {
            if (event.lengthComputable) {
                onProgress(Math.round((event.loaded / event.total) * 100));
            }
        });

        xhr.onload = () => {
            try {
                const result = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300 && result.secure_url) {
                    resolve({
                        url: result.secure_url,
                        public_id: result.public_id,
                        resource_type: result.resource_type,
                        format: result.format,
                        bytes: result.bytes,
                        width: result.width || null,
                        height: result.height || null,
                        duration: result.duration || null
                    });
                } else {
                    reject(new Error(result.error?.message || "Échec de l'envoi vers Cloudinary."));
                }
            } catch (error) {
                reject(error);
            }
        };

        xhr.onerror = () => reject(new Error("Erreur de connexion à Cloudinary."));
        xhr.onabort = () => reject(new Error("Envoi annulé."));
        xhr.send(formData);
    });
}

export async function init() {
    console.log("Initialisation du Profil Livreur & Formulaire Sécurisé - DAKPRO ÉLITE");
    
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
            <p>Chargement de votre profil livreur et vérification de vos accès...</p>
        </div>
    `;

    const db = getDatabase();
    const dbRef = ref(db);
    let profilData = {};
    let docAdminData = {};

    try {
        const userSnapshot = await get(child(dbRef, `users/${currentUser.uid}`));
        if (userSnapshot.exists()) {
            profilData = userSnapshot.val();
        }

        const docsSnapshot = await get(child(dbRef, `documents_livreur`));
        if (docsSnapshot.exists()) {
            const allDocs = docsSnapshot.val();
            Object.keys(allDocs).forEach(docKey => {
                if (allDocs[docKey].livreurId === currentUser.uid) {
                    docAdminData = allDocs[docKey];
                }
            });
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
    }

    const nomComplet = profilData.nomComplet || profilData.nom || '';
    const emailUser = currentUser.email || '';
    const pays = profilData.pays || '';
    const departement = profilData.departement || '';
    const commune = profilData.commune || '';
    const quartierVille = profilData.quartierVille || '';
    const whatsapp = profilData.whatsapp || profilData.telephone || '';
    const numeroPiece = profilData.numeroPiece || '';
    
    const statutValidation = profilData.statutValidation || docAdminData.statutVerification || 'en_attente';
    const motifRefus = profilData.motifRefus || '';
    
    const avatarSrc = profilData.avatarSrc || docAdminData.avatarUrl || '';
    const photoIdentiteSrc = profilData.photoIdentiteSrc || docAdminData.documentUrl || '';
    const photoPieceSrc = profilData.photoPieceSrc || docAdminData.carteIdentiteUrl || '';

    // Détermination de l'état de verrouillage (bloqué si en attente ou validé, déverrouillé si refusé ou vide)
    const estVerrouille = (statutValidation === 'en_attente' || statutValidation === 'Validé' || statutValidation === 'valide');

    let initiales = "VIP";
    if (nomComplet) {
        const parts = nomComplet.trim().split(' ');
        initiales = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : nomComplet.substring(0, 2).toUpperCase();
    }

    let statutBadgeStyle = "background: rgba(255, 204, 0, 0.1); border: 1px solid #ffcc00; color: #ffcc00;";
    let statutTexte = "EN ATTENTE DE VALIDATION PAR L'ADMINISTRATION";
    if (statutValidation === 'Validé' || statutValidation === 'valide') {
        statutBadgeStyle = "background: rgba(52, 211, 153, 0.1); border: 1px solid #34d399; color: #34d399;";
        statutTexte = "VALIDÉ & CERTIFIÉ OFFICIEL";
    } else if (statutValidation === 'Refusé' || statutValidation === 'rejete') {
        statutBadgeStyle = "background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444;";
        statutTexte = "REFUSÉ - VEUILLEZ CORRIGER VOS INFORMATIONS ET DOCUMENTS";
    }

    // URL officielle spécifique au rôle livreur couplée au nom de domaine dakproelite.com[span_1](start_span)[span_1](end_span)
    const verificationUrl = `https://dakproelite.com/livreur-verifier.html?uid=${currentUser.uid}`;

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
            .form-input:disabled {
                opacity: 0.6;
                cursor: not-allowed;
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
            .btn-enregistrer:disabled {
                background: #2a2a32;
                color: #71717a;
                cursor: not-allowed;
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

            /* APERÇUS ADAPTÉS AUX FORMATS OFFICIELS DE DOCUMENTS */
            .doc-preview-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                margin-top: 8px;
            }
            /* Format portrait 3:4 pour la photo d'identité */
            .doc-preview-identite {
                width: 120px;
                height: 160px;
                background: #101012;
                border: 2px dashed #34d399;
                border-radius: 10px;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #71717a;
                font-size: 11px;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            }
            /* Format paysage 16:9 pour la carte d'identité ou passeport */
            .doc-preview-piece {
                width: 100%;
                max-width: 260px;
                height: 150px;
                background: #101012;
                border: 2px dashed #34d399;
                border-radius: 10px;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #71717a;
                font-size: 11px;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            }
            .doc-preview-identite img, .doc-preview-piece img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .progress-text {
                font-size: 11px;
                color: #34d399;
                margin-top: 4px;
                font-weight: bold;
                text-align: center;
            }

            /* CARTE PROFESSIONNELLE DE LIVREUR VIP AVEC QR CODE SECURISE */
            .carte-pro-container {
                background: linear-gradient(135deg, #1a1a24 0%, #0f0f13 100%);
                border: 2px solid #d4af37;
                border-radius: 16px;
                padding: 20px;
                max-width: 440px;
                margin: 25px auto;
                box-shadow: 0 8px 25px rgba(212, 175, 55, 0.25);
                color: #fff;
                font-family: Arial, sans-serif;
            }
            .carte-pro-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid #333;
                padding-bottom: 12px;
                margin-bottom: 15px;
            }
            .carte-pro-logo {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: 1px solid #d4af37;
                object-fit: cover;
            }
            .carte-pro-body {
                display: flex;
                gap: 15px;
                align-items: center;
                justify-content: space-between;
            }
            .carte-pro-avatar {
                width: 85px;
                height: 105px;
                border-radius: 8px;
                border: 2px solid #d4af37;
                object-fit: cover;
                background: #000;
            }
            .carte-pro-infos {
                font-size: 11px;
                line-height: 1.4;
                color: #e5e5e7;
                flex: 1;
            }
            .carte-pro-infos b {
                color: #d4af37;
            }
            .carte-pro-qrcode-box {
                background: #fff;
                padding: 5px;
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            .badge-valide-pro {
                margin-top: 12px;
                background: #064e3b;
                color: #34d399;
                text-align: center;
                padding: 6px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: bold;
                border: 1px solid #34d399;
            }
            .btn-download-carte {
                background: #d4af37;
                color: #000;
                border: none;
                padding: 10px;
                border-radius: 6px;
                font-weight: bold;
                font-size: 12px;
                cursor: pointer;
                width: 100%;
                margin-top: 12px;
                transition: background 0.2s;
            }
            .btn-download-carte:hover {
                background: #f0e68c;
            }
        </style>

        <div class="profil-header">
            <h2 style="color: #34d399; margin-bottom: 5px;">👤 Profil Livreur & Carte Sécurisée</h2>
            <p style="color: #a1a1aa; font-size: 13px;">Gérez vos informations et accédez à votre carte professionnelle officielle dotée d'un QR code infalsifiable.</p>
        </div>

        <div class="statut-banner">
            Statut du compte : ${statutTexte}
            ${motifRefus ? `<br><span style="font-weight:400; font-size:12px; color:#fca5a5; margin-top:5px; display:block;">Motif du refus : ${motifRefus}</span>` : ''}
            ${estVerrouille ? `<br><span style="font-weight:400; font-size:11px; color:#93c5fd; margin-top:4px; display:block;">🔒 Vos modifications sont verrouillées en attente ou suite à la validation administrative.</span>` : ''}
        </div>

        <div class="profil-card">
            <div class="avatar-box">
                <div class="avatar-cercle" id="avatar-apercu">
                    ${avatarSrc ? `<img src="${avatarSrc}" alt="Avatar">` : initiales}
                </div>
                ${!estVerrouille ? `
                    <input type="file" id="input-avatar" accept="image/*" style="display:none;" onchange="window.gererUploadCloudinary(event, 'avatar')">
                    <button type="button" style="background:#101012; border:1px solid #34d399; color:#34d399; padding:6px 15px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;" onclick="document.getElementById('input-avatar').click()">📷 Changer Photo de Profil</button>
                ` : ''}
                <div id="progress-avatar" class="progress-text"></div>
            </div>

            <div class="form-grid">
                <div class="form-group full">
                    <label class="form-label">Nom et Prénom</label>
                    <input type="text" id="prof-nom" class="form-input" value="${nomComplet}" placeholder="Votre nom et prénom exacts" ${estVerrouille ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                    <label class="form-label">Adresse E-mail (Non modifiable)</label>
                    <input type="email" class="form-input" value="${emailUser}" disabled>
                </div>
                <div class="form-group">
                    <label class="form-label">Numéro WhatsApp / Appel</label>
                    <input type="text" id="prof-whatsapp" class="form-input" value="${whatsapp}" placeholder="+22997000000" ${estVerrouille ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                    <label class="form-label">Pays</label>
                    <input type="text" id="prof-pays" class="form-input" value="${pays}" placeholder="Ex: Bénin, Togo, France" ${estVerrouille ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                    <label class="form-label">Département / Région</label>
                    <input type="text" id="prof-departement" class="form-input" value="${departement}" placeholder="Département" ${estVerrouille ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                    <label class="form-label">Commune / Ville</label>
                    <input type="text" id="prof-commune" class="form-input" value="${commune}" placeholder="Commune" ${estVerrouille ? 'disabled' : ''}>
                </div>
                <div class="form-group full">
                    <label class="form-label">Quartier ou Adresse précise</label>
                    <input type="text" id="prof-quartier" class="form-input" value="${quartierVille}" placeholder="Quartier, Rue..." ${estVerrouille ? 'disabled' : ''}>
                </div>
            </div>
        </div>

        <div class="profil-card">
            <h3 style="color: #34d399; font-size: 15px; margin-bottom: 15px;">📂 Documents Administratifs (CNI / Passeport / Photo d'Identité)</h3>
            
            <div class="form-grid">
                <div class="form-group full">
                    <label class="form-label">Numéro de la Pièce d'Identité (CNI / Passeport)</label>
                    <input type="text" id="prof-numero-piece" class="form-input" value="${numeroPiece}" placeholder="Ex: CNI-123456789" ${estVerrouille ? 'disabled' : ''}>
                </div>

                <!-- Format Portrait (3:4) pour la Photo d'Identité -->
                <div class="form-group" id="group-identite">
                    <label class="form-label">Photo d'Identité (Visage - Format Officiel Portrait)</label>
                    ${!estVerrouille ? `
                        <input type="file" id="input-identite" accept="image/*" style="display:none;" onchange="window.gererUploadCloudinary(event, 'identite')">
                        <button type="button" id="btn-publier-identite" style="background:#101012; border:1px solid #34d399; color:#34d399; padding:10px; border-radius:6px; font-size:12px; cursor:pointer;" onclick="document.getElementById('input-identite').click()">📁 Capturer / Choisir Photo Identité</button>
                    ` : '<span style="font-size:11px; color:#34d399;">🔒 Document verrouillé</span>'}
                    <div id="progress-identite" class="progress-text"></div>
                    <div class="doc-preview-container">
                        <div class="doc-preview-identite" id="preview-identite">
                            ${photoIdentiteSrc ? `<img src="${photoIdentiteSrc}">` : 'Aperçu Portrait (3:4)'}
                        </div>
                    </div>
                </div>

                <!-- Format Paysage (16:9) pour la CNI / Passeport -->
                <div class="form-group" id="group-piece">
                    <label class="form-label">Pièce d'Identité / Passeport (Format Paysage Officiel)</label>
                    ${!estVerrouille ? `
                        <input type="file" id="input-piece" accept="image/*" style="display:none;" onchange="window.gererUploadCloudinary(event, 'piece')">
                        <button type="button" id="btn-publier-piece" style="background:#101012; border:1px solid #34d399; color:#34d399; padding:10px; border-radius:6px; font-size:12px; cursor:pointer;" onclick="document.getElementById('input-piece').click()">📁 Capturer / Choisir Pièce Officielle</button>
                    ` : '<span style="font-size:11px; color:#34d399;">🔒 Document verrouillé</span>'}
                    <div id="progress-piece" class="progress-text"></div>
                    <div class="doc-preview-container">
                        <div class="doc-preview-piece" id="preview-piece">
                            ${photoPieceSrc ? `<img src="${photoPieceSrc}">` : 'Aperçu Paysage (CNI/Passeport)'}
                        </div>
                    </div>
                </div>
            </div>

            ${!estVerrouille ? `
                <button id="btn-submit-profil" class="btn-enregistrer" onclick="window.sauvegarderProfilLivreurComplet()">Enregistrer et Publier le Profil</button>
            ` : `
                <div style="margin-top: 20px; text-align: center; color: #a1a1aa; font-size: 12px; background: #101012; padding: 12px; border-radius: 8px;">
                    🔒 Formulaire verrouillé. En cas de rejet par l'administration, les champs seront de nouveau ouverts pour correction.
                </div>
            `}
        </div>

        ${(statutValidation === 'Validé' || statutValidation === 'valide') ? `
            <div class="carte-pro-container" id="carteProCard">
                <div class="carte-pro-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <img src="https://i.postimg.cc/WpSc29mX/file-00000000ca8872438c17222eb828bc0c.png" class="carte-pro-logo" alt="Logo">
                        <span style="font-size:13px; font-weight:bold; color:#d4af37; letter-spacing:1px;">DAKPRO ÉLITE VIP</span>
                    </div>
                    <span style="font-size:10px; background:#d4af37; color:#000; padding:3px 8px; border-radius:4px; font-weight:bold;">CARTE SÉCURISÉE</span>
                </div>
                <div class="carte-pro-body">
                    <img src="${avatarSrc || photoIdentiteSrc || 'https://i.postimg.cc/WpSc29mX/file-00000000ca8872438c17222eb828bc0c.png'}" class="carte-pro-avatar" alt="Avatar">
                    <div class="carte-pro-infos">
                        <div><b>Nom :</b> ${nomComplet || 'Non renseigné'}</div>
                        <div><b>Tél :</b> ${whatsapp || 'Non renseigné'}</div>
                        <div><b>Email :</b> ${emailUser}</div>
                        <div><b>Ville :</b> ${commune || ''}, ${pays || 'Bénin'}</div>
                        <div><b>ID :</b> ${currentUser.uid.substring(0, 10).toUpperCase()}</div>
                    </div>
                    <div class="carte-pro-qrcode-box">
                        <img id="qr-code-img" src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(verificationUrl)}" alt="QR Code Vérification">
                        <span style="font-size:8px; color:#000; margin-top:2px; font-weight:bold;">SCAN & VÉRIF</span>
                    </div>
                </div>
                <div class="badge-valide-pro">
                    ✅ LIVREUR OFFICIEL VALIDÉ & CERTIFIÉ
                </div>
                <button class="btn-download-carte" onclick="window.telechargerCartePro()">📥 Télécharger ma Carte Pro</button>
            </div>
        ` : ''}
    `;

    container.innerHTML = htmlContent;

    let currentAvatarUrl = avatarSrc;
    let currentIdentiteUrl = photoIdentiteSrc;
    let currentPieceUrl = photoPieceSrc;

    // Gestion de l'upload et mise à jour dynamique des aperçus aux bons formats
    window.gererUploadCloudinary = async function(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        const progressDiv = document.getElementById(`progress-${type}`);
        progressDiv.textContent = "Compression & Envoi Cloudinary...";

        try {
            const reader = new FileReader();
            reader.onload = async function(e) {
                const img = new Image();
                img.onload = async function() {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 1200;
                    if (width > height && width > maxDim) {
                        height *= maxDim / width;
                        width = maxDim;
                    } else if (height > maxDim) {
                        width *= maxDim / height;
                        height = maxDim;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(async (blob) => {
                        const compressedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });

                        try {
                            const result = await uploadToCloudinaryWithProgress(compressedFile, (percent) => {
                                progressDiv.textContent = `Progression : ${percent}%`;
                            });

                            progressDiv.textContent = "✅ Publié avec succès !";

                            if (type === 'avatar') {
                                currentAvatarUrl = result.url;
                                document.getElementById('avatar-apercu').innerHTML = `<img src="${result.url}" alt="Avatar">`;
                            } else if (type === 'identite') {
                                currentIdentiteUrl = result.url;
                                document.getElementById('preview-identite').innerHTML = `<img src="${result.url}">`;
                            } else if (type === 'piece') {
                                currentPieceUrl = result.url;
                                document.getElementById('preview-piece').innerHTML = `<img src="${result.url}">`;
                            }
                        } catch (err) {
                            console.error("Erreur Cloudinary :", err);
                            progressDiv.textContent = "❌ Échec de l'envoi.";
                            alert("Erreur lors de l'envoi vers Cloudinary : " + err.message);
                        }
                    }, 'image/jpeg', 0.85);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Erreur de lecture du fichier :", error);
            progressDiv.textContent = "❌ Erreur fichier.";
        }
    };

    window.sauvegarderProfilLivreurComplet = async function() {
        const nomCompletVal = document.getElementById('prof-nom').value.trim();
        const whatsappVal = document.getElementById('prof-whatsapp').value.trim();
        const paysVal = document.getElementById('prof-pays').value.trim();
        const departementVal = document.getElementById('prof-departement').value.trim();
        const communeVal = document.getElementById('prof-commune').value.trim();
        const quartierVal = document.getElementById('prof-quartier').value.trim();
        const numeroPieceVal = document.getElementById('prof-numero-piece').value.trim();

        if (!nomCompletVal || !whatsappVal || !paysVal || !numeroPieceVal) {
            alert("Veuillez remplir les champs obligatoires (Nom complet, WhatsApp, Pays, Numéro de pièce).");
            return;
        }

        if (!currentIdentiteUrl || !currentPieceUrl) {
            alert("Veuillez joindre à la fois votre photo d'identité (visage) et votre pièce officielle (CNI/Passeport).");
            return;
        }

        try {
            const submitBtn = document.getElementById('btn-submit-profil');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Publication et verrouillage en cours...";
            }

            const userRef = ref(db, `users/${currentUser.uid}`);
            const profileData = {
                uid: currentUser.uid,
                email: currentUser.email,
                nom: nomCompletVal,
                nomComplet: nomCompletVal,
                telephone: whatsappVal,
                whatsapp: whatsappVal,
                pays: paysVal,
                departement: departementVal,
                commune: communeVal,
                quartierVille: quartierVal,
                numeroPiece: numeroPieceVal,
                avatarSrc: currentAvatarUrl || currentIdentiteUrl,
                photoIdentiteSrc: currentIdentiteUrl,
                photoPieceSrc: currentPieceUrl,
                statutValidation: 'en_attente',
                motifRefus: "", // Efface l'ancien motif de refus en cas de nouvelle soumission
                role: 'livreur',
                updatedAt: new Date().toISOString()
            };
            await update(userRef, profileData);

            const docId = `doc_liv_${currentUser.uid.substring(0, 8)}_${Date.now()}`;
            const docRef = ref(db, `documents_livreur/${docId}`);
            const documentAdminPayload = {
                livreurId: currentUser.uid,
                nomLivreur: nomCompletVal,
                telephone: whatsappVal,
                typeDocument: "CNI / Passeport / Photo d'identité",
                numeroPiece: numeroPieceVal,
                documentUrl: currentIdentiteUrl,
                carteIdentiteUrl: currentPieceUrl,
                avatarUrl: currentAvatarUrl || currentIdentiteUrl,
                statutVerification: "en_attente",
                createdAt: new Date().toISOString()
            };
            await set(docRef, documentAdminPayload);

            alert("🎉 Vos documents ont été publiés avec succès ! Le formulaire est désormais verrouillé en attente de l'approbation administrative.");
            init();
        } catch (error) {
            console.error("Erreur lors de l'enregistrement dans Firebase :", error);
            alert("Erreur technique lors de la sauvegarde : " + error.message);
            const submitBtn = document.getElementById('btn-submit-profil');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Enregistrer et Publier le Profil";
            }
        }
    };

    window.telechargerCartePro = function() {
        window.print();
    };
}
