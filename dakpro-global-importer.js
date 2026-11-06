// ======================================================
// DAKPRO ÉLITE GLOBAL IMPORTER PRO
// Version : CJdropshipping + Firebase Realtime Database
// Images : URL fournisseur uniquement
// Vidéos : URL fournisseur uniquement
// Publication : publications/{pushId}
// Fichier : dakpro-global-importer.js
// Architecture originale conservée
// ======================================================

class DakproCJImporter {

    constructor(containerId) {

        this.container = document.getElementById(containerId);

        this.currentPage = 1;
        this.currentKeyword = '';

        this.selectedProduct = null;

        this.productsCache = {};

        this.currentCurrency = 'FCFA';

        this.exchangeRate = 655;

        this.adminId = 'admin_dakpro_id';

        this.database = null;

        this.initUI();
    }

    // ==================================================
    // INITIALISATION
    // ==================================================

    initUI() {

        if (!this.container) {
            console.error('DAKPRO : module-container introuvable.');
            return;
        }

        if (
            typeof firebase === 'undefined' ||
            !firebase.database
        ) {

            console.error(
                'DAKPRO : Firebase Realtime Database non initialisé.'
            );

            this.container.innerHTML = `
                <div style="padding:30px;color:#ef4444">
                    Firebase Realtime Database non disponible.
                    Vérifiez le chargement de firebase-config.js.
                </div>
            `;

            return;
        }

        this.database = firebase.database();

        this.renderLayout();

        this.attachEvents();

    }

    // ==================================================
    // SÉCURITÉ HTML
    // ==================================================

    escapeHTML(value) {

        return String(value ?? '').replace(
            /[&<>"']/g,
            character => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[character]
        );

    }

    // ==================================================
    // EXTRACTION DES URL IMAGES
    // ==================================================

    extractImages(item) {

        const images = [];

        const possibleImages = [

            item.productImage,
            item.image,
            item.imageUrl,
            item.productImg,
            item.bigImage,
            item.mainImage,
            item.picUrl,
            item.productImageUrl,
            item.coverImage,
            item.thumbUrl

        ];

        possibleImages.forEach(value => {

            if (
                typeof value === 'string' &&
                /^https?:\/\//i.test(value.trim())
            ) {

                images.push(value.trim());

            }

        });

        const galleries = [

            item.productImageList,
            item.imageList,
            item.images,
            item.gallery,
            item.productImages

        ];

        galleries.forEach(gallery => {

            if (Array.isArray(gallery)) {

                gallery.forEach(image => {

                    if (typeof image === 'string') {

                        images.push(image);

                    } else if (
                        image &&
                        typeof image === 'object'
                    ) {

                        const url =
                            image.imageUrl ||
                            image.url ||
                            image.bigImage ||
                            image.productImage;

                        if (url) images.push(url);

                    }

                });

            }

        });

        return [...new Set(

            images.filter(url =>
                typeof url === 'string' &&
                /^https?:\/\//i.test(url)
            )

        )];

    }

    // ==================================================
    // EXTRACTION VIDÉO FOURNISSEUR
    // ==================================================

    extractVideo(item) {

        const possibleVideos = [

            item.video,
            item.videoUrl,
            item.productVideo,
            item.productVideoUrl,
            item.videoURL,
            item.mainVideo,
            item.videoLink

        ];

        for (const video of possibleVideos) {

            if (
                typeof video === 'string' &&
                /^https?:\/\//i.test(video.trim())
            ) {

                return video.trim();

            }

        }

        return '';

    }

    // ==================================================
    // EXTRACTION DES VARIANTES
    // ==================================================

    extractVariants(item) {

        const variants =

            item.variants ||
            item.productVariants ||
            item.variantList ||
            item.skuList ||
            [];

        if (!Array.isArray(variants)) {
            return [];
        }

        return variants.map(variant => ({

            id: String(
                variant.vid ||
                variant.variantId ||
                variant.id ||
                ''
            ),

            sku: String(
                variant.variantSku ||
                variant.sku ||
                ''
            ),

            nom: String(
                variant.variantName ||
                variant.name ||
                ''
            ),

            prix: Number(
                variant.variantSellPrice ||
                variant.sellPrice ||
                variant.price ||
                0
            ),

            stock: Number(
                variant.stock ||
                variant.inventory ||
                0
            )

        }));

    }

    // ==================================================
    // INTERFACE PRINCIPALE
    // ==================================================

    renderLayout() {

        this.container.innerHTML = `

        <div style="
            font-family:Inter,Arial,sans-serif;
            padding:24px;
            background:#0B0F19;
            min-height:100vh;
            color:#F8FAFC;
        ">

        <div style="max-width:1400px;margin:auto">

            <header style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                flex-wrap:wrap;
                gap:15px;
                margin-bottom:28px;
                border-bottom:2px solid #1E293B;
                padding-bottom:16px;
            ">

                <div>

                    <h2 style="
                        color:#FBBF24;
                        font-size:25px;
                        font-weight:800;
                        margin:0;
                    ">

                        🌐 DAKPRO ÉLITE

                        <span style="
                            color:#38BDF8;
                            font-size:17px;
                        ">
                            Global Importer Pro
                        </span>

                    </h2>

                    <p style="
                        color:#94A3B8;
                        font-size:13px;
                    ">
                        CJdropshipping · Importation internationale
                        · Synchronisation Firebase
                    </p>

                </div>

                <span style="
                    background:#059669;
                    padding:10px 15px;
                    border-radius:8px;
                    font-weight:bold;
                ">
                    ⚡ IMPORTATEUR ACTIF
                </span>

            </header>

            <!-- RECHERCHE -->

            <div style="
                display:flex;
                gap:12px;
                flex-wrap:wrap;
                background:#111827;
                padding:16px;
                border-radius:12px;
                margin-bottom:25px;
            ">

                <input
                    id="cj-search-input"
                    type="text"
                    placeholder="Rechercher un produit : watch, phone, shoes..."
                    style="
                        flex:1;
                        min-width:180px;
                        padding:14px;
                        background:#0B0F19;
                        border:1px solid #374151;
                        color:white;
                        border-radius:8px;
                    "
                >

                <button
                    id="cj-search-btn"
                    style="
                        background:linear-gradient(135deg,#F59E0B,#D97706);
                        color:black;
                        border:none;
                        padding:14px 25px;
                        border-radius:8px;
                        font-weight:800;
                        cursor:pointer;
                    "
                >
                    🔍 RECHERCHER
                </button>

            </div>

            <div id="cj-results-count"
                style="margin-bottom:16px;color:#94A3B8">
            </div>

            <!-- GRILLE PRODUITS -->

            <div id="cj-products-grid"
                style="
                    display:grid;
                    grid-template-columns:repeat(auto-fill,minmax(230px,1fr));
                    gap:20px;
                ">

                <div style="
                    grid-column:1/-1;
                    text-align:center;
                    padding:50px;
                    background:#111827;
                    border-radius:12px;
                    color:#94A3B8;
                ">
                    Recherchez un produit pour afficher le catalogue CJdropshipping.
                </div>

            </div>

            <!-- MODAL -->

            <div id="cj-detail-modal"
                style="
                    display:none;
                    position:fixed;
                    inset:0;
                    background:rgba(0,0,0,.90);
                    z-index:10000;
                    align-items:center;
                    justify-content:center;
                    padding:15px;
                ">

                <div style="
                    background:#111827;
                    width:100%;
                    max-width:950px;
                    max-height:90vh;
                    overflow-y:auto;
                    border-radius:16px;
                    padding:25px;
                    position:relative;
                    border:1px solid #374151;
                ">

                    <button
                        id="cj-close-modal"
                        style="
                            position:absolute;
                            right:15px;
                            top:15px;
                            background:#374151;
                            color:white;
                            border:none;
                            width:35px;
                            height:35px;
                            border-radius:50%;
                            cursor:pointer;
                        "
                    >
                        ✕
                    </button>

                    <div id="cj-modal-content"></div>

                </div>

            </div>

        </div>

        </div>

        `;

    }

    // ==================================================
    // ÉVÉNEMENTS
    // ==================================================

    attachEvents() {

        const searchBtn =
            document.getElementById('cj-search-btn');

        const searchInput =
            document.getElementById('cj-search-input');

        searchBtn.addEventListener('click', () => {

            const keyword = searchInput.value.trim();

            if (!keyword) return;

            this.currentKeyword = keyword;

            this.currentPage = 1;

            this.searchProducts(keyword);

        });

        searchInput.addEventListener('keypress', event => {

            if (event.key === 'Enter') {

                searchBtn.click();

            }

        });

        document.getElementById('cj-close-modal')
            .addEventListener('click', () => {

                document.getElementById(
                    'cj-detail-modal'
                ).style.display = 'none';

            });

        document.getElementById('cj-products-grid')
            .addEventListener('click', event => {

                const button = event.target.closest(
                    '[data-cj-product]'
                );

                if (button) {

                    this.loadProductDetail(
                        button.dataset.cjProduct
                    );

                }

            });

    }

    // ==================================================
    // FORMATAGE PRIX FCFA
    // ==================================================

    formatPrice(amount) {

        return Math.round(
            Number(amount || 0) * this.exchangeRate
        ).toLocaleString('fr-FR') + ' FCFA';

    }

    // ==================================================
    // RECHERCHE RÉELLE CJDROPSHIPPING
    // ==================================================

    async searchProducts(keyword) {

        const grid =
            document.getElementById('cj-products-grid');

        const count =
            document.getElementById('cj-results-count');

        grid.innerHTML = `

            <div style="
                grid-column:1/-1;
                text-align:center;
                padding:60px;
                color:#FBBF24;
            ">
                ⏳ Recherche réelle dans CJdropshipping...
            </div>

        `;

        count.innerHTML = '';

        try {

            const response = await fetch(

                `/api/search?keyword=${
                    encodeURIComponent(keyword)
                }&pageNum=${this.currentPage}&pageSize=50`

            );

            if (!response.ok) {

                throw new Error(
                    'Erreur serveur : ' + response.status
                );

            }

            const result = await response.json();

            if (
                result.success === false ||
                !result.data
            ) {

                throw new Error(
                    result.message ||
                    'Réponse CJdropshipping invalide.'
                );

            }

            const data = result.data;

            const list = Array.isArray(data)
                ? data
                : data.list ||
                  data.products ||
                  data.productList ||
                  [];

            if (!list.length) {

                throw new Error(
                    'Aucun produit trouvé.'
                );

            }

            this.productsCache = {};

            const products = list.map(item => {

                const images = this.extractImages(item);

                const pid = String(

                    item.pid ||
                    item.productId ||
                    item.product_id ||
                    ''

                );

                const product = {

                    pid,

                    productName:
                        item.productName ||
                        item.entryName ||
                        keyword,

                    productNameEn:
                        item.productNameEn ||
                        item.productName ||
                        keyword,

                    productImage:
                        images[0] || '',

                    images,

                    video:
                        this.extractVideo(item),

                    sellPrice: Number(
                        item.sellPrice ||
                        item.productPrice ||
                        item.price ||
                        0
                    ),

                    comparePrice: Number(
                        item.comparePrice ||
                        item.originalPrice ||
                        0
                    ),

                    productSku:
                        item.productSku ||
                        item.sku ||
                        'CJ-SKU',

                    description:
                        item.description ||
                        item.remark ||
                        'Produit importé depuis CJdropshipping.',

                    descriptionEn:
                        item.descriptionEn ||
                        item.description ||
                        '',

                    variants:
                        this.extractVariants(item)

                };

                if (
                    product.pid &&
                    product.productImage &&
                    product.sellPrice > 0
                ) {

                    this.productsCache[pid] = product;

                    return product;

                }

                return null;

            }).filter(Boolean);

            if (!products.length) {

                throw new Error(
                    'Aucun produit exploitable reçu de CJdropshipping.'
                );

            }

            count.innerHTML = `

                ✨ <b>${products.length}</b>
                produits trouvés avec leurs images disponibles.

            `;

            this.renderProducts(products);

        } catch (error) {

            console.error('DAKPRO CJ:', error);

            grid.innerHTML = `

                <div style="
                    grid-column:1/-1;
                    text-align:center;
                    padding:50px;
                    background:#111827;
                    border-radius:12px;
                    color:#EF4444;
                ">

                    <h3>⚠️ Recherche impossible</h3>

                    <p>
                        ${this.escapeHTML(error.message)}
                    </p>

                    <p style="color:#94A3B8;font-size:12px">
                        Vérifiez votre serveur API CJdropshipping.
                    </p>

                </div>

            `;

        }

    }

    // ==================================================
    // AFFICHAGE PRODUITS
    // ==================================================

    renderProducts(products) {

        const grid =
            document.getElementById('cj-products-grid');

        grid.innerHTML = products.map(product => {

            const name =
                this.escapeHTML(product.productName);

            const pid =
                this.escapeHTML(product.pid);

            const image =
                this.escapeHTML(product.productImage);

            return `

                <div style="
                    background:#111827;
                    border:1px solid #1F2937;
                    border-radius:12px;
                    overflow:hidden;
                    display:flex;
                    flex-direction:column;
                ">

                    <div style="
                        height:220px;
                        background:#1F2937;
                    ">

                        <img
                            src="${image}"
                            alt="${name}"
                            loading="lazy"
                            style="
                                width:100%;
                                height:100%;
                                object-fit:contain;
                            "
                            onerror="this.style.display='none'"
                        >

                    </div>

                    <div style="padding:16px">

                        <h3 style="
                            font-size:14px;
                            height:40px;
                            overflow:hidden;
                        ">
                            ${name}
                        </h3>

                        <div style="
                            color:#FBBF24;
                            font-weight:800;
                            font-size:18px;
                            margin-bottom:15px;
                        ">
                            ${this.formatPrice(product.sellPrice)}
                        </div>

                        <button
                            data-cj-product="${pid}"
                            style="
                                width:100%;
                                background:linear-gradient(135deg,#0284C7,#1E3A8A);
                                color:white;
                                border:none;
                                padding:12px;
                                border-radius:8px;
                                font-weight:bold;
                                cursor:pointer;
                            "
                        >
                            👁️ VOIR ET IMPORTER
                        </button>

                    </div>

                </div>

            `;

        }).join('');

    }

    // ==================================================
    // DÉTAILS PRODUIT
    // ==================================================

    loadProductDetail(pid) {

        const product = this.productsCache[pid];

        if (!product) return;

        this.selectedProduct = product;

        const modal =
            document.getElementById('cj-detail-modal');

        const content =
            document.getElementById('cj-modal-content');

        const images = product.images || [];

        const gallery = images.map((image, index) => `

            <img
                src="${this.escapeHTML(image)}"
                data-image-index="${index}"
                style="
                    width:75px;
                    height:75px;
                    object-fit:contain;
                    background:#0B0F19;
                    border:1px solid #374151;
                    border-radius:8px;
                    cursor:pointer;
                "
            >

        `).join('');

        content.innerHTML = `

            <h2 style="
                color:#FBBF24;
                padding-right:40px;
            ">
                ${this.escapeHTML(product.productName)}
            </h2>

            <div style="
                display:grid;
                grid-template-columns:repeat(auto-fit,minmax(230px,1fr));
                gap:20px;
            ">

                <div>

                    <img
                        id="cj-main-image"
                        src="${this.escapeHTML(product.productImage)}"
                        style="
                            width:100%;
                            max-height:300px;
                            object-fit:contain;
                            background:#0B0F19;
                            border-radius:10px;
                        "
                    >

                    <div style="
                        display:flex;
                        flex-wrap:wrap;
                        gap:8px;
                        margin-top:12px;
                    ">
                        ${gallery}
                    </div>

                    ${
                        product.video
                        ? `
                            <p style="color:#34D399;font-size:12px">
                                🎬 Vidéo fournisseur disponible
                            </p>
                        `
                        : `
                            <p style="color:#94A3B8;font-size:12px">
                                Aucune vidéo fournisseur disponible.
                            </p>
                        `
                    }

                </div>

                <div>

                    <p>
                        SKU :
                        <b>${this.escapeHTML(product.productSku)}</b>
                    </p>

                    <p style="color:#FBBF24">
                        Prix fournisseur :
                        ${this.formatPrice(product.sellPrice)}
                    </p>

                    <label style="color:#38BDF8">
                        Marge bénéficiaire (%)
                    </label>

                    <input
                        type="number"
                        id="cj-margin-input"
                        value="30"
                        min="0"
                        max="500"
                        style="
                            display:block;
                            width:100px;
                            padding:10px;
                            margin:10px 0;
                            background:#0B0F19;
                            color:white;
                            border:1px solid #374151;
                            border-radius:6px;
                        "
                    >

                    <p style="color:#FBBF24">
                        Prix de vente :
                        <b id="cj-final-price">
                            ${this.formatPrice(product.sellPrice * 1.3)}
                        </b>
                    </p>

                    <p style="color:#94A3B8;font-size:12px">
                        Conversion indicative : 1 USD = 655 FCFA.
                        Les frais de livraison ne sont pas inclus.
                    </p>

                </div>

            </div>

            <div style="
                background:#0B0F19;
                padding:15px;
                margin-top:20px;
                border-radius:10px;
            ">

                <h4 style="color:#38BDF8">
                    Description française
                </h4>

                <p style="color:#CBD5E1">
                    ${this.escapeHTML(product.description)}
                </p>

                <h4 style="color:#38BDF8">
                    Description anglaise
                </h4>

                <p style="color:#CBD5E1">
                    ${this.escapeHTML(product.descriptionEn)}
                </p>

            </div>

            <div style="
                display:grid;
                gap:12px;
                margin-top:20px;
            ">

                <button id="cj-save-draft"
                    style="
                        padding:14px;
                        background:#1F2937;
                        color:#FBBF24;
                        border:1px solid #FBBF24;
                        border-radius:8px;
                        font-weight:bold;
                    ">
                    📥 ENREGISTRER DANS LES BROUILLONS
                </button>

                <button id="cj-publish-product"
                    style="
                        padding:14px;
                        background:linear-gradient(135deg,#10B981,#059669);
                        color:white;
                        border:none;
                        border-radius:8px;
                        font-weight:bold;
                    ">
                    🚀 PUBLIER SUR LA MARKETPLACE
                </button>

            </div>

        `;

        modal.style.display = 'flex';

        // Galerie

        content.querySelectorAll('[data-image-index]')
            .forEach(image => {

                image.addEventListener('click', () => {

                    document.getElementById(
                        'cj-main-image'
                    ).src = product.images[
                        Number(image.dataset.imageIndex)
                    ];

                });

            });

        // Calcul automatique

        document.getElementById('cj-margin-input')
            .addEventListener('input', () => {

                this.updateCalculatedPrice();

            });

        // Brouillons

        document.getElementById('cj-save-draft')
            .addEventListener('click', () => {

                this.triggerImport(false);

            });

        // Publication

        document.getElementById('cj-publish-product')
            .addEventListener('click', () => {

                this.triggerImport(true);

            });

    }

    // ==================================================
    // CALCUL DU PRIX
    // ==================================================

    updateCalculatedPrice() {

        const marginInput =
            document.getElementById('cj-margin-input');

        const display =
            document.getElementById('cj-final-price');

        if (!marginInput || !display) return;

        const margin = Math.min(
            500,
            Math.max(0, Number(marginInput.value) || 0)
        );

        const basePrice =
            Number(this.selectedProduct.sellPrice);

        const finalPrice =
            basePrice * (1 + margin / 100);

        display.innerText =
            this.formatPrice(finalPrice);

    }

    // ==================================================
    // PUBLICATION DIRECTE FIREBASE
    // ==================================================

    async triggerImport(publishNow) {

        if (!this.selectedProduct) return;

        if (!this.database) {

            alert('Firebase Database indisponible.');

            return;

        }

        const product = this.selectedProduct;

        const marginInput =
            document.getElementById('cj-margin-input');

        const margin = Math.min(
            500,
            Math.max(0, Number(marginInput?.value) || 0)
        );

        const fournisseurPrice =
            Number(product.sellPrice);

        const finalPriceFCFA = Math.round(
            fournisseurPrice *
            (1 + margin / 100) *
            this.exchangeRate
        );

        if (!Number.isFinite(finalPriceFCFA) || finalPriceFCFA <= 0) {

            alert('Prix du produit invalide.');

            return;

        }

        const button = document.getElementById(
            publishNow
                ? 'cj-publish-product'
                : 'cj-save-draft'
        );

        const originalText = button.innerText;

        button.disabled = true;

        button.innerText = '⏳ ENREGISTREMENT FIREBASE...';

        try {

            // Création de la référence Firebase

            const publicationRef =
                this.database.ref('publications').push();

            const publicationId =
                publicationRef.key;

            const now = new Date();

            const publicationData = {

                // IDENTIFIANT

                id: publicationId,

                // ÉTAT PUBLICATION

                actif: publishNow,

                isFlash: false,

                isRecommande: false,

                // IDENTITÉ PRODUIT

                nom: product.productName,

                nom_en: product.productNameEn,

                titre: product.productName,

                titre_en: product.productNameEn,

                // DESCRIPTIONS

                description: product.description,

                description_en: product.descriptionEn,

                // PRIX

                devise: 'FCFA',

                prix: finalPriceFCFA,

                prixNormal: finalPriceFCFA,

                // Pas de promotion inventée.

                prixPromo: 0,

                prixFournisseur: fournisseurPrice,

                margeBeneficiaire: margin,

                tauxConversion: this.exchangeRate,

                // IMAGES : URL FOURNISSEUR

                image: product.productImage,

                images: product.images,

                // VIDÉO : URL FOURNISSEUR

                video: product.video || '',

                // CATÉGORIE

                categorie: 'Import CJdropshipping',

                sousCategorie: 'Tendance',

                // FOURNISSEUR

                source: 'CJdropshipping',

                fournisseur: 'CJdropshipping',

                fournisseurProductId: product.pid,

                sku: product.productSku,

                // VARIANTES

                variantes: product.variants || [],

                // ADMINISTRATEUR

                createdBy: this.adminId,

                vendeurId: this.adminId,

                vendeurNom: 'DAKPROELITE',

                // DATE

                createdAt: Date.now(),

                datePublication:
                    now.toLocaleDateString('fr-FR'),

                heurePublication:
                    now.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),

                horodatageComplet:
                    now.toLocaleString('fr-FR'),

                // AFFILIATION

                lienAffiliation:
                    'https://dakproelite-tbbr.vercel.app/administration.html?produit=' +
                    encodeURIComponent(publicationId),

                // INFORMATIONS DROPSHIPPING

                dropshipping: true,

                stockGereParFournisseur: true

            };

            // ÉCRITURE DIRECTE DANS REALTIME DATABASE

            await publicationRef.set(publicationData);

            console.log(
                'DAKPRO : produit enregistré dans publications/',
                publicationId
            );

            alert(

                publishNow

                    ? '🚀 Produit publié avec succès dans Firebase Realtime Database !'

                    : '📥 Produit enregistré dans les brouillons Firebase !'

            );

            document.getElementById(
                'cj-detail-modal'
            ).style.display = 'none';

        } catch (error) {

            console.error(
                'DAKPRO FIREBASE PUBLICATION :',
                error
            );

            alert(
                '❌ Échec de publication : ' +
                error.message
            );

        } finally {

            button.disabled = false;

            button.innerText = originalText;

        }

    }

}

// ======================================================
// INITIALISATION DU MODULE
// ======================================================

export async function init() {

    window.dakproImporterInstance =
        new DakproCJImporter('module-container');

}