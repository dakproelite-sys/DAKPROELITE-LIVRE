// ======================================================
// DAKPRO ÉLITE GLOBAL IMPORTER PRO
// Version : Dynamic Images + CJdropshipping + Firebase
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

        this.currencyRates = {
            USD: 1,
            EUR: 0.92,
            FCFA: 655
        };

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
    // EXTRACTION DES IMAGES CJ
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

            if (typeof value === 'string' && value.trim()) {

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

                    } else if (image && typeof image === 'object') {

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
    // CONSTRUCTION INTERFACE
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

        <div style="max-width:1400px;margin:auto;">

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
                        font-size:26px;
                        font-weight:800;
                        margin:0;
                    ">

                        🌐 DAKPRO ÉLITE

                        <span style="
                            color:#38BDF8;
                            font-size:18px;
                        ">
                            Global Importer Pro
                        </span>

                    </h2>

                    <p style="
                        color:#94A3B8;
                        font-size:13px;
                    ">
                        Importation internationale CJdropshipping
                        · Images dynamiques · Firebase
                    </p>

                </div>

                <div style="
                    display:flex;
                    align-items:center;
                    gap:12px;
                    flex-wrap:wrap;
                ">

                    <label style="color:#38BDF8;">
                        Devise :
                    </label>

                    <select id="cj-currency-selector"
                        style="
                            background:#111827;
                            color:white;
                            padding:10px;
                            border-radius:8px;
                        ">

                        <option value="FCFA">FCFA (XOF)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>

                    </select>

                    <span style="
                        background:#059669;
                        padding:9px 14px;
                        border-radius:8px;
                        font-size:12px;
                        font-weight:bold;
                    ">
                        ⚡ IMPORTATEUR ACTIF
                    </span>

                </div>

            </header>

            <!-- RECHERCHE -->

            <div style="
                display:flex;
                gap:12px;
                margin-bottom:25px;
                background:#111827;
                padding:16px;
                border-radius:12px;
                flex-wrap:wrap;
            ">

                <input
                    type="text"
                    id="cj-search-input"
                    placeholder="Rechercher : watch, phone, shoes, bags..."
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
                        color:#000;
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

            <!-- COMPTEUR -->

            <div id="cj-results-count"
                style="
                    margin-bottom:16px;
                    color:#94A3B8;
                ">
            </div>

            <!-- PRODUITS -->

            <div id="cj-products-grid"
                style="
                    display:grid;
                    grid-template-columns:repeat(auto-fill,minmax(230px,1fr));
                    gap:20px;
                ">

                <div style="
                    grid-column:1/-1;
                    text-align:center;
                    padding:60px;
                    background:#111827;
                    border-radius:12px;
                    color:#94A3B8;
                ">
                    Recherchez un produit pour afficher
                    le catalogue réel CJdropshipping.
                </div>

            </div>

            <!-- FENÊTRE DÉTAILS -->

            <div id="cj-detail-modal"
                style="
                    display:none;
                    position:fixed;
                    inset:0;
                    background:rgba(0,0,0,.88);
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

                    <button id="cj-close-modal"
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
                        ">
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

        const closeModal =
            document.getElementById('cj-close-modal');

        const currencySelector =
            document.getElementById('cj-currency-selector');

        searchBtn.addEventListener('click', () => {

            this.currentKeyword = searchInput.value.trim();

            if (this.currentKeyword) {

                this.currentPage = 1;

                this.searchProducts(this.currentKeyword);

            }

        });

        searchInput.addEventListener('keypress', event => {

            if (event.key === 'Enter') {

                searchBtn.click();

            }

        });

        closeModal.addEventListener('click', () => {

            document.getElementById(
                'cj-detail-modal'
            ).style.display = 'none';

        });

        currencySelector.addEventListener('change', event => {

            this.currentCurrency = event.target.value;

            if (this.currentKeyword) {

                this.searchProducts(this.currentKeyword);

            }

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
    // FORMATER LES PRIX
    // ==================================================

    formatPrice(amount) {

        const rate =
            this.currencyRates[this.currentCurrency] || 1;

        const converted = amount * rate;

        if (this.currentCurrency === 'FCFA') {

            return Math.round(converted)
                .toLocaleString('fr-FR') + ' FCFA';

        }

        if (this.currentCurrency === 'EUR') {

            return '€' + converted.toFixed(2);

        }

        return '$' + converted.toFixed(2);
    }

    // ==================================================
    // RECHERCHE RÉELLE CJDROPSHIPPING
    // ==================================================

    async searchProducts(keyword) {

        const grid =
            document.getElementById('cj-products-grid');

        const countDiv =
            document.getElementById('cj-results-count');

        grid.innerHTML = `

            <div style="
                grid-column:1/-1;
                text-align:center;
                padding:60px;
                color:#FBBF24;
            ">

                <h3>⏳ Recherche CJdropshipping...</h3>

                <p>
                    Récupération des produits et de leurs images.
                </p>

            </div>

        `;

        countDiv.innerHTML = '';

        try {

            const response = await fetch(

                `/api/search?keyword=${
                    encodeURIComponent(keyword)
                }&pageNum=${this.currentPage}&pageSize=50`

            );

            if (!response.ok) {

                throw new Error(
                    'Erreur API : ' + response.status
                );

            }

            const result = await response.json();

            if (!result.success || !result.data) {

                throw new Error(
                    'Réponse CJdropshipping invalide.'
                );

            }

            const data = result.data;

            const list =

                Array.isArray(data)
                    ? data
                    : data.list ||
                      data.products ||
                      data.productList ||
                      [];

            if (!Array.isArray(list) || !list.length) {

                throw new Error(
                    'Aucun produit trouvé.'
                );

            }

            this.productsCache = {};

            const formattedProducts = list.map(item => {

                const images = this.extractImages(item);

                const price = parseFloat(

                    item.sellPrice ||
                    item.productPrice ||
                    item.price ||
                    0

                );

                const compare = parseFloat(

                    item.comparePrice ||
                    item.originalPrice ||
                    (price * 1.35)

                );

                const pid = String(

                    item.pid ||
                    item.productId ||
                    item.product_id ||
                    ('cj_' + Math.random().toString(36).slice(2))

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

                    sellPrice: price,

                    comparePrice: compare,

                    productSku:
                        item.productSku ||
                        item.sku ||
                        'CJ-SKU-REF',

                    description:
                        item.description ||
                        item.remark ||
                        'Description fournisseur non disponible.',

                    descriptionEn:
                        item.descriptionEn ||
                        item.description ||
                        'Supplier description unavailable.'

                };

                this.productsCache[pid] = product;

                return product;

            }).filter(product => {

                return product.productImage !== '';

            });

            if (!formattedProducts.length) {

                throw new Error(
                    'Aucune image valide reçue de CJdropshipping.'
                );

            }

            countDiv.innerHTML = `

                ✨ <b>${formattedProducts.length}</b>
                produits trouvés avec images disponibles.

            `;

            this.renderProducts(formattedProducts);

        } catch (error) {

            console.error(
                'DAKPRO CJ IMPORTER :',
                error
            );

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

                    <p style="color:#94A3B8;">
                        ${this.escapeHTML(error.message)}
                    </p>

                    <p style="color:#94A3B8;font-size:12px;">
                        Vérifiez votre connexion au serveur
                        et à l'API CJdropshipping.
                    </p>

                </div>

            `;

        }

    }

    // ==================================================
    // AFFICHAGE DYNAMIQUE DES PRODUITS
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
                    position:relative;
                    height:220px;
                    background:#1F2937;
                    overflow:hidden;
                ">

                    <img
                        src="${image}"
                        alt="${name}"
                        loading="lazy"
                        style="
                            width:100%;
                            height:100%;
                            object-fit:contain;
                            display:block;
                        "
                        onerror="
                            this.style.display='none';
                            this.nextElementSibling.style.display='flex';
                        "
                    >

                    <div style="
                        display:none;
                        width:100%;
                        height:100%;
                        align-items:center;
                        justify-content:center;
                        color:#94A3B8;
                    ">
                        Image indisponible
                    </div>

                    <span style="
                        position:absolute;
                        top:10px;
                        left:10px;
                        background:#059669;
                        padding:5px 9px;
                        border-radius:5px;
                        font-size:10px;
                        font-weight:bold;
                    ">
                        CJ IMPORT
                    </span>

                </div>

                <div style="
                    padding:16px;
                    display:flex;
                    flex-direction:column;
                    flex:1;
                ">

                    <h3 style="
                        font-size:14px;
                        height:40px;
                        overflow:hidden;
                        color:#F8FAFC;
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
                            margin-top:auto;
                            background:linear-gradient(135deg,#0284C7,#1E3A8A);
                            color:white;
                            border:none;
                            padding:12px;
                            border-radius:8px;
                            font-weight:800;
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
    // DÉTAILS ET GALERIE D'IMAGES
    // ==================================================

    loadProductDetail(pid) {

        const product = this.productsCache[pid];

        const modal =
            document.getElementById('cj-detail-modal');

        const content =
            document.getElementById('cj-modal-content');

        if (!product) {

            alert('Produit introuvable.');

            return;

        }

        this.selectedProduct = product;

        const basePrice =
            parseFloat(product.sellPrice) || 0;

        const baseCompare =
            parseFloat(product.comparePrice) ||
            basePrice * 1.35;

        const margin = 30;

        const images = product.images || [
            product.productImage
        ];

        const gallery = images.map((image, index) => `

            <img
                src="${this.escapeHTML(image)}"
                onclick="
                    window.dakproImporterInstance.changeMainImage('${this.escapeHTML(pid)}', ${index})
                "
                style="
                    width:75px;
                    height:75px;
                    object-fit:cover;
                    border:1px solid #374151;
                    border-radius:8px;
                    cursor:pointer;
                "
            >

        `).join('');

        content.innerHTML = `

            <h2 style="
                color:#FBBF24;
                padding-right:35px;
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

                    <p style="
                        font-size:11px;
                        color:#34D399;
                        word-break:break-all;
                    ">
                        Image fournisseur CJdropshipping
                    </p>

                </div>

                <div>

                    <p>
                        SKU :
                        <b>${this.escapeHTML(product.productSku)}</b>
                    </p>

                    <p style="color:#94A3B8;">
                        Prix fournisseur :
                        <b style="color:#FBBF24;">
                            ${this.formatPrice(basePrice)}
                        </b>
                    </p>

                    <div style="
                        background:#0B0F19;
                        padding:15px;
                        border-radius:10px;
                    ">

                        <label>
                            Marge bénéficiaire (%)
                        </label>

                        <input
                            type="number"
                            id="cj-margin-input"
                            value="${margin}"
                            min="0"
                            max="500"
                            style="
                                display:block;
                                width:100px;
                                padding:10px;
                                margin:10px 0;
                                background:#111827;
                                color:white;
                                border:1px solid #374151;
                                border-radius:6px;
                            "
                        >

                        <p style="color:#FBBF24;">
                            Prix de vente :
                            <b id="cj-final-sell-display">
                                ${this.formatPrice(basePrice * 1.3)}
                            </b>
                        </p>

                        <p style="color:#34D399;">
                            Prix normal :
                            <b id="cj-final-compare-display">
                                ${this.formatPrice(baseCompare * 1.3)}
                            </b>
                        </p>

                    </div>

                </div>

            </div>

            <div style="
                background:#0B0F19;
                padding:15px;
                margin-top:20px;
                border-radius:10px;
            ">

                <h4 style="color:#38BDF8;">
                    Description française
                </h4>

                <p style="color:#CBD5E1;">
                    ${this.escapeHTML(product.description)}
                </p>

                <h4 style="color:#38BDF8;">
                    English description
                </h4>

                <p style="color:#CBD5E1;">
                    ${this.escapeHTML(product.descriptionEn)}
                </p>

            </div>

            <div style="
                display:grid;
                gap:12px;
                margin-top:20px;
            ">

                <button
                    id="cj-save-draft"
                    style="
                        padding:14px;
                        background:#1F2937;
                        color:#FBBF24;
                        border:1px solid #FBBF24;
                        border-radius:8px;
                        font-weight:bold;
                    "
                >
                    📥 ENREGISTRER DANS LES BROUILLONS
                </button>

                <button
                    id="cj-publish-product"
                    style="
                        padding:14px;
                        background:linear-gradient(135deg,#10B981,#059669);
                        color:white;
                        border:none;
                        border-radius:8px;
                        font-weight:bold;
                    "
                >
                    🚀 PUBLIER SUR LA MARKETPLACE
                </button>

            </div>

        `;

        modal.style.display = 'flex';

        document.getElementById('cj-margin-input')
            .addEventListener('input', () => {

                this.updateCalculatedPrices(
                    basePrice,
                    baseCompare
                );

            });

        document.getElementById('cj-save-draft')
            .addEventListener('click', () => {

                this.triggerImport(false);

            });

        document.getElementById('cj-publish-product')
            .addEventListener('click', () => {

                this.triggerImport(true);

            });

    }

    // ==================================================
    // CHANGEMENT IMAGE PRINCIPALE
    // ==================================================

    changeMainImage(pid, index) {

        const product = this.productsCache[pid];

        if (!product || !product.images[index]) return;

        const mainImage =
            document.getElementById('cj-main-image');

        if (mainImage) {

            mainImage.src = product.images[index];

        }

    }

    // ==================================================
    // CALCUL DES PRIX
    // ==================================================

    updateCalculatedPrices(basePrice, baseCompare) {

        const input =
            document.getElementById('cj-margin-input');

        const sell =
            document.getElementById('cj-final-sell-display');

        const compare =
            document.getElementById('cj-final-compare-display');

        if (!input || !sell || !compare) return;

        const margin = Math.min(
            500,
            Math.max(0, parseFloat(input.value) || 0)
        );

        sell.innerText = this.formatPrice(
            basePrice * (1 + margin / 100)
        );

        compare.innerText = this.formatPrice(
            baseCompare * (1 + margin / 100)
        );

    }

    // ==================================================
    // IMPORTATION VERS DAKPRO ÉLITE / FIREBASE
    // ==================================================

    async triggerImport(publishNow) {

        if (!this.selectedProduct) return;

        const product = this.selectedProduct;

        const marginInput =
            document.getElementById('cj-margin-input');

        const margin = Math.min(
            500,
            Math.max(0, parseFloat(marginInput?.value) || 0)
        );

        const basePrice =
            parseFloat(product.sellPrice) || 0;

        const baseCompare =
            parseFloat(product.comparePrice) ||
            basePrice * 1.35;

        const finalSell =
            basePrice * (1 + margin / 100);

        const finalCompare =
            baseCompare * (1 + margin / 100);

        const rate =
            this.currencyRates[this.currentCurrency] || 1;

        const publicationData = {

            actif: publishNow,

            isFlash: true,

            isRecommande: true,

            categorie: "Import CJdropshipping",

            sousCategorie: "Tendance",

            createdAt: Date.now(),

            createdBy: "admin_dakpro_id",

            datePublication:
                new Date().toLocaleDateString('fr-FR'),

            heurePublication:
                new Date().toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),

            horodatageComplet:
                new Date().toLocaleString('fr-FR'),

            description: product.description,

            description_en: product.descriptionEn,

            titre: product.productName,

            titre_en: product.productNameEn,

            nom: product.productName,

            nom_en: product.productNameEn,

            sku: product.productSku,

            devise: this.currentCurrency,

            prix: Math.round(finalSell * rate),

            prixNormal: Math.round(finalSell * rate),

            prixPromo: Math.round(finalCompare * rate),

            image: product.productImage,

            images: product.images,

            video: "",

            source: "CJdropshipping",

            fournisseur: "CJdropshipping",

            fournisseurProductId: product.pid,

            lienAffiliation:
                `https://dakproelite-tbbr.vercel.app/administration.html?produit=import_cj`

        };

        const button = document.getElementById(
            publishNow ? 'cj-publish-product' : 'cj-save-draft'
        );

        const originalText = button?.innerText;

        if (button) {

            button.disabled = true;

            button.innerText = '⏳ ENREGISTREMENT...';

        }

        try {

            const response = await fetch(
                '/api/dakpro/products/import',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify(publicationData)

                }
            );

            if (!response.ok) {

                throw new Error(
                    'Échec de sauvegarde : ' + response.status
                );

            }

            const result = await response.json();

            if (result.success === false) {

                throw new Error(
                    result.message || 'Sauvegarde refusée.'
                );

            }

            alert(

                publishNow

                    ? '🚀 Produit publié avec succès sur DAKPRO ÉLITE !'

                    : '📥 Produit enregistré dans les brouillons !'

            );

            document.getElementById(
                'cj-detail-modal'
            ).style.display = 'none';

        } catch (error) {

            console.error(
                'DAKPRO IMPORT FIREBASE :',
                error
            );

            alert(
                '❌ Impossible de confirmer l’enregistrement. ' +
                error.message
            );

        } finally {

            if (button) {

                button.disabled = false;

                button.innerText = originalText;

            }

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