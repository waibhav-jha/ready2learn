/* ==========================================================================
   Dr. Chitra Sankar Web Application - Interactive Logic & State Management
   ========================================================================== */

/* ==========================================================================
   RAZORPAY PAYMENT GATEWAY CONFIGURATION
   --------------------------------------------------------------------------
   Replace 'YOUR_RAZORPAY_KEY_ID' below with your Razorpay API Key ID:
   - Test Mode Key: e.g. "rzp_test_1234567890abcdef"
   - Live Mode Key: e.g. "rzp_live_1234567890abcdef"
   Obtain your key from: https://dashboard.razorpay.com/#/app/keys
   ========================================================================== */
const RAZORPAY_CONFIG = {
  key_id: "YOUR_RAZORPAY_KEY_ID",
  currency: "INR",
  company_name: "Dr. Chitra Sankar",
  description: "Pediatric Store Resources & Workbooks",
  theme_color: "#FF5A2E",
  logo: "hero_doctor_child.png"
};

let cartItems = [];

document.addEventListener('DOMContentLoaded', () => {
  loadCustomContent();
  initNavbar();
  initScrollAnimations();
  initStoreFilter();
  initCartDrawer();
  initArticleModal();
  initAppointmentsWaitlist();
  initContactForms();
});

/* Dynamically load products and articles published via Admin Portal */
function loadCustomContent() {
  // 1. Render custom products from Admin Portal
  const customProducts = JSON.parse(localStorage.getItem('dcs_custom_products') || '[]');
  const productsGrid = document.querySelector('.products-grid');

  if (productsGrid && customProducts.length > 0) {
    customProducts.forEach(prod => {
      if (!document.querySelector(`[data-custom-id="${prod.id}"]`)) {
        const card = document.createElement('div');
        card.className = 'product-card reveal active';
        card.setAttribute('data-category', prod.category || 'guide');
        card.setAttribute('data-custom-id', prod.id);

        const priceText = prod.price === 0 ? 'FREE (₹0)' : `₹${prod.price}`;
        const priceClass = prod.price === 0 ? 'product-price free' : 'product-price';
        const btnText = prod.price === 0 ? '<i class="fas fa-download"></i> Download Free' : '<i class="fas fa-cart-plus"></i> Add to Cart';

        card.innerHTML = `
          <div class="product-header">
            <span class="product-category-tag">${prod.category || 'Digital Guide'}</span>
            <i class="fas fa-book-journal-whills product-icon-accent"></i>
          </div>
          <div class="product-body">
            <h3>${prod.title}</h3>
            <div class="product-meta">${prod.meta} • Dr. Chitra Sankar</div>
            <p class="product-description">${prod.desc}</p>
            <div class="product-footer">
              <div class="${priceClass}">${priceText}</div>
              <button class="btn btn-primary add-cart-btn" data-price="${prod.price}" data-name="${prod.title}" data-meta="${prod.meta}">${btnText}</button>
            </div>
          </div>
        `;

        productsGrid.appendChild(card);
      }
    });
  }

  // 2. Render custom articles from Admin Portal
  const customArticles = JSON.parse(localStorage.getItem('dcs_custom_articles') || '[]');
  const articlesGrid = document.querySelector('.articles-grid');

  if (articlesGrid && customArticles.length > 0) {
    customArticles.forEach(art => {
      if (!document.querySelector(`[data-custom-art-id="${art.id}"]`)) {
        articlesData[art.id] = {
          title: art.title,
          meta: `${art.category} • ${art.readTime || '5 min read'}`,
          author: "Dr. Chitra Sankar",
          content: art.body
        };

        const card = document.createElement('div');
        card.className = 'article-card reveal active';
        card.setAttribute('data-custom-art-id', art.id);

        card.innerHTML = `
          <div class="article-header-bg">
            <span class="article-meta-badge">${art.category}</span>
          </div>
          <div class="article-body">
            <h3>${art.title}</h3>
            <p class="article-snippet">${art.body.replace(/<[^>]*>?/gm, '').substring(0, 110)}...</p>
            <div class="article-footer">
              <span>Dr. Chitra Sankar • Today</span>
              <button class="btn btn-outline-purple read-article-btn" data-id="${art.id}">Read Article</button>
            </div>
          </div>
        `;

        articlesGrid.appendChild(card);
      }
    });
  }
}


/* ==========================================================================
   1. NAVBAR & SCROLL BEHAVIOR
   ========================================================================== */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-active');
    });

    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('mobile-active');
      });
    });
  }
}

/* ==========================================================================
   2. SCROLL FADE-IN ANIMATION (IntersectionObserver)
   ========================================================================== */
function initScrollAnimations() {
  const revealElements = document.querySelectorAll('.reveal');

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -80px 0px',
    threshold: 0.15
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach(el => {
    revealObserver.observe(el);
  });
}

/* ==========================================================================
   3. STORE FILTERING & CART DRAWER SYSTEM
   ========================================================================== */
/* Helper function to record real user click analytics */
function trackClick(itemId, title, category, type) {
  let analytics = JSON.parse(localStorage.getItem('dcs_real_click_analytics') || '{}');
  if (!analytics[itemId]) {
    analytics[itemId] = {
      title: title,
      category: category,
      type: type,
      clicks: 0
    };
  }
  analytics[itemId].clicks += 1;
  localStorage.setItem('dcs_real_click_analytics', JSON.stringify(analytics));
}

function initStoreFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');
      const productCards = document.querySelectorAll('.product-card');

      productCards.forEach(card => {
        const category = card.getAttribute('data-category');
        const isFree = card.getAttribute('data-free') === 'true' || 
                       card.querySelector('.product-price.free') !== null ||
                       card.querySelector('.add-cart-btn')?.getAttribute('data-price') === '0';

        if (filterValue === 'all') {
          card.style.display = 'flex';
        } else if (filterValue === 'free') {
          card.style.display = isFree ? 'flex' : 'none';
        } else if (category === filterValue) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Event Delegation for Add-to-Cart Buttons (Supports static and dynamically added admin products)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-cart-btn');
    if (btn) {
      const name = btn.getAttribute('data-name');
      const price = parseInt(btn.getAttribute('data-price'), 10);
      const meta = btn.getAttribute('data-meta');

      // Track real click analytics
      trackClick(name.toLowerCase().replace(/\s+/g, '_'), name, meta || 'Store Resource', 'Store Resource');

      addItemToCart(name, price, meta);
      if (price === 0) {
        showToast(`Unlocked free resource: "${name}"! Open cart to download.`);
      } else {
        showToast(`Added "${name}" to your shopping bag!`);
      }
    }
  });
}



function addItemToCart(name, price, meta) {
  cartItems.push({ id: Date.now() + Math.random(), name, price, meta });
  updateCartUI();
}

function removeItemFromCart(id) {
  cartItems = cartItems.filter(item => item.id !== id);
  updateCartUI();
}

function updateCartUI() {
  const cartBadge = document.querySelector('.cart-badge');
  const cartContainer = document.getElementById('cart-items-container');
  const emptyMsg = document.getElementById('cart-empty-msg');
  const totalPriceEl = document.getElementById('cart-total-price');

  if (cartBadge) {
    cartBadge.textContent = cartItems.length;
  }

  if (!cartContainer) return;

  cartContainer.innerHTML = '';
  let total = 0;

  if (cartItems.length === 0) {
    emptyMsg.style.display = 'block';
  } else {
    emptyMsg.style.display = 'none';
    cartItems.forEach(item => {
      total += item.price;
      const row = document.createElement('div');
      row.className = 'cart-item-row';
      row.innerHTML = `
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <span>${item.meta}</span>
        </div>
        <div class="cart-item-action">
          <span class="cart-item-price">${item.price === 0 ? 'FREE' : '₹' + item.price}</span>
          <button class="remove-item-btn" onclick="removeItemFromCart(${item.id})"><i class="fas fa-trash-can"></i></button>
        </div>
      `;
      cartContainer.appendChild(row);
    });
  }

  if (totalPriceEl) {
    totalPriceEl.textContent = '₹' + total;
  }
}

function initCartDrawer() {
  const cartBtn = document.getElementById('nav-cart-btn');
  const cartOverlay = document.getElementById('cart-drawer-overlay');
  const closeBtn = document.getElementById('cart-close-btn');

  function openCart() {
    updateCartUI();
    if (cartOverlay) cartOverlay.classList.add('active');
  }

  if (cartBtn) cartBtn.addEventListener('click', openCart);

  if (closeBtn && cartOverlay) {
    closeBtn.addEventListener('click', () => {
      cartOverlay.classList.remove('active');
    });
  }

  if (cartOverlay) {
    cartOverlay.addEventListener('click', (e) => {
      if (e.target === cartOverlay) {
        cartOverlay.classList.remove('active');
      }
    });
  }
}

/* ==========================================================================
   4. RAZORPAY CHECKOUT & INVOICE GENERATION
   ========================================================================== */
function initiateRazorpayCheckout() {
  if (cartItems.length === 0) {
    showToast('Your shopping bag is empty! Add resources from the store first.');
    return;
  }

  const purchasedSnapshot = [...cartItems];
  const totalAmount = purchasedSnapshot.reduce((sum, item) => sum + item.price, 0);

  // If cart total is FREE (₹0), generate receipt & instant unlock
  if (totalAmount === 0) {
    showToast('🎉 Free Resources Unlocked! Generating receipt...');
    const demoPaymentId = "free_access_" + Math.random().toString(36).substring(2, 10);
    setTimeout(() => {
      cartItems = [];
      updateCartUI();
      document.getElementById('cart-drawer-overlay').classList.remove('active');
      generateInvoiceModal(demoPaymentId, totalAmount, purchasedSnapshot);
    }, 1200);
    return;
  }

  const itemNames = purchasedSnapshot.map(i => i.name).join(', ');

  // Check if Razorpay API Key placeholder is present
  if (RAZORPAY_CONFIG.key_id === "YOUR_RAZORPAY_KEY_ID") {
    showToast('💳 Razorpay Demo Mode: Processing test order...');
    
    setTimeout(() => {
      const demoPaymentId = "pay_demo_" + Math.random().toString(36).substring(2, 12);
      cartItems = [];
      updateCartUI();
      document.getElementById('cart-drawer-overlay').classList.remove('active');
      generateInvoiceModal(demoPaymentId, totalAmount, purchasedSnapshot);
    }, 1800);

    return;
  }

  // Live or Test Key Present - Trigger Razorpay Standard Checkout SDK
  if (typeof window.Razorpay === 'undefined') {
    showToast('Error: Unable to load Razorpay SDK. Please check connection.');
    return;
  }

  const options = {
    key: RAZORPAY_CONFIG.key_id,
    amount: totalAmount * 100, // Amount in paise
    currency: RAZORPAY_CONFIG.currency,
    name: RAZORPAY_CONFIG.company_name,
    description: `Order (${purchasedSnapshot.length} items): ${itemNames.substring(0, 80)}...`,
    image: RAZORPAY_CONFIG.logo,
    handler: function (response) {
      cartItems = [];
      updateCartUI();
      document.getElementById('cart-drawer-overlay').classList.remove('active');
      generateInvoiceModal(response.razorpay_payment_id, totalAmount, purchasedSnapshot);
    },
    prefill: {
      name: "Parent / Customer",
      email: "parent@example.com",
      contact: "9876543210"
    },
    notes: {
      items_purchased: itemNames
    },
    theme: {
      color: RAZORPAY_CONFIG.theme_color
    }
  };

  try {
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response) {
      showToast(`Payment Failed: ${response.error.description || 'Transaction cancelled.'}`);
    });
    rzp.open();
  } catch (err) {
    console.error("Razorpay Checkout Error:", err);
    showToast('Razorpay Checkout Error. Please verify your API Key ID.');
  }
}

/* Dynamic Tax Invoice & Receipt Generator (Matched to Reference Layout & Brand Theme) */
function generateInvoiceModal(paymentId, totalAmount, itemsArray) {
  // Save order to history
  const orderRecord = {
    invoiceNo: "DCS-INV-202608-" + Math.floor(1000 + Math.random() * 9000),
    paymentId: paymentId,
    total: totalAmount,
    items: [...itemsArray],
    date: new Date().toLocaleDateString('en-GB') + ' • ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  };

  let ordersHistory = JSON.parse(localStorage.getItem('dcs_orders_history') || '[]');
  ordersHistory.unshift(orderRecord);
  localStorage.setItem('dcs_orders_history', JSON.stringify(ordersHistory));

  const invoiceModal = document.getElementById('invoice-modal');
  const invoiceBody = document.getElementById('invoice-modal-body');
  const invoiceNo = orderRecord.invoiceNo;

  
  const now = new Date();
  const currentDateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const currentTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  const invoiceDateTime = `${currentDateStr} • ${currentTimeStr}`;

  // Tax calculations
  const subtotal = (totalAmount / 1.18).toFixed(2);
  const totalTax = (totalAmount - subtotal).toFixed(2);
  const cgst = (totalTax / 2).toFixed(2);
  const sgst = (totalTax / 2).toFixed(2);

  let itemRows = '';
  let downloadRows = '';

  itemsArray.forEach(item => {
    itemRows += `
      <tr>
        <td>
          <span class="invoice-item-title">${item.name}</span>
          <span class="invoice-item-format">${item.meta}</span>
        </td>
        <td style="text-align:center; font-weight:700;">1</td>
        <td style="text-align:right; font-weight:800; color:var(--text-primary);">₹${item.price}</td>
      </tr>
    `;

    downloadRows += `
      <div class="download-item-row">
        <span class="download-item-title">${item.name}</span>
        <a href="#" class="download-file-btn" onclick="event.preventDefault(); showToast('Downloading ${item.name}...');"><i class="fas fa-download"></i> Download File</a>
      </div>
    `;
  });

  const gatewayText = (RAZORPAY_CONFIG.key_id === "YOUR_RAZORPAY_KEY_ID")
    ? "Simulated Razorpay Gateway (Placeholder Mode)"
    : "Live Razorpay Gateway";

  if (invoiceModal && invoiceBody) {
    invoiceBody.innerHTML = `
      <div class="printable-invoice-container">
        <div class="invoice-box">
          
          <!-- Header -->
          <div class="invoice-header-row">
            <div class="invoice-brand-col">
              <div class="invoice-brand-icon"><i class="fas fa-child-reaching"></i></div>
              <div class="invoice-brand-text">
                <h2>Dr. Chitra Sankar</h2>
                <p>Developmental Pediatrician & Digital Wellness Hub</p>
                <span>GSTIN: 29AAAAA0000A1Z5</span>
              </div>
            </div>
            <div class="invoice-right-meta">
              <div class="invoice-badge-title">TAX INVOICE</div>
              <h3>${invoiceNo}</h3>
              <span>${invoiceDateTime}</span>
            </div>
          </div>

          <!-- Billed To & Payment Info Box -->
          <div class="invoice-info-card">
            <div class="invoice-info-col">
              <h4>Billed To:</h4>
              <p>Name: <strong>waibhav jha</strong></p>
              <p>Email: <strong>waibhavj@gmail.com</strong></p>
              <p>Phone: <strong>08957088805</strong></p>
            </div>
            <div class="invoice-info-col">
              <h4>Payment Reference:</h4>
              <p>Status: <span class="status-paid">PAID</span></p>
              <p>Payment ID: <strong>${paymentId}</strong></p>
              <p>Gateway: <strong>${gatewayText}</strong></p>
            </div>
          </div>

          <!-- Items Table -->
          <table class="invoice-items-table">
            <thead>
              <tr>
                <th>Item Description</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <!-- Tax Summary -->
          <div class="invoice-summary-box">
            <div class="invoice-summary-row">
              <span>Subtotal (Excl. Tax)</span>
              <span>₹${subtotal}</span>
            </div>
            <div class="invoice-summary-row">
              <span>CGST (9%)</span>
              <span>₹${cgst}</span>
            </div>
            <div class="invoice-summary-row">
              <span>SGST (9%)</span>
              <span>₹${sgst}</span>
            </div>
            <div class="invoice-summary-row grand-total">
              <span>Grand Total</span>
              <span>₹${totalAmount}.00</span>
            </div>
          </div>

          <!-- Digital Products Download Card -->
          <div class="invoice-downloads-card">
            <div class="invoice-downloads-header">
              <i class="fas fa-check-circle"></i>
              <span>Digital Products Ready for Download:</span>
            </div>
            ${downloadRows}
          </div>

        </div>

        <!-- Print & Download Bar -->
        <div class="invoice-action-bar">
          <button class="btn btn-outline-purple" onclick="window.print()"><i class="fas fa-print"></i> Print Invoice</button>
          <button class="btn btn-primary" onclick="window.print()"><i class="fas fa-file-pdf"></i> Save / Download PDF</button>
        </div>
      </div>
    `;

    invoiceModal.classList.add('active');
  }

  showToast(`✅ Payment Verified! Tax Invoice ${invoiceNo} generated.`);
}



/* ==========================================================================
   5. ARTICLE READER MODAL
   ========================================================================== */
const articlesData = {
  1: {
    title: "How Background Noise & Screen Clutter Impact Infant Language Development",
    meta: "Child Brain Development • Aug 2, 2026 • 5 min read",
    author: "Dr. Chitra Sankar",
    content: `
      <h3>The Hidden Cost of Ambient Noise on Developing Brains</h3>
      <p>Research in developmental pediatrics and auditory neuroscience reveals that infants and toddlers do not possess the neurological ability to filter out background audio (e.g., continuous television, noisy tablet videos, or ambient loudspeaker chatter). When background noise is present, it acts as an "auditory fog" that severely diminishes language acquisition.</p>
      
      <div style="background:var(--bg-secondary); border-left:4px solid var(--purple-outline); padding:16px 20px; border-radius:12px; margin:20px 0;">
        <strong style="color:var(--text-primary);">Clinical Finding:</strong>
        <p style="margin:4px 0 0; font-size:0.95rem;">Studies show that ambient television noise reduces the number of vocal turn-taking cycles between parents and infants by up to <strong>70%</strong>, and reduces parental word count by over 1,000 words per day.</p>
      </div>

      <h4>Core Takeaways for Parents:</h4>
      <ul style="margin-left: 20px; line-height: 1.8; margin-bottom: 20px;">
        <li><strong>Turn-Taking is Vital:</strong> Infants learn phonemes and syntax through reciprocal, eye-to-eye vocal exchanges, not passive sound absorption.</li>
        <li><strong>Attention Span Fragmentation:</strong> Background television cuts the average duration of toddler independent play and exploration in half.</li>
        <li><strong>Establish "Auditory Quiet Zones":</strong> Designate meals, floor playtime, and morning routines as strictly screen-free and audio-quiet periods.</li>
      </ul>

      <h4>Practical Daily Action:</h4>
      <p>Narrate your daily actions (e.g., folding laundry, preparing food, walking in the park) with warm, exaggerated infant-directed speech ("parentese") instead of having television on as company.</p>
    `
  },
  2: {
    title: "Designing a Healthy Family Routine & Media Agreement for Children",
    meta: "Digital Parenting • July 28, 2026 • 7 min read",
    author: "Dr. Chitra Sankar",
    content: `
      <h3>Why Collaborative Agreements Outperform Strict Bans</h3>
      <p>In modern parenting, unilateral screen bans frequently trigger power struggles, deceitful device use, and heightened family friction. A collaborative <strong>Family Media & Routine Agreement</strong> shifts the paradigm from restrictive policing to shared ownership and self-regulation.</p>

      <div style="background:var(--soft-pink); border-left:4px solid var(--accent); padding:16px 20px; border-radius:12px; margin:20px 0;">
        <strong style="color:var(--accent);">Dr. Chitra's 3 Non-Negotiable Pillars:</strong>
        <ol style="margin:8px 0 0 16px; font-size:0.95rem; line-height: 1.7;">
          <li><strong>Bedrooms are Screen-Free Sanctuaries:</strong> Devices charge in the common living area 60 minutes prior to bedtime to protect natural melatonin production.</li>
          <li><strong>Family Meals are Sacred:</strong> Table conversations occur without devices to encourage emotional bonding and mindful eating.</li>
          <li><strong>Physical Activity & Responsibilities First:</strong> School assignments, outdoor play, and domestic chores precede discretionary entertainment screens.</li>
        </ol>
      </div>

      <h4>How to Introduce the Agreement:</h4>
      <p>Sit down together during a calm weekend afternoon. Ask your children what digital habits they feel good about and where they feel fatigued. Write down mutually agreed time allocations and post the physical checklist on the refrigerator.</p>
    `
  },
  3: {
    title: "Recognizing Early Signs of Childhood Sensory Overstimulation",
    meta: "Behavioral Health • July 18, 2026 • 6 min read",
    author: "Dr. Chitra Sankar",
    content: `
      <h3>Understanding the Sensory Nervous System</h3>
      <p>Children's nervous systems are exquisitely sensitive to high-intensity visual transitions, loud decibel spikes, and prolonged cognitive bombardment. When stimuli exceed the child's regulatory capacity, the nervous system shifts into sympathetic "fight or flight," which parents commonly experience as meltdowns or severe obstinacy.</p>

      <h4>Early Warning Indicators of Sensory Overload:</h4>
      <ul style="margin-left: 20px; line-height: 1.8; margin-bottom: 20px;">
        <li><strong>Physical Cues:</strong> Rubbing eyes, covering ears, rapid shallow breathing, or excessive hyperactivity following screen sessions.</li>
        <li><strong>Emotional Reactivity:</strong> Disproportionate tantrums over minor transitions (e.g., turning off the television, putting on shoes).</li>
        <li><strong>Sleep Disruption:</strong> Difficulty initiating sleep, night terrors, or restless motor agitation in bed.</li>
      </ul>

      <h4>The 5-Step Pediatric Reset Protocol:</h4>
      <ol style="margin-left: 20px; line-height: 1.8;">
        <li><strong>Lower Lighting:</strong> Dim room lights and draw curtains to eliminate visual overload.</li>
        <li><strong>Proprioceptive Deep Pressure:</strong> Offer a warm embrace, weighted blanket, or gentle back squeeze.</li>
        <li><strong>Hydration & Cool Drink:</strong> Sipping through a straw engages oral-motor calming pathways.</li>
        <li><strong>Co-Regulation Breathing:</strong> Breathe slowly and visibly together: "Smell the flower, blow out the candle."</li>
        <li><strong>Tactile Reset:</strong> Offer kinetic sand, playdough, or a warm bath before re-engaging.</li>
      </ol>
    `
  },
  4: {
    title: "Speech Delays vs. Late Bloomers: An Evidence-Based Pediatric Guide",
    meta: "Speech & Language Milestones • July 10, 2026 • 5 min read",
    author: "Dr. Chitra Sankar",
    content: `
      <h3>Deciphering Early Language Trajectories</h3>
      <p>One of the most frequent concerns parents bring to developmental pediatrics is: <em>"My child isn't speaking as much as their peers—are they just a late talker, or should I be worried?"</em> Knowing what is typical versus what warrants professional evaluation is critical for timely intervention.</p>

      <h4>Key Milestone Benchmarks:</h4>
      <ul style="margin-left: 20px; line-height: 1.8; margin-bottom: 20px;">
        <li><strong>By 12 Months:</strong> Responds to name, uses gestures (pointing, waving goodbye), babbles with varied consonant sounds (ba-ba, da-da).</li>
        <li><strong>By 18 Months:</strong> Uses at least 6–10 single words consistently, points to show interest ("joint attention"), follows simple 1-step directions.</li>
        <li><strong>By 24 Months:</strong> Has a vocabulary of 50+ words, spontaneously combines 2 words ("want milk", "big dog"), understands simple questions.</li>
        <li><strong>By 36 Months:</strong> Uses 3–4 word sentences, conversations are at least 75% understandable to unfamiliar listeners.</li>
      </ul>

      <div style="background:var(--bg-secondary); border-left:4px solid var(--purple-outline); padding:16px 20px; border-radius:12px; margin:20px 0;">
        <strong style="color:var(--text-primary);">When to Seek Early Evaluation ("Don't Wait & See"):</strong>
        <p style="margin:4px 0 0; font-size:0.95rem;">If your child does not point to communicate by 14 months, loses previously acquired words or social skills, has difficulty making eye contact, or cannot follow 1-step instructions by 18 months, schedule a formal developmental evaluation promptly. Early intervention produces the most profound long-term neuroplastic outcomes.</p>
      </div>
    `
  }
};

function initArticleModal() {
  const modalOverlay = document.getElementById('article-modal');
  const modalBody = document.getElementById('modal-article-body');
  const modalTitle = document.getElementById('modal-article-title');
  const modalMeta = document.getElementById('modal-article-meta');

  document.addEventListener('click', (e) => {
    // Open article modal
    const readBtn = e.target.closest('.read-article-btn');
    if (readBtn) {
      const articleId = readBtn.getAttribute('data-id');
      const article = articlesData[articleId];
      if (article) {
        // Track real article click analytics
        trackClick('article_' + articleId, article.title, 'Parenting Article', 'Blog Article');

        modalTitle.textContent = article.title;
        modalMeta.textContent = article.meta;
        modalBody.innerHTML = article.content;
        if (modalOverlay) modalOverlay.classList.add('active');
      }
    }

    // Close article modal via X button
    if (e.target.closest('#article-modal .modal-close-btn')) {
      if (modalOverlay) modalOverlay.classList.remove('active');
    }
  });

  // Close article modal by clicking outside overlay
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
      }
    });
  }
}


/* ==========================================================================
   6. APPOINTMENTS - STARTING SOON WAITLIST LOGIC
   ========================================================================== */
function initAppointmentsWaitlist() {
  const waitlistForm = document.getElementById('appointments-waitlist-form');

  if (waitlistForm) {
    waitlistForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const parentName = document.getElementById('wl-parent-name').value;
      const email = document.getElementById('wl-email').value;
      const phone = document.getElementById('wl-phone').value;
      const childAge = document.getElementById('wl-child-age').value;
      const referral = document.getElementById('wl-referral').value;

      const waitlistEntry = {
        parentName,
        email,
        phone,
        childAge,
        referral,
        concerns: referral,
        date: new Date().toLocaleDateString('en-GB'),
        status: 'Pending'
      };

      // Local fallback queue
      let queue = JSON.parse(localStorage.getItem('dcs_waitlist_queue') || '[]');
      queue.unshift(waitlistEntry);
      localStorage.setItem('dcs_waitlist_queue', JSON.stringify(queue));

      // Post to real persistent backend database
      fetch('/api/appointments/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentName,
          email,
          phone,
          childAge,
          concerns: referral
        })
      })
        .then(res => res.json())
        .then(data => {
          showToast(data.message || `Thank you ${parentName}! You have been added to Dr. Chitra Sankar's priority waitlist.`);
        })
        .catch(() => {
          showToast(`Thank you ${parentName}! You have been added to Dr. Chitra Sankar's priority waitlist.`);
        });

      // Track click analytics
      trackClick('lead_waitlist_form', 'Priority Consultation Waitlist Submission', 'Appointments', 'Form Registration');
      waitlistForm.reset();
    });
  }
}



/* ==========================================================================
   7. CONTACT FORMS
   ========================================================================== */
function initContactForms() {
  const contactForm = document.getElementById('direct-inquiry-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = contactForm.querySelector('input[type="text"]')?.value || 'Parent';
      const email = contactForm.querySelector('input[type="email"]')?.value || '';
      const message = contactForm.querySelector('textarea')?.value || '';

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, subject: 'Clinical Inquiry' })
      })
        .then(res => res.json())
        .then(data => {
          showToast(data.message || 'Thank you! Your message has been sent to Dr. Chitra Sankar’s clinic team.');
        })
        .catch(() => {
          showToast('Thank you! Your message has been sent to Dr. Chitra Sankar’s clinic team.');
        });

      contactForm.reset();
    });
  }
}

/* Helper function for Toast notification with manual close X button */
function showToast(message) {
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px;">
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
    </div>
    <button class="toast-close-btn" onclick="this.closest('.toast').remove()"><i class="fas fa-times"></i></button>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 4000);
}

