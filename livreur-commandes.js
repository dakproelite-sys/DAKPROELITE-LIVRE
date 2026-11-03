// ==========================================
// DAKPRO ÉLITE — Module : livreur-commandes.js
// ==========================================

import { getDatabase, ref, get, child, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export async function init() {
    console.log("Initialisation des Commandes et du Scanner Avancé - DAKPRO ÉLITE");
    
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
            <p>Recherche des commandes et initialisation du système de scan...</p>
        </div>
    `;

    // Chargement dynamique de la bibliothèque jsQR pour un scan robuste et professionnel
    if (!window.jsQR) {
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
        document.head.appendChild(script);
    }

    const db = getDatabase();
    const dbRef = ref(db);
    let commandesDisponibles = [];
    let toutesCommandesMap = new Map(); // Pour retrouver facilement une commande par son ID scanné

    const CLOUDINARY_CLOUD_NAME = "dq7m8s2e7";
    const CLOUDINARY_UPLOAD_PRESET = "dakpro_unsigned";

    try {
        const snapshot = await get(child(dbRef, `commandes`));
        if (snapshot.exists()) {
            const acheteursData = snapshot.val();
            Object.keys(acheteursData).forEach(acheteurUid => {
                const commandesAcheteur = acheteursData[acheteurUid];
                Object.keys(commandesAcheteur).forEach(cmdId => {
                    const cmd = commandesAcheteur[cmdId];
                    const livreurAssigne = cmd.livreurId || (cmd.client && cmd.client.livreurId);
                    
                    const commandeObj = {
                        id: cmdId,
                        acheteurUid: acheteurUid,
                        ...cmd
                    };

                    toutesCommandesMap.set(cmdId, commandeObj);

                    if (!livreurAssigne) {
                        commandesDisponibles.push(commandeObj);
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
                margin-bottom: 20px;
                border-bottom: 1px solid #2a2a32;
                padding-bottom: 15px;
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                align-items: center;
                gap: 15px;
            }
            .scanner-toolbar {
                display: flex;
                gap: 10px;
            }
            .btn-scanner {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 8px;
                font-weight: 700;
                font-size: 12px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                transition: 0.2s;
            }
            .btn-scanner:hover { filter: brightness(1.1); }
            
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
            .btn-accepter:hover { opacity: 0.9; }

            /* Modal Scanner Avancé & Cloudinary */
            .scan-modal {
                position: fixed;
                inset: 0;
                background: rgba(2, 6, 16, 0.92);
                backdrop-filter: blur(6px);
                z-index: 1100;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .scan-box {
                width: 100%;
                max-width: 480px;
                background: #161619;
                border: 2px solid #34d399;
                border-radius: 18px;
                padding: 25px;
                text-align: center;
                color: white;
                box-shadow: 0 10px 40px rgba(0,0,0,0.8);
            }
        </style>

        <div class="commandes-header">
            <div>
                <h2 style="color: #34d399; margin-bottom: 5px;">📦 Commandes & Scanner Intelligent</h2>
                <p style="color: #a1a1aa; font-size: 13px;">Prenez une course ou utilisez le scanner ultra-robuste pour valider et enregistrer une livraison.</p>
            </div>
            <div class="scanner-toolbar">
                <button class="btn-scanner" id="btnOpenScanCam">📷 Scanner Caméra QR</button>
                <button class="btn-scanner" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);" id="btnOpenGallery">🖼️ Scanner depuis Galerie</button>
                <input type="file" id="galleryInput" accept="image/*" style="display: none;">
            </div>
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
            
            let adresseLivraison = "Adresse standard / Port de Cotonou";
            if (cmd.client && cmd.client.adresse) {
                adresseLivraison = cmd.client.adresse;
            } else if (cmd.livraisons && cmd.livraisons.adresse) {
                adresseLivraison = cmd.livraisons.adresse;
            }

            htmlContent += `
                <div class="commande-card" data-cmdid="${commandeRefId}">
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

    // Modal Scanner Caméra Live
    htmlContent += `
        <div class="scan-modal" id="scanModal">
            <div class="scan-box">
                <h3 style="margin-bottom: 12px; color: #34d399;">📷 Scanner Intelligent DAKPRO</h3>
                <p style="font-size: 11px; color: #a1a1aa; margin-bottom: 15px;">Pointez la caméra vers le QR code ou code-barres de la commande pour valider la livraison.</p>
                <div id="scanner-container" style="width: 100%; height: 250px; background: #0b0b0d; border: 2px dashed #34d399; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 15px; position: relative; overflow: hidden;">
                    <video id="previewCamera" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
                    <canvas id="scanCanvas" style="display: none;"></canvas>
                </div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn-scanner" id="btnCloseScan" style="background: #ef4444;">Fermer la caméra</button>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = htmlContent;

    // --- LOGIQUE DU SCANNER ET UPLOAD CLOUDINARY ---
    const scanModal = document.getElementById('scanModal');
    const btnOpenScanCam = document.getElementById('btnOpenScanCam');
    const btnCloseScan = document.getElementById('btnCloseScan');
    const btnOpenGallery = document.getElementById('btnOpenGallery');
    const galleryInput = document.getElementById('galleryInput');
    const previewCamera = document.getElementById('previewCamera');
    const scanCanvas = document.getElementById('scanCanvas');

    let cameraStream = null;
    let scanInterval = null;

    // Fonction pour envoyer l'image sur Cloudinary et enregistrer "Livraison effectuée" dans Firebase
    async function validerLivraisonParScan(commandeId, imageBlob = null) {
        let imageUrl = "";

        // 1. Upload optionnel de la preuve image vers Cloudinary
        if (imageBlob) {
            const formData = new FormData();
            formData.append("file", imageBlob);
            formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

            try {
                const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
                    method: "POST",
                    body: formData
                });
                const data = await response.json();
                if (data.secure_url) {
                    imageUrl = data.secure_url;
                }
            } catch (err) {
                console.error("Erreur lors de l'upload Cloudinary de la preuve :", err);
            }
        }

        // 2. Recherche de la commande dans la base globale
        const commandeCible = toutesCommandesMap.get(commandeId);
        if (!commandeCible) {
            alert(`Le code scanné ("${commandeId}") ne correspond à aucune commande enregistrée dans le système.`);
            return;
        }

        const acheteurUid = commandeCible.acheteurUid;
        const timestamp = Date.now();

        try {
            // 3. Écriture dans Realtime Database : Statut "Livraison effectuée" avec détails et image Cloudinary
            const detailsLivraison = {
                commandeId: commandeId,
                acheteurUid: acheteurUid,
                livreurId: currentUser.uid,
                statut: "Livraison effectuée",
                dateLivraisonEffectuee: timestamp,
                preuveImageUrl: imageUrl || "Aucune image fournie"
            };

            // Enregistrement dans le profil du livreur
            await set(ref(db, `users/${currentUser.uid}/livraisons/${commandeId}`), detailsLivraison);

            // Mise à jour directe dans le nœud global des commandes
            await update(ref(db, `commandes/${acheteurUid}/${commandeId}`), {
                statut: "Livraison effectuée",
                statutLivraison: "Livrée",
                livreurId: currentUser.uid,
                livraisonEffectueeAt: timestamp,
                preuveImageUrl: imageUrl
            });

            alert(`✅ Succès ! La commande ${commandeId} a été enregistrée avec le statut "Livraison effectuée".`);
            init(); // Rafraîchir l'interface
        } catch (error) {
            console.error("Erreur Firebase lors de la validation :", error);
            alert("Erreur technique lors de l'enregistrement de la livraison.");
        }
    }

    // Ouvrir la caméra et lancer la boucle de scan en direct avec jsQR
    btnOpenScanCam.onclick = async () => {
        scanModal.style.display = 'flex';
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            previewCamera.srcObject = cameraStream;
            previewCamera.setAttribute("playsinline", true);
            previewCamera.play();

            const canvasCtx = scanCanvas.getContext("2d");

            scanInterval = setInterval(() => {
                if (previewCamera.readyState === previewCamera.HAVE_ENOUGH_DATA) {
                    scanCanvas.height = previewCamera.videoHeight;
                    scanCanvas.width = previewCamera.videoWidth;
                    canvasCtx.drawImage(previewCamera, 0, 0, scanCanvas.width, scanCanvas.height);
                    const imageData = canvasCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
                    
                    const code = window.jsQR ? window.jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" }) : null;

                    if (code) {
                        clearInterval(scanInterval);
                        btnCloseScan.click(); // Fermer la modale caméra
                        
                        // Capture d'une image de la vidéo en cours comme preuve
                        scanCanvas.toBlob(async (blob) => {
                            await validerLivraisonParScan(code.data.trim(), blob);
                        }, "image/jpeg");
                    }
                }
            }, 300);

        } catch (err) {
            console.error("Erreur caméra :", err);
            alert("Impossible d'accéder à la caméra pour le scan en direct.");
        }
    };

    // Fermer la caméra
    btnCloseScan.onclick = () => {
        scanModal.style.display = 'none';
        if (scanInterval) clearInterval(scanInterval);
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
    };

    // Ouvrir la galerie pour scanner un QR code ou bon depuis une image
    btnOpenGallery.onclick = () => {
        galleryInput.click();
    };

    galleryInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = window.jsQR ? window.jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" }) : null;

                if (code) {
                    alert(`🔍 QR Code détecté : ${code.data}`);
                    await validerLivraisonParScan(code.data.trim(), file);
                } else {
                    // Si aucun QR code n'est détecté directement, propose de saisir ou sélectionner l'ID de la commande tout en envoyant la photo sur Cloudinary
                    let saisieId = prompt("Aucun QR code automatique détecté sur cette image. Veuillez entrer l'ID exact de la commande (ex: ORD-...) :");
                    if (saisieId) {
                        await validerLivraisonParScan(saisieId.trim(), file);
                    }
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        galleryInput.value = "";
    };

    // Fonction globale pour accepter une course classique
    window.prendreCommande = async function(acheteurUid, cmdId, montant) {
        if (!confirm("Voulez-vous accepter cette course de livraison ?")) return;

        try {
            const timestamp = Date.now();
            
            await set(ref(db, `users/${currentUser.uid}/livraisons/${cmdId}`), {
                commandeId: cmdId,
                acheteurUid: acheteurUid,
                montantLivreur: montant * 0.1,
                montantTotalCommande: montant,
                statut: 'En cours de route',
                datePriseEnCharge: timestamp
            });

            await update(ref(db, `commandes/${acheteurUid}/${cmdId}`), {
                statut: 'Pris en charge',
                livreurId: currentUser.uid
            });

            alert("Course acceptée avec succès !");
            init();
        } catch (error) {
            console.error("Erreur lors de l'acceptation de la commande :", error);
            alert("Erreur technique lors de la prise en charge.");
        }
    };
}
