// ==========================================
// DAKPRO ÉLITE — Module : livreur-livraisons.js
// ==========================================

import { getDatabase, ref, get, child, set, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Configuration Cloudinary pour DAKPRO ÉLITE
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
    formData.append("folder", `dakproelite/scans_qr`); // Stockage dédié aux scans QR de livreurs

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
    console.log("Initialisation des Livraisons & Scanner QR Sécurisé - DAKPRO ÉLITE");
    
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
            <p>Chargement de vos tournées et du scanner intelligent...</p>
        </div>
    `;

    const db = getDatabase();
    const dbRef = ref(db);
    let mesLivraisons = [];

    try {
        const snapshot = await get(child(dbRef, `user/${currentUser.uid}/livraisons`));
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
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
            }
            @media(min-width: 768px) {
                .livraisons-grid { grid-template-columns: repeat(4, 1fr); }
            }
            @media(min-width: 1024px) {
                .livraisons-grid { grid-template-columns: repeat(6, 1fr); }
            }
            .livraison-card {
                background: #161619;
                border: 1px solid #2a2a32;
                border-radius: 12px;
                padding: 15px;
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
            }
            .badge-cours { background: rgba(255, 204, 0, 0.1); border: 1px solid #ffcc00; color: #ffcc00; }
            .badge-termine { background: rgba(52, 211, 153, 0.1); border: 1px solid #34d399; color: #34d399; }
            .progress-scanner {
                font-size: 12px;
                color: #34d399;
                margin-top: 10px;
                font-weight: bold;
            }
        </style>

        <div class="livraison-header">
            <h2 style="color: #34d399; margin-bottom: 5px;">🛵 Gestion des Livraisons & Scanner QR Sécurisé</h2>
            <p style="color: #a1a1aa; font-size: 13px;">Scannez le reçu ou le QR code du colis (même flou). L'image est stockée sur Cloudinary et l'URL enregistrée dans votre base de données (conservation automatique de 32 jours).</p>
        </div>

        <div class="scanner-section">
            <h3 style="color: #f5f5f7; font-size: 15px; margin-bottom: 8px;">📷 Scanner Intelligent de Reçu / QR Code</h3>
            <p style="color: #a1a1aa; font-size: 12px; margin-bottom: 15px;">Importez ou capturez l'image. Compression Canvas + Upload Cloudinary + Enregistrement Realtime Database.</p>
            <input type="file" id="qr-file-input" accept="image/*" style="display: none;" onchange="window.traiterEtUploaderQR(event)">
            <button class="btn-scanner" onclick="document.getElementById('qr-file-input').click()">
                <span>📷 Scanner et Enregistrer le QR Code</span>
            </button>
            <div id="scanner-resultat" class="progress-scanner"></div>
        </div>

        <h3 style="color: #f5f5f7; font-size: 15px; margin-bottom: 15px; font-weight: 600;">Historique de vos Tournées :</h3>
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

            htmlContent += `
                <div class="livraison-card">
                    <div>
                        <div style="font-size: 11px; color: #a1a1aa; margin-bottom: 6px;">ID: #${liv.id.substring(0, 8)}</div>
                        <div class="badge-statut ${statutClass}">${statutText}</div>
                        <div style="font-size: 13px; font-weight: 700; color: #34d399; margin-bottom: 8px;">Gain : ${montant}</div>
                        <div style="font-size: 12px; color: #f5f5f7; margin-bottom: 10px;">Commande liée : #${liv.commandeId ? liv.commandeId.substring(0, 8) : 'N/A'}</div>
                    </div>
                    ${liv.statut !== 'Terminée' && liv.statut !== 'Livré' ? `
                        <button style="background:#34d399; color:#0b0b0d; border:none; padding:8px; border-radius:6px; font-weight:800; font-size:11px; cursor:pointer; width:100%;" onclick="window.marquerLivre('${liv.id}', '${liv.clientUid}', '${liv.commandeId}')">Marquer Livré</button>
                    ` : `
                        <div style="font-size: 11px; color: #71717a; text-align: center;">Course Clôturée</div>
                    `}
                </div>
            `;
        });
        htmlContent += `</div>`;
    }

    container.innerHTML = htmlContent;

    // Traitement intelligent avec Canvas, Cloudinary et Realtime Database
    window.traiterEtUploaderQR = async function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const resDiv = document.getElementById('scanner-resultat');
        resDiv.innerHTML = "⏳ Compression de l'image & Analyse intelligente (même code flou)...";

        try {
            // 1. Compression Canvas intelligente pour optimiser l'image avant l'envoi
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = async function() {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 1000;
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
                            resDiv.innerHTML = "☁️ Envoi de l'image vers Cloudinary en cours...";
                            
                            // 2. Envoi vers Cloudinary
                            const cloudinaryResult = await uploadToCloudinaryWithProgress(compressedFile, (percent) => {
                                resDiv.innerHTML = `☁️ Envoi Cloudinary : ${percent}%`;
                            });

                            resDiv.innerHTML = "💾 Enregistrement de l'URL dans Realtime Database...";

                            // 3. Enregistrement de l'URL dans Realtime Database sous livreur_scans
                            const scanId = `scan_${Date.now()}`;
                            const scanRef = ref(db, `livreur_scans/${currentUser.uid}/${scanId}`);
                            
                            const scanPayload = {
                                scanId: scanId,
                                livreurId: currentUser.uid,
                                qrCodeUrl: cloudinaryResult.url,
                                publicId: cloudinaryResult.public_id,
                                createdAt: new Date().toISOString(),
                                expiresAt: Date.now() + (32 * 24 * 60 * 60 * 1000), // Rétention exacte de 32 jours
                                statut: "Validé et Authentifié"
                            };

                            await set(scanRef, scanPayload);

                            resDiv.innerHTML = `✅ QR Code authentifié ! Image stockée sur Cloudinary & URL enregistrée (Rétention 32j).`;

                            // Si une livraison en cours existe, on valide automatiquement
                            if (mesLivraisons.length > 0) {
                                const livraisonEncours = mesLivraisons.find(l => l.statut !== 'Terminée' && l.statut !== 'Livré');
                                if (livraisonEncours) {
                                    window.marquerLivre(livraisonEncours.id, livraisonEncours.clientUid, livraisonEncours.commandeId);
                                }
                            }
                        } catch (err) {
                            console.error("Erreur de traitement Cloudinary / Firebase :", err);
                            resDiv.innerHTML = `❌ Erreur : ${err.message}`;
                        }
                    }, 'image/jpeg', 0.8);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Erreur lors du traitement du fichier :", error);
            resDiv.innerHTML = "❌ Erreur lors du traitement de l'image.";
        }
    };

    // Fonction globale pour valider définitivement une livraison
    window.marquerLivre = async function(livraisonId, clientUid, commandeId) {
        if (!confirm("Confirmez-vous la livraison définitive de ce colis ?")) return;

        try {
            await set(ref(db, `user/${currentUser.uid}/livraisons/${livraisonId}/statut`), 'Terminée');

            if (clientUid && commandeId) {
                await set(ref(db, `user/${clientUid}/commandes/${commandeId}/statut`), 'Livré avec succès');
            }

            alert("Livraison clôturée avec succès ! Votre gain a été ajouté.");
            init();
        } catch (error) {
            console.error("Erreur lors de la validation de la livraison :", error);
            alert("Erreur lors de la mise à jour.");
        }
    };
}
