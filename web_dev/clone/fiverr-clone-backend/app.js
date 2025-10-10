// FreelanceHub Application JavaScript

class FreelanceHub {
  constructor() {
    this.currentUser = null;
    this.currentPage = 'home';
    this.sampleData = {
      users: [
        {
          id: 1,
          name: "John Developer",
          email: "john@example.com", 
          role: "freelancer",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
          skills: ["React", "Node.js", "MongoDB"],
          rating: 4.8,
          completedOrders: 156,
          password: "password123"
        },
        {
          id: 2,
          name: "Sarah Client",
          email: "sarah@example.com",
          role: "client", 
          avatar: "https://images.unsplash.com/photo-1494790108755-2616b612ce00?w=150&h=150&fit=crop&crop=face",
          totalSpent: 15420,
          activeOrders: 3,
          password: "password123"
        },
        {
          id: 3,
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
          password: "admin123"
        }
      ],
      gigs: [
        {
          id: 1,
          title: "I will develop a full-stack web application",
          description: "Professional web development services using MERN stack. I will create responsive, modern web applications with complete backend functionality.",
          price: 500,
          image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=300&fit=crop",
          category: "Web Development",
          freelancerId: 1,
          freelancer: "John Developer",
          rating: 4.9,
          reviews: 45,
          featured: true
        },
        {
          id: 2, 
          title: "I will design modern UI/UX for your app",
          description: "Creative UI/UX design services with Figma. Complete design system with prototypes and developer handoff.",
          price: 350,
          image: "https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=400&h=300&fit=crop",
          category: "Design",
          freelancerId: 1,
          freelancer: "Emma Designer",
          rating: 4.7,
          reviews: 32,
          featured: true
        },
        {
          id: 3,
          title: "I will create professional logo design",
          description: "Custom logo design with unlimited revisions until you're satisfied.",
          price: 150,
          image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=300&fit=crop",
          category: "Graphic Design",
          freelancerId: 1,
          freelancer: "John Developer",
          rating: 4.6,
          reviews: 28
        }
      ],
      categories: [
        {"name": "Web Development", "icon": "💻", "count": 1250},
        {"name": "Graphic Design", "icon": "🎨", "count": 890},
        {"name": "Digital Marketing", "icon": "📱", "count": 675},
        {"name": "Writing", "icon": "✍️", "count": 542},
        {"name": "Video Editing", "icon": "🎬", "count": 423}
      ],
      analytics: {
        totalUsers: 12500,
        activeGigs: 3200,
        monthlyRevenue: 125000,
        completedOrders: 8750
      },
      messages: [
        {
          id: 1,
          from: "John Developer",
          message: "Hi! I'd be happy to work on your project.",
          timestamp: new Date(Date.now() - 3600000),
          sent: false
        },
        {
          id: 2,
          from: "You",
          message: "Great! Can you tell me more about your experience?",
          timestamp: new Date(Date.now() - 1800000),
          sent: true
        }
      ]
    };
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.renderHomePage();
    
    // Check for logged in user in session
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
      this.updateAuthUI();
    }
  }

  setupEventListeners() {
    // Navigation events
    document.getElementById('loginBtn').addEventListener('click', () => this.showAuth('login'));
    document.getElementById('registerBtn').addEventListener('click', () => this.showAuth('register'));
    document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
    document.getElementById('dashboardBtn').addEventListener('click', () => this.showDashboard());
    document.getElementById('profileBtn').addEventListener('click', () => this.showProfile());

    // User avatar click to toggle dropdown
    document.getElementById('userAvatar').addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = document.getElementById('userDropdown');
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      const dropdown = document.getElementById('userDropdown');
      dropdown.style.display = 'none';
    });

    // Auth form switching
    document.getElementById('showRegisterForm').addEventListener('click', (e) => {
      e.preventDefault();
      this.showRegisterForm();
    });
    document.getElementById('showLoginForm').addEventListener('click', (e) => {
      e.preventDefault();
      this.showLoginForm();
    });

    // Form submissions
    document.getElementById('loginFormElement').addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('registerFormElement').addEventListener('submit', (e) => this.handleRegister(e));

    // Home page actions
    document.getElementById('heroSearchBtn').addEventListener('click', () => this.performSearch());
    document.getElementById('heroSearch').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.performSearch();
    });
    document.getElementById('browseGigsBtn').addEventListener('click', () => this.showGigs());
    document.getElementById('startSellingBtn').addEventListener('click', () => this.handleStartSelling());

    // Gig filters
    const categoryFilter = document.getElementById('categoryFilter');
    const priceFilter = document.getElementById('priceFilter');
    const gigSearch = document.getElementById('gigSearch');
    
    if (categoryFilter) categoryFilter.addEventListener('change', () => this.filterGigs());
    if (priceFilter) priceFilter.addEventListener('change', () => this.filterGigs());
    if (gigSearch) gigSearch.addEventListener('input', () => this.filterGigs());

    // Modal events
    document.getElementById('closeCreateGigModal').addEventListener('click', () => this.hideModal('createGigModal'));
    document.getElementById('cancelCreateGig').addEventListener('click', () => this.hideModal('createGigModal'));
    document.getElementById('createGigForm').addEventListener('submit', (e) => this.handleCreateGig(e));

    // Chat events
    document.getElementById('chatClose').addEventListener('click', () => this.hideChat());
    document.getElementById('sendMessage').addEventListener('click', () => this.sendMessage());
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });

    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href === '#home') this.showHome();
        else if (href === '#gigs') this.showGigs();
        else if (href === '#become-seller') this.handleBecomeSeller();
      });
    });
  }

  // Authentication Methods
  showAuth(type = 'login') {
    this.showPage('authPage');
    if (type === 'login') {
      this.showLoginForm();
    } else {
      this.showRegisterForm();
    }
  }

  showLoginForm() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
  }

  showRegisterForm() {
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
  }

  handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const user = this.sampleData.users.find(u => u.email === email && u.password === password);
    
    if (user) {
      this.currentUser = user;
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      this.updateAuthUI();
      this.showToast('Login successful!', 'success');
      this.showDashboard();
    } else {
      this.showToast('Invalid email or password', 'error');
    }
  }

  handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;

    // Check if user already exists
    if (this.sampleData.users.find(u => u.email === email)) {
      this.showToast('User already exists with this email', 'error');
      return;
    }

    const newUser = {
      id: this.sampleData.users.length + 1,
      name,
      email,
      password,
      role,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      skills: [],
      rating: 0,
      completedOrders: 0,
      totalSpent: 0,
      activeOrders: 0
    };

    this.sampleData.users.push(newUser);
    this.currentUser = newUser;
    sessionStorage.setItem('currentUser', JSON.stringify(newUser));
    this.updateAuthUI();
    this.showToast('Account created successfully!', 'success');
    this.showDashboard();
  }

  logout() {
    this.currentUser = null;
    sessionStorage.removeItem('currentUser');
    this.updateAuthUI();
    this.showHome();
    this.showToast('Logged out successfully', 'info');
  }

  updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const userMenu = document.getElementById('userMenu');
    const userAvatar = document.getElementById('userAvatar');

    if (this.currentUser) {
      loginBtn.classList.add('hidden');
      registerBtn.classList.add('hidden');
      userMenu.classList.remove('hidden');
      userAvatar.src = this.currentUser.avatar;
    } else {
      loginBtn.classList.remove('hidden');
      registerBtn.classList.remove('hidden');
      userMenu.classList.add('hidden');
    }
  }

  // Navigation handlers for improved UX
  handleStartSelling() {
    if (this.currentUser) {
      if (this.currentUser.role === 'freelancer') {
        this.showDashboard();
        this.showToast('You are already a freelancer! Manage your gigs from the dashboard.', 'info');
      } else {
        this.showToast('Switch to a freelancer account to start selling services.', 'info');
      }
    } else {
      this.showAuth('register');
    }
  }

  handleBecomeSeller() {
    if (this.currentUser) {
      if (this.currentUser.role === 'freelancer') {
        this.showDashboard();
        this.showToast('Welcome back! Manage your freelance business from here.', 'info');
      } else {
        this.showToast('Contact support to upgrade your account to freelancer status.', 'info');
      }
    } else {
      this.showAuth('register');
    }
  }

  // Page Navigation
  showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    this.currentPage = pageId.replace('Page', '');
  }

  showHome() {
    this.showPage('homePage');
    this.renderHomePage();
  }

  showGigs() {
    this.showPage('gigsPage');
    this.renderGigsPage();
  }

  showGigDetail(gigId) {
    this.showPage('gigDetailPage');
    this.renderGigDetail(gigId);
  }

  showDashboard() {
    if (!this.currentUser) {
      this.showAuth('login');
      return;
    }
    this.showPage('dashboardPage');
    this.renderDashboard();
  }

  showProfile() {
    if (!this.currentUser) {
      this.showAuth('login');
      return;
    }
    this.showPage('profilePage');
    this.renderProfile();
  }

  // Rendering Methods
  renderHomePage() {
    this.renderCategories();
    this.renderFeaturedGigs();
  }

  renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '';

    this.sampleData.categories.forEach(category => {
      const card = document.createElement('div');
      card.className = 'category-card';
      card.innerHTML = `
        <span class="category-icon">${category.icon}</span>
        <div class="category-name">${category.name}</div>
        <div class="category-count">${category.count} services</div>
      `;
      card.addEventListener('click', () => {
        this.showGigs();
        // Filter by category
        setTimeout(() => {
          document.getElementById('categoryFilter').value = category.name;
          this.filterGigs();
        }, 100);
      });
      grid.appendChild(card);
    });
  }

  renderFeaturedGigs() {
    const grid = document.getElementById('featuredGigs');
    grid.innerHTML = '';

    const featuredGigs = this.sampleData.gigs.filter(gig => gig.featured);
    featuredGigs.forEach(gig => {
      grid.appendChild(this.createGigCard(gig));
    });
  }

  renderGigsPage() {
    // Populate category filter
    const categoryFilter = document.getElementById('categoryFilter');
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    this.sampleData.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.name;
      option.textContent = category.name;
      categoryFilter.appendChild(option);
    });

    this.renderAllGigs();
  }

  renderAllGigs() {
    const grid = document.getElementById('allGigs');
    grid.innerHTML = '';

    this.sampleData.gigs.forEach(gig => {
      grid.appendChild(this.createGigCard(gig));
    });
  }

  createGigCard(gig) {
    const card = document.createElement('div');
    card.className = 'gig-card';
    card.innerHTML = `
      <img src="${gig.image}" alt="${gig.title}" class="gig-image">
      <div class="gig-card-body">
        <h3 class="gig-title">${gig.title}</h3>
        <p class="gig-description">${gig.description}</p>
        <div class="gig-meta">
          <div class="gig-rating">
            <span class="star">⭐</span>
            <span>${gig.rating}</span>
            <span>(${gig.reviews})</span>
          </div>
          <div class="gig-price">$${gig.price}</div>
        </div>
        <div class="gig-freelancer">by ${gig.freelancer}</div>
      </div>
    `;
    card.addEventListener('click', () => this.showGigDetail(gig.id));
    return card;
  }

  renderGigDetail(gigId) {
    const gig = this.sampleData.gigs.find(g => g.id === gigId);
    if (!gig) return;

    const content = document.getElementById('gigDetailContent');
    content.innerHTML = `
      <div class="gig-detail-header">
        <button class="btn btn--outline" onclick="app.showGigs()">← Back to Gigs</button>
        <h1>${gig.title}</h1>
        <div class="gig-meta">
          <div class="gig-rating">
            <span class="star">⭐</span>
            <span>${gig.rating}</span>
            <span>(${gig.reviews} reviews)</span>
          </div>
          <span>by ${gig.freelancer}</span>
        </div>
      </div>
      
      <div class="gig-detail-body">
        <div class="gig-detail-main">
          <img src="${gig.image}" alt="${gig.title}" class="gig-detail-image" style="width: 100%; height: 300px; object-fit: cover; border-radius: var(--radius-lg); margin-bottom: var(--space-24);">
          <div class="gig-description-full">
            <h3>About this gig</h3>
            <p>${gig.description}</p>
            <p>This service includes:</p>
            <ul>
              <li>Professional ${gig.category.toLowerCase()} work</li>
              <li>Unlimited revisions</li>
              <li>Fast 24-48 hour delivery</li>
              <li>Commercial use rights</li>
            </ul>
          </div>
        </div>
        
        <div class="gig-detail-sidebar" style="background: var(--color-surface); border: 1px solid var(--color-card-border); border-radius: var(--radius-lg); padding: var(--space-24); margin-top: var(--space-24);">
          <div class="pricing-tier">
            <h3>Basic Package</h3>
            <div class="price">$${gig.price}</div>
            <p>Standard ${gig.category.toLowerCase()} service</p>
            <button class="btn btn--primary btn--full-width" onclick="app.orderGig(${gig.id})">
              ${this.currentUser ? 'Order Now' : 'Sign in to Order'}
            </button>
            <button class="btn btn--outline btn--full-width mt-16" onclick="app.showChat()">Contact Seller</button>
          </div>
        </div>
      </div>
    `;
  }

  renderDashboard() {
    const title = document.getElementById('dashboardTitle');
    const nav = document.getElementById('sidebarNav');
    const content = document.getElementById('dashboardContent');

    // Set navigation based on user role
    nav.innerHTML = '';
    
    if (this.currentUser.role === 'freelancer') {
      title.textContent = 'Freelancer Dashboard';
      this.renderFreelancerNav(nav);
      this.renderFreelancerDashboard(content);
    } else if (this.currentUser.role === 'client') {
      title.textContent = 'Client Dashboard';
      this.renderClientNav(nav);
      this.renderClientDashboard(content);
    } else if (this.currentUser.role === 'admin') {
      title.textContent = 'Admin Dashboard';
      this.renderAdminNav(nav);
      this.renderAdminDashboard(content);
    }
  }

  renderFreelancerNav(nav) {
    const navItems = [
      { id: 'overview', icon: '📊', text: 'Overview', active: true },
      { id: 'gigs', icon: '💼', text: 'My Gigs' },
      { id: 'orders', icon: '📋', text: 'Active Orders' },
      { id: 'earnings', icon: '💰', text: 'Earnings' },
      { id: 'messages', icon: '💬', text: 'Messages' }
    ];

    navItems.forEach(item => {
      const button = document.createElement('button');
      button.className = `sidebar-nav-item ${item.active ? 'active' : ''}`;
      button.innerHTML = `<span class="icon">${item.icon}</span>${item.text}`;
      button.addEventListener('click', () => this.switchDashboardTab(item.id, 'freelancer'));
      nav.appendChild(button);
    });
  }

  renderClientNav(nav) {
    const navItems = [
      { id: 'overview', icon: '📊', text: 'Overview', active: true },
      { id: 'orders', icon: '🛒', text: 'My Orders' },
      { id: 'favorites', icon: '❤️', text: 'Saved Gigs' },
      { id: 'messages', icon: '💬', text: 'Messages' }
    ];

    navItems.forEach(item => {
      const button = document.createElement('button');
      button.className = `sidebar-nav-item ${item.active ? 'active' : ''}`;
      button.innerHTML = `<span class="icon">${item.icon}</span>${item.text}`;
      button.addEventListener('click', () => this.switchDashboardTab(item.id, 'client'));
      nav.appendChild(button);
    });
  }

  renderAdminNav(nav) {
    const navItems = [
      { id: 'overview', icon: '📊', text: 'Overview', active: true },
      { id: 'users', icon: '👥', text: 'User Management' },
      { id: 'gigs', icon: '💼', text: 'Gig Management' },
      { id: 'analytics', icon: '📈', text: 'Analytics' }
    ];

    navItems.forEach(item => {
      const button = document.createElement('button');
      button.className = `sidebar-nav-item ${item.active ? 'active' : ''}`;
      button.innerHTML = `<span class="icon">${item.icon}</span>${item.text}`;
      button.addEventListener('click', () => this.switchDashboardTab(item.id, 'admin'));
      nav.appendChild(button);
    });
  }

  renderFreelancerDashboard(content) {
    content.innerHTML = `
      <div class="dashboard-stats">
        <div class="stat-card">
          <h3>Active Gigs</h3>
          <div class="stat-value">${this.getUserGigs().length}</div>
        </div>
        <div class="stat-card">
          <h3>Total Orders</h3>
          <div class="stat-value">${this.currentUser.completedOrders}</div>
        </div>
        <div class="stat-card">
          <h3>Average Rating</h3>
          <div class="stat-value">${this.currentUser.rating}</div>
        </div>
        <div class="stat-card">
          <h3>This Month</h3>
          <div class="stat-value">$2,450</div>
        </div>
      </div>

      <div class="chart-container">
        <h3>Earnings Overview</h3>
        <canvas id="earningsChart"></canvas>
      </div>

      <div class="card">
        <div class="card__header flex-between">
          <h3>My Gigs</h3>
          <button class="btn btn--primary" onclick="app.showModal('createGigModal')">Create New Gig</button>
        </div>
        <div class="card__body">
          ${this.renderUserGigsTable()}
        </div>
      </div>
    `;

    this.renderEarningsChart();
  }

  renderClientDashboard(content) {
    content.innerHTML = `
      <div class="dashboard-stats">
        <div class="stat-card">
          <h3>Active Orders</h3>
          <div class="stat-value">${this.currentUser.activeOrders}</div>
        </div>
        <div class="stat-card">
          <h3>Total Spent</h3>
          <div class="stat-value">$${this.currentUser.totalSpent.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <h3>Completed Projects</h3>
          <div class="stat-value">23</div>
        </div>
        <div class="stat-card">
          <h3>Saved Gigs</h3>
          <div class="stat-value">12</div>
        </div>
      </div>

      <div class="card">
        <div class="card__header">
          <h3>Recent Orders</h3>
        </div>
        <div class="card__body">
          <div class="data-table">
            <table>
              <thead>
                <tr>
                  <th>Gig</th>
                  <th>Freelancer</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Logo Design</td>
                  <td>John Developer</td>
                  <td><span class="status status--success">Completed</span></td>
                  <td>$150</td>
                  <td><button class="btn btn--sm btn--outline">View</button></td>
                </tr>
                <tr>
                  <td>Web Development</td>
                  <td>Emma Designer</td>
                  <td><span class="status status--warning">In Progress</span></td>
                  <td>$500</td>
                  <td><button class="btn btn--sm btn--outline">View</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  renderAdminDashboard(content) {
    content.innerHTML = `
      <div class="dashboard-stats">
        <div class="stat-card">
          <h3>Total Users</h3>
          <div class="stat-value">${this.sampleData.analytics.totalUsers.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <h3>Active Gigs</h3>
          <div class="stat-value">${this.sampleData.analytics.activeGigs.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <h3>Monthly Revenue</h3>
          <div class="stat-value">$${this.sampleData.analytics.monthlyRevenue.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <h3>Completed Orders</h3>
          <div class="stat-value">${this.sampleData.analytics.completedOrders.toLocaleString()}</div>
        </div>
      </div>

      <div class="chart-container">
        <h3>Platform Analytics</h3>
        <canvas id="analyticsChart"></canvas>
      </div>

      <div class="card">
        <div class="card__header">
          <h3>User Management</h3>
        </div>
        <div class="card__body">
          <div class="data-table">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${this.sampleData.users.map(user => `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: var(--space-8);">
                        <img src="${user.avatar}" alt="${user.name}" style="width: 32px; height: 32px; border-radius: var(--radius-full);">
                        ${user.name}
                      </div>
                    </td>
                    <td>${user.email}</td>
                    <td><span class="status status--info">${user.role}</span></td>
                    <td><span class="status status--success">Active</span></td>
                    <td>
                      <button class="btn btn--sm btn--outline">Edit</button>
                      <button class="btn btn--sm btn--outline">Suspend</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.renderAnalyticsChart();
  }

  switchDashboardTab(tabId, userRole) {
    // Update active nav item
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.classList.remove('active');
    });
    event.target.classList.add('active');

    const content = document.getElementById('dashboardContent');
    
    if (tabId === 'overview') {
      if (userRole === 'freelancer') this.renderFreelancerDashboard(content);
      else if (userRole === 'client') this.renderClientDashboard(content);
      else if (userRole === 'admin') this.renderAdminDashboard(content);
    } else if (tabId === 'messages') {
      this.renderMessagesTab(content);
    } else if (tabId === 'gigs' && userRole === 'freelancer') {
      this.renderMyGigsTab(content);
    }
    // Add more tab handlers as needed
  }

  renderMessagesTab(content) {
    content.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h3>Messages</h3>
        </div>
        <div class="card__body">
          <div class="messages-list">
            ${this.sampleData.messages.map(msg => `
              <div class="message-item" style="padding: var(--space-16); border-bottom: 1px solid var(--color-border); cursor: pointer;">
                <div class="message-header" style="display: flex; justify-content: space-between; margin-bottom: var(--space-8);">
                  <strong>${msg.from}</strong>
                  <span style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                    ${msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div class="message-preview">${msg.message}</div>
              </div>
            `).join('')}
          </div>
          <button class="btn btn--primary mt-16" onclick="app.showChat()">Open Chat</button>
        </div>
      </div>
    `;
  }

  renderMyGigsTab(content) {
    content.innerHTML = `
      <div class="card">
        <div class="card__header flex-between">
          <h3>My Gigs</h3>
          <button class="btn btn--primary" onclick="app.showModal('createGigModal')">Create New Gig</button>
        </div>
        <div class="card__body">
          ${this.renderUserGigsTable()}
        </div>
      </div>
    `;
  }

  renderUserGigsTable() {
    const userGigs = this.getUserGigs();
    
    if (userGigs.length === 0) {
      return '<p style="text-align: center; color: var(--color-text-secondary); padding: var(--space-32);">No gigs created yet. Create your first gig to get started!</p>';
    }

    return `
      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>Gig</th>
              <th>Category</th>
              <th>Price</th>
              <th>Rating</th>
              <th>Orders</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${userGigs.map(gig => `
              <tr>
                <td>
                  <div style="display: flex; align-items: center; gap: var(--space-12);">
                    <img src="${gig.image}" alt="${gig.title}" style="width: 50px; height: 50px; object-fit: cover; border-radius: var(--radius-sm);">
                    <div>
                      <div style="font-weight: var(--font-weight-medium);">${gig.title}</div>
                      <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${gig.description.substring(0, 50)}...</div>
                    </div>
                  </div>
                </td>
                <td>${gig.category}</td>
                <td>$${gig.price}</td>
                <td>⭐ ${gig.rating}</td>
                <td>${gig.reviews}</td>
                <td>
                  <button class="btn btn--sm btn--outline" onclick="app.editGig(${gig.id})">Edit</button>
                  <button class="btn btn--sm btn--outline" onclick="app.deleteGig(${gig.id})">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderProfile() {
    const content = document.getElementById('profileContent');
    const user = this.currentUser;

    content.innerHTML = `
      <div class="profile-header">
        <img src="${user.avatar}" alt="${user.name}" class="profile-avatar">
        <div class="profile-info">
          <h2>${user.name}</h2>
          <p style="color: var(--color-text-secondary);">${user.email}</p>
          <div class="profile-meta">
            ${user.role === 'freelancer' ? `
              <div class="profile-meta-item">
                <div class="profile-meta-value">${user.rating}</div>
                <div class="profile-meta-label">Rating</div>
              </div>
              <div class="profile-meta-item">
                <div class="profile-meta-value">${user.completedOrders}</div>
                <div class="profile-meta-label">Orders</div>
              </div>
            ` : `
              <div class="profile-meta-item">
                <div class="profile-meta-value">$${user.totalSpent?.toLocaleString() || '0'}</div>
                <div class="profile-meta-label">Total Spent</div>
              </div>
              <div class="profile-meta-item">
                <div class="profile-meta-value">${user.activeOrders || 0}</div>
                <div class="profile-meta-label">Active Orders</div>
              </div>
            `}
          </div>
          ${user.skills && user.skills.length > 0 ? `
            <div class="profile-skills">
              ${user.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>

      <div class="card">
        <div class="card__header">
          <h3>Edit Profile</h3>
        </div>
        <div class="card__body">
          <form id="profileForm">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" class="form-control" value="${user.name}" id="profileName">
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-control" value="${user.email}" id="profileEmail">
            </div>
            ${user.role === 'freelancer' ? `
              <div class="form-group">
                <label class="form-label">Skills (comma separated)</label>
                <input type="text" class="form-control" value="${user.skills?.join(', ') || ''}" id="profileSkills">
              </div>
            ` : ''}
            <button type="submit" class="btn btn--primary">Update Profile</button>
          </form>
        </div>
      </div>
    `;

    document.getElementById('profileForm').addEventListener('submit', (e) => this.updateProfile(e));
  }

  // Chart rendering methods
  renderEarningsChart() {
    const ctx = document.getElementById('earningsChart');
    if (!ctx) return;
    
    // Simulated earnings data
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Earnings',
          data: [1200, 1900, 1500, 2200, 2800, 2450],
          borderColor: '#1FB8CD',
          backgroundColor: 'rgba(31, 184, 205, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value;
              }
            }
          }
        }
      }
    });
  }

  renderAnalyticsChart() {
    const ctx = document.getElementById('analyticsChart');
    if (!ctx) return;
    
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Users', 'Gigs', 'Orders', 'Revenue'],
        datasets: [{
          label: 'Platform Metrics',
          data: [12500, 3200, 8750, 125000],
          backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#5D878F']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  // Utility Methods
  getUserGigs() {
    return this.sampleData.gigs.filter(gig => gig.freelancerId === this.currentUser?.id);
  }

  performSearch() {
    const query = document.getElementById('heroSearch').value.trim();
    if (query) {
      this.showGigs();
      // Simulate search
      setTimeout(() => {
        document.getElementById('gigSearch').value = query;
        this.filterGigs();
      }, 100);
    }
  }

  filterGigs() {
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const priceFilter = document.getElementById('priceFilter')?.value || '';
    const searchQuery = document.getElementById('gigSearch')?.value.toLowerCase() || '';

    let filteredGigs = this.sampleData.gigs;

    if (categoryFilter) {
      filteredGigs = filteredGigs.filter(gig => gig.category === categoryFilter);
    }

    if (priceFilter) {
      const [min, max] = priceFilter.split('-').map(p => p.replace('+', ''));
      filteredGigs = filteredGigs.filter(gig => {
        if (max) {
          return gig.price >= parseInt(min) && gig.price <= parseInt(max);
        } else {
          return gig.price >= parseInt(min);
        }
      });
    }

    if (searchQuery) {
      filteredGigs = filteredGigs.filter(gig => 
        gig.title.toLowerCase().includes(searchQuery) ||
        gig.description.toLowerCase().includes(searchQuery) ||
        gig.category.toLowerCase().includes(searchQuery)
      );
    }

    const grid = document.getElementById('allGigs');
    grid.innerHTML = '';

    if (filteredGigs.length === 0) {
      grid.innerHTML = '<div class="text-center" style="grid-column: 1 / -1; padding: var(--space-32);">No gigs found matching your criteria.</div>';
      return;
    }

    filteredGigs.forEach(gig => {
      grid.appendChild(this.createGigCard(gig));
    });
  }

  // Modal Methods
  showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
    
    if (modalId === 'createGigModal') {
      // Populate category dropdown
      const categorySelect = document.getElementById('gigCategory');
      categorySelect.innerHTML = '<option value="">Select category</option>';
      this.sampleData.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = category.name;
        categorySelect.appendChild(option);
      });
    }
  }

  hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
  }

  handleCreateGig(e) {
    e.preventDefault();
    
    if (!this.currentUser || this.currentUser.role !== 'freelancer') {
      this.showToast('Only freelancers can create gigs', 'error');
      return;
    }

    const title = document.getElementById('gigTitle').value;
    const description = document.getElementById('gigDescription').value;
    const category = document.getElementById('gigCategory').value;
    const price = parseInt(document.getElementById('gigPrice').value);

    const newGig = {
      id: this.sampleData.gigs.length + 1,
      title,
      description,
      category,
      price,
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop",
      freelancerId: this.currentUser.id,
      freelancer: this.currentUser.name,
      rating: 0,
      reviews: 0,
      featured: false
    };

    this.sampleData.gigs.push(newGig);
    this.hideModal('createGigModal');
    this.showToast('Gig created successfully!', 'success');
    
    // Reset form
    document.getElementById('createGigForm').reset();
    
    // Refresh dashboard if we're on it
    if (this.currentPage === 'dashboard') {
      this.renderDashboard();
    }
  }

  // Chat Methods
  showChat() {
    document.getElementById('chatWidget').classList.remove('hidden');
    this.renderChatMessages();
  }

  hideChat() {
    document.getElementById('chatWidget').classList.add('hidden');
  }

  renderChatMessages() {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';

    this.sampleData.messages.forEach(msg => {
      const messageDiv = document.createElement('div');
      messageDiv.className = `chat-message ${msg.sent ? 'sent' : 'received'}`;
      messageDiv.textContent = msg.message;
      container.appendChild(messageDiv);
    });

    container.scrollTop = container.scrollHeight;
  }

  sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;

    const newMessage = {
      id: this.sampleData.messages.length + 1,
      from: 'You',
      message,
      timestamp: new Date(),
      sent: true
    };

    this.sampleData.messages.push(newMessage);
    input.value = '';
    this.renderChatMessages();

    // Simulate response
    setTimeout(() => {
      const response = {
        id: this.sampleData.messages.length + 1,
        from: 'John Developer',
        message: 'Thanks for your message! I\'ll get back to you soon.',
        timestamp: new Date(),
        sent: false
      };
      this.sampleData.messages.push(response);
      this.renderChatMessages();
    }, 1000);
  }

  // Other Methods
  orderGig(gigId) {
    if (!this.currentUser) {
      this.showAuth('login');
      return;
    }

    if (this.currentUser.role === 'freelancer') {
      this.showToast('Freelancers cannot order their own gigs', 'error');
      return;
    }

    this.showToast('Order placed successfully! You will be contacted by the freelancer soon.', 'success');
  }

  updateProfile(e) {
    e.preventDefault();
    
    const name = document.getElementById('profileName').value;
    const email = document.getElementById('profileEmail').value;
    const skills = document.getElementById('profileSkills')?.value.split(',').map(s => s.trim()).filter(s => s) || [];

    this.currentUser.name = name;
    this.currentUser.email = email;
    if (skills.length > 0) {
      this.currentUser.skills = skills;
    }

    sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    this.showToast('Profile updated successfully!', 'success');
    this.renderProfile();
    this.updateAuthUI(); // Update avatar display in header
  }

  editGig(gigId) {
    this.showToast('Edit functionality would be implemented here', 'info');
  }

  deleteGig(gigId) {
    if (confirm('Are you sure you want to delete this gig?')) {
      this.sampleData.gigs = this.sampleData.gigs.filter(gig => gig.id !== gigId);
      this.showToast('Gig deleted successfully', 'success');
      this.renderDashboard();
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div>${message}</div>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }

  showLoading() {
    document.getElementById('loading').classList.remove('hidden');
  }

  hideLoading() {
    document.getElementById('loading').classList.add('hidden');
  }
}

// Initialize the application
const app = new FreelanceHub();

// Load Chart.js
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
document.head.appendChild(script);