// ==========================================
// DAKPRO ÉLITE — Module : livreur-livraisons.js
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
    formData.append("folder", `dakproelite/preuves_livraison`); // Stockage dédié aux preuves de livraison

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
                        format: result.format,
                        bytes: result.bytes
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
    console.log("Initialisation des Livraisons & Preuves de Livraison - DAKPRO ÉLITE");
    
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const container = document.getElementById('dashboard-container');

    if (!currentUser) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ffcc00;">
                <h3>🔒 Authentification Requise</h3>
                <p style="color: #a1a1aa; margin-top: 10px; font-size: 14px;">Veuillez vous connecter pour voir vos livraisons.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ffcc00;">
            <p>Chargement de vos tournées et du module de preuves...</p>
        </div>
    `;

    const db = getDatabase();
    const dbRef = ref(db);
    let mesLivraisons = [];

    try {
        // Récupération des livraisons depuis le nœud utilisateur ou global
        const snapshot = await get(child(dbRef, `users/${currentUser.uid}/livraisons`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            mesLivraisons = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            })).reverse();
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des livraisons :", error);
    }

    let htmlContent = `
        <style>
            .livraison-header {
                margin-bottom: 25px;
                border-bottom: 1px solid #2a2a32;
                padding-bottom: 15px;
            }
            .scanner-section {
                background: #161619;
                border: 1px solid #34d399;
                border-radius: 14px;
                padding: 20px;
                margin-bottom: 25px;
                text-align: center;
                box-shadow: 0 4px 20px rgba(52, 211, 153, 0.15);
            }
            .btn-scanner {
                background: linear-gradient(135deg, #34d399 0%, #059669 100%);
                color: #0b0b0d;
                border: none;
                padding: 12px 25px;
                border-radius: 8px;
                font-weight: 800;
                font-size: 14px;
                cursor: pointer;
                transition: opacity 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            .btn-scanner:hover {
                opacity: 0.9;
            }
            .livraisons-grid {
                display: grid;
                grid-template-columns: repeat(1, 1fr);
                gap: 15px;
            }
            @media(min-width: 768px) {
                .livraisons-grid { grid-template-columns: repeat(2, 1fr); }
            }
            @media(min-width: 1024px) {
                .livraisons-grid { grid-template-columns: repeat(3, 1fr); }
            }
            .livraison-card {
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
            .livraison-card:hover {
                border-color: #34d399;
                transform: translateY(-3px);
            }
            .badge-statut {
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                text-align: center;
                margin-bottom: 10px;
                display: inline-block;
            }
            .badge-cours { background: rgba(255, 204, 0, 0.1); border: 1px solid #ffcc00; color: #ffcc00; }
            .badge-termine { background: rgba(52, 211, 153, 0.1); border: 1px solid #34d399; color: #34d399; }
            .progress-scanner {
                font-size: 12px;
                color: #34d399;
                margin-top: 10px;
                font-weight: bold;
            }
            .preuve-apercu {
                width: 100%;
                height: 120px;
                background: #101012;
                border: 1px dashed #34d399;
                border-radius: 8px;
                margin-top: 10px;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #a1a1aa;
                font-size: 11px;
            }
            .preuve-apercu img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .btn-action-livraison {
                background: linear-gradient(135deg, #34d399 0%, #059669 100%);
                color: #0b0b0d;
                border: none;
                padding: 10px;
                border-radius: 6px;
                font-weight: 800;
                font-size: 12px;
                cursor: pointer;
                width: 100%;
                margin-top: 10px;
                transition: opacity 0.2s;
            }
            .btn-action-livraison:hover { opacity: 0.9; }
        </style>

        <div class="livraison-header">
            <h2 style="color: #34d399; margin-bottom: 5px;">🛵 Gestion des Livraisons & Preuves Officielles</h2>
            <p style="color: #a1a1aa; font-size: 13px;">Prenez en photo le reçu ou le colis livré. L'image est transmise à Cloudinary et enregistrée comme <b>Preuve de Livraison</b> infalsifiable dans la base de données.</p>
        </div>

        <div class="scanner-section">
            <h3 style="color: #f5f5f7; font-size: 15px; margin-bottom: 8px;">📷 Scanner / Publier une Preuve Rapide</h3>
            <p style="color: #a1a1aa; font-size: 12px; margin-bottom: 15px;">Compression Canvas + Upload Cloudinary + Enregistrement Realtime Database (Nœud preuvre_livraison).</p>
            <input type="file" id="global-preuve-input" accept="image/*" style="display: none;" onchange="window.uploaderPreuveGlobale(event)">
            <button class="btn-scanner" onclick="document.getElementById('global-preuve-input').click()">
                <span>📷 Capturer / Publier une Preuve de Livraison</span>
            </button>
            <div id="scanner-resultat" class="progress-scanner"></div>
        </div>

        <h3 style="color: #f5f5f7; font-size: 15px; margin-bottom: 15px; font-weight: 600;">Historique de vos Tournées & Preuves :</h3>
    `;

    if (mesLivraisons.length === 0) {
        htmlContent += `
            <div style="text-align: center; padding: 40px; color: #a1a1aa;">
                <p>Aucune livraison enregistrée pour le moment.</p>
            </div>
        `;
    } else {
        htmlContent += `<div class="livraisons-grid">`;
        mesLivraisons.forEach(liv => {
            const statutClass = liv.statut === 'Terminée' || liv.statut === 'Livré' ? 'badge-termine' : 'badge-cours';
            const statutText = liv.statut || 'En cours';
            const montant = liv.montantLivreur ? `${liv.montantLivreur} XOF` : '0 XOF';
            const preuveUrl = liv.preuveImageUrl || '';

            htmlContent += `
                <div class="livraison-card">
                    <div>
                        <div style="font-size: 11px; color: #a1a1aa; margin-bottom: 6px;">ID: #${liv.id.substring(0, 8)}</div>
                        <div class="badge-statut ${statutClass}">${statutText}</div>
                        <div style="font-size: 13px; font-weight: 700; color: #34d399; margin-bottom: 6px;">Gain : ${montant}</div>
                        <div style="font-size: 12px; color: #f5f5f7; margin-bottom: 8px;">Commande : #${liv.commandeId ? liv.commandeId.substring(0, 8) : 'N/A'}</div>
                        
                        <div class="form-group" style="margin-top: 10px;">
                            <label style="font-size: 11px; color: #a1a1aa; font-weight: bold;">Preuve de Livraison :</label>
                            <input type="file" id="input-preuve-${liv.id}" accept="image/*" style="display:none;" onchange="window.uploaderPreuveSpecifique(event, '${liv.id}', '${liv.acheteurUid || liv.clientUid || ''}', '${liv.commandeId || ''}')">
                            <div class="preuve-apercu" onclick="document.getElementById('input-preuve-${liv.id}').click()" style="cursor:pointer;" title="Cliquez pour ajouter ou modifier la preuve">
                                ${preuveUrl ? `<img src="${preuveUrl}" alt="Preuve">` : '📷 Cliquer pour ajouter le reçu / colis'}
                            </div>
                        </div>
                    </div>

                    ${liv.statut !== 'Terminée' && liv.statut !== 'Livré' ? `
                        <button class="btn-action-livraison" onclick="window.marquerLivre('${liv.id}', '${liv.acheteurUid || liv.clientUid || ''}', '${liv.commandeId || ''}')">Valider & Clôturer</button>
                    ` : `
                        <div style="font-size: 11px; color: #34d399; text-align: center; margin-top: 10px; font-weight: bold;">✅ Course Clôturée & Preuve Validée</div>
                    `}
                </div>
            `;
        });
        htmlContent += `</div>`;
    }

    container.innerHTML = htmlContent;

    // --- LOGIQUE D'UPLOAD DES PREUVES DE LIVRAISON VERS CLOUDINARY & FIREBASE ---

    window.uploaderPreuveGlobale = async function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const resDiv = document.getElementById('scanner-resultat');
        resDiv.innerHTML = "⏳ Compression de l'image de preuve...";

        try {
            const reader = new FileReader();
            reader.onload = function(e) {
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
                            resDiv.innerHTML = "☁️ Envoi de la preuve vers Cloudinary...";
                            const cloudinaryResult = await uploadToCloudinaryWithProgress(compressedFile, (percent) => {
                                resDiv.innerHTML = `☁️ Envoi Cloudinary : ${percent}%`;
                            });

                            resDiv.innerHTML = "💾 Enregistrement de la Preuve de Livraison dans Realtime Database...";

                            const preuveId = `preuve_${Date.now()}`;
                            const preuveRef = ref(db, `preuves_livraison/${currentUser.uid}/${preuveId}`);
                            
                            const preuvePayload = {
                                preuveId: preuveId,
                                livreurId: currentUser.uid,
                                preuveImageUrl: cloudinaryResult.url,
                                publicId: cloudinaryResult.public_id,
                                createdAt: new Date().toISOString(),
                                statut: "Preuve Validée"
                            };

                            await set(preuveRef, preuvePayload);
                            resDiv.innerHTML = `✅ Preuve de livraison enregistrée avec succès dans la base de données !`;
                            init();
                        } catch (err) {
                            console.error("Erreur Cloudinary :", err);
                            resDiv.innerHTML = `❌ Erreur : ${err.message}`;
                        }
                    }, 'image/jpeg', 0.85);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Erreur :", error);
            resDiv.innerHTML = "❌ Erreur lors du traitement de l'image.";
        }
    };

    window.uploaderPreuveSpecifique = async function(event, livraisonId, clientUid, commandeId) {
        const file = event.target.files[0];
        if (!file) return;

        alert("Téléchargement et enregistrement de la preuve pour cette livraison en cours...");

        try {
            const reader = new FileReader();
            reader.onload = function(e) {
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
                            const cloudinaryResult = await uploadToCloudinaryWithProgress(compressedFile);
                            const imageUrl = cloudinaryResult.url;

                            // 1. Enregistrement dans le nœud global "preuves_livraison"
                            const preuveRef = ref(db, `preuves_livraison/${currentUser.uid}/${livraisonId}`);
                            await set(preuveRef, {
                                livraisonId: livraisonId,
                                commandeId: commandeId,
                                livreurId: currentUser.uid,
                                preuveImageUrl: imageUrl,
                                updatedAt: new Date().toISOString()
                            });

                            // 2. Mise à jour dans le profil du livreur
                            await update(ref(db, `users/${currentUser.uid}/livraisons/${livraisonId}`), {
                                preuveImageUrl: imageUrl
                            });

                            // 3. Mise à jour dans le nœud global des commandes de l'acheteur si présent[span_2](start_span)[span_2](end_span)
                            if (clientUid && commandeId) {
                                await update(ref(db, `commandes/${clientUid}/${commandeId}`), {
                                    preuveImageUrl: imageUrl
                                });
                            }

                            alert("✅ Preuve de livraison enregistrée avec succès !");
                            init();
                        } catch (err) {
                            console.error("Erreur d'upload de la preuve :", err);
                            alert("Échec de l'envoi de la preuve : " + err.message);
                        }
                    }, 'image/jpeg', 0.85);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Erreur fichier :", error);
        }
    };

    window.marquerLivre = async function(livraisonId, clientUid, commandeId) {
        if (!confirm("Confirmez-vous la livraison définitive de ce colis ?")) return;

        try {
            await update(ref(db, `users/${currentUser.uid}/livraisons/${livraisonId}`), {
                statut: 'Terminée',
                dateCloture: new Date().toISOString()
            });

            if (clientUid && commandeId) {
                await update(ref(db, `commandes/${clientUid}/${commandeId}`), {
                    statut: 'Livrée',
                    statutLivraison: 'Livrée'
                });
            }

            alert("🎉 Livraison clôturée avec succès ! Votre gain a été comptabilisé.");
            init();
        } catch (error) {
            console.error("Erreur lors de la validation de la livraison :", error);
            alert("Erreur lors de la mise à jour.");
        }
    };
}
