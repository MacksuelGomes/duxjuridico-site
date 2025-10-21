import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, onSnapshot, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDUo2gwbaUkAoKG88e-z7bTc4Jek05XT9o",
  authDomain: "duxjuridico-app2025.firebaseapp.com",
  projectId: "duxjuridico-app2025",
  storageBucket: "duxjuridico-app2025.appspot.com",
  messagingSenderId: "733899747063",
  appId: "1:733899747063:web:8e47c64324e48ffccd2df2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const adminEmail = "macksuelgl@gmail.com";
let unsubscribeProcesses = null; 

document.addEventListener('DOMContentLoaded', function () {
    let state = {
        currentPage: 'main',
        user: null
    };
    
    const pages = {
        main: document.getElementById('main-content'),
        login: document.getElementById('login-page'),
        pricing: document.getElementById('pricing-page'),
        checkout: document.getElementById('checkout-page'),
        enterprise: document.getElementById('enterprise-page'),
        confirmation: document.getElementById('confirmation-page'),
        dashboard: document.getElementById('dashboard-page'),
    };
    const pageHeader = document.getElementById('page-header');
    const adminMenuItem = document.getElementById('admin-menu-item');

    function navigateTo(pageName) {
        state.currentPage = pageName;
        Object.values(pages).forEach(page => page.classList.add('hidden'));
        
        if (pages[pageName]) {
            pages[pageName].classList.remove('hidden');
        } else {
            pages.main.classList.remove('hidden'); 
        }
        
        pageHeader.style.display = (pageName === 'dashboard') ? 'none' : '';
        
        if (pageName === 'dashboard') {
            renderDashboardView('dashboard-view');
        }

        window.scrollTo(0, 0);
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                state.user = { uid: user.uid, email: user.email, ...userDoc.data() };
            } else {
                const workspaceId = `ws_${user.uid}`;
                state.user = { uid: user.uid, email: user.email, role: 'user', workspaceId };
                await setDoc(userDocRef, { email: user.email, role: 'user', createdAt: new Date(), workspaceId: `ws_${user.uid}` });
            }
            
            navigateTo('dashboard');
            
            if (state.user && state.user.workspaceId) {
                if (unsubscribeProcesses) unsubscribeProcesses();
                listenToProcesses(state.user.workspaceId);
            }

        } else {
            state.user = null;
            adminMenuItem.classList.add('hidden');
            if (unsubscribeProcesses) unsubscribeProcesses();
            if (state.currentPage === 'dashboard') {
                navigateTo('main');
            }
        }
    });

    document.getElementById('logo').addEventListener('click', () => navigateTo('main'));
    document.querySelectorAll('#login-btn-desktop, #login-btn-mobile').forEach(btn => btn.addEventListener('click', () => navigateTo('login')));
    document.querySelectorAll('#signup-btn-desktop, #signup-btn-mobile').forEach(btn => btn.addEventListener('click', () => navigateTo('pricing')));
    document.getElementById('back-to-main-from-login').addEventListener('click', () => navigateTo('main'));
    document.getElementById('back-to-main-from-pricing').addEventListener('click', () => navigateTo('main'));
    document.getElementById('back-to-pricing-from-checkout').addEventListener('click', () => navigateTo('pricing'));
    document.getElementById('back-to-pricing-from-enterprise').addEventListener('click', () => navigateTo('pricing'));
    document.getElementById('go-to-signup').addEventListener('click', () => navigateTo('pricing'));
    document.getElementById('go-to-login-from-confirmation').addEventListener('click', () => navigateTo('login'));
    document.getElementById('enterprise-btn').addEventListener('click', () => navigateTo('enterprise'));
    
    const loginForm = document.getElementById('login-form');
    const loginSubmitBtn = document.getElementById('login-submit-btn');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.textContent = 'A entrar...';

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                 navigateTo('dashboard');
            })
            .catch((error) => {
                alert("Erro ao fazer login: " + error.message);
            })
            .finally(() => {
                loginSubmitBtn.disabled = false;
                loginSubmitBtn.textContent = 'Entrar';
            });
    });
    
    // Dashboard Logic
    let processChart = null;
    const pageTitle = document.getElementById('page-title');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const dashboardViews = document.querySelectorAll('.dashboard-view');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = link.dataset.view;
            renderDashboardView(viewId);
        });
    });
    
    document.getElementById('logout-btn').addEventListener('click', () => {
        signOut(auth).catch((error) => {
            console.error("Erro ao fazer logout:", error);
        });
    });

    function renderDashboardView(viewId) {
         sidebarLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewId);
        });

        dashboardViews.forEach(view => {
            view.classList.toggle('hidden', view.id !== viewId);
        });
         
        document.getElementById('process-list-view').classList.remove('hidden');
        document.getElementById('process-detail-view').classList.add('hidden');

        const activeLink = document.querySelector(`.sidebar-link[data-view="${viewId}"]`);
        pageTitle.textContent = activeLink.textContent.trim().replace(/[^a-zA-Zãçõáéíóúâêôà\s]/g, '').trim();


        if (viewId === 'dashboard-view') {
             if (state.user) {
                document.getElementById('welcome-message').textContent = `Bom dia, ${state.user.name || state.user.email}!`;
                if (state.user.role === 'super-admin') {
                    adminMenuItem.classList.remove('hidden');
                } else {
                    adminMenuItem.classList.add('hidden');
                }
            }
            if(!processChart) renderDashboardCharts();
        }
    }
    
    function renderDashboardCharts() {
        document.getElementById('current-date').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const ctx = document.getElementById('processStatusChart').getContext('2d');
        if (processChart) processChart.destroy();
        
        processChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Ativos', 'Suspensos', 'Encerrados'],
                datasets: [{ data: [42, 10, 25], backgroundColor: ['#10B981', '#F59E0B', '#6B7280'], hoverOffset: 4 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    // Processes Module Logic
    const addProcessBtn = document.getElementById('add-process-btn');
    const addProcessModal = document.getElementById('add-process-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const addProcessForm = document.getElementById('add-process-form');
    const processListView = document.getElementById('process-list-view');
    const processDetailView = document.getElementById('process-detail-view');
    const backToProcessListBtn = document.getElementById('back-to-process-list-btn');
    const processTableBody = document.getElementById('process-table-body');
    
    function showModal() {
        addProcessModal.classList.remove('hidden');
        setTimeout(() => {
            addProcessModal.classList.remove('opacity-0');
            addProcessModal.querySelector('.modal-container').classList.remove('scale-95');
        }, 10);
    }
    
    function hideModal() {
        addProcessModal.querySelector('.modal-container').classList.add('scale-95');
        addProcessModal.classList.add('opacity-0');
        setTimeout(() => {
            addProcessModal.classList.add('hidden');
        }, 300);
    }

    addProcessBtn.addEventListener('click', showModal);
    closeModalBtn.addEventListener('click', hideModal);
    cancelModalBtn.addEventListener('click', hideModal);

    addProcessForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!state.user || !state.user.workspaceId) {
            alert("Erro: Não foi possível identificar o seu workspace. Faça login novamente.");
            return;
        }

        const processData = {
            number: addProcessForm.elements['number'].value,
            folder: addProcessForm.elements['folder'].value,
            client: addProcessForm.elements['client'].value,
            opposingParty: addProcessForm.elements['opposingParty'].value,
            area: addProcessForm.elements['area'].value,
            actionType: addProcessForm.elements['actionType'].value,
            value: addProcessForm.elements['value'].value,
            feesType: addProcessForm.elements['feesType'].value,
            feesValue: addProcessForm.elements['feesValue'].value,
            status: addProcessForm.elements['status'].value,
            court: addProcessForm.elements['court'].value,
            distributionDate: addProcessForm.elements['distributionDate'].value,
            lawyer: addProcessForm.elements['lawyer'].value,
            judge: addProcessForm.elements['judge'].value,
            description: addProcessForm.elements['description'].value,
            lastUpdate: new Date().toLocaleDateString('pt-BR'),
            createdAt: new Date(),
        };

        try {
            const workspaceId = state.user.workspaceId;
            await addDoc(collection(db, "workspaces", workspaceId, "processes"), processData);
            addProcessForm.reset();
            hideModal();
        } catch (error) {
            console.error("Erro ao salvar processo: ", error);
            alert("Ocorreu um erro ao salvar o processo.");
        }
    });
    
    function listenToProcesses(workspaceId) {
        if (unsubscribeProcesses) unsubscribeProcesses();

        const processesQuery = query(collection(db, "workspaces", workspaceId, "processes"));
        unsubscribeProcesses = onSnapshot(processesQuery, (querySnapshot) => {
            const processes = [];
            querySnapshot.forEach((doc) => {
                processes.push({ id: doc.id, ...doc.data() });
            });
            renderProcessesTable(processes);
        });
    }
    
    function renderProcessesTable(processes) {
        processTableBody.innerHTML = '';
        if (processes.length === 0) {
            processTableBody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">Nenhum processo encontrado. Adicione um novo para começar.</td></tr>';
            return;
        }

        processes.forEach(proc => {
            const statusColor = proc.status === 'Ativo' ? 'green' : (proc.status === 'Suspenso' ? 'yellow' : 'gray');
            const row = `
                <tr class="hover:bg-gray-50">
                    <td class="p-3 font-medium">${proc.number || 'N/A'}</td>
                    <td class="p-3">${proc.client || 'N/A'}</td>
                    <td class="p-3">${proc.opposingParty || 'N/A'}</td>
                    <td class="p-3"><span class="bg-${statusColor}-100 text-${statusColor}-800 px-2 py-1 rounded-full text-xs font-semibold">${proc.status || 'N/A'}</span></td>
                    <td class="p-3">${proc.lastUpdate || 'N/A'}</td>
                    <td class="p-3"><button class="text-emerald-600 hover:underline font-semibold view-process-details-btn" data-id="${proc.id}">Ver Detalhes</button></td>
                </tr>
            `;
            processTableBody.innerHTML += row;
        });
    }

    processTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('view-process-details-btn')) {
            const processId = e.target.dataset.id;
            if (!state.user || !state.user.workspaceId) return;

            const processDocRef = doc(db, "workspaces", state.user.workspaceId, "processes", processId);
            const processDoc = await getDoc(processDocRef);
            if (processDoc.exists()) {
                showProcessDetails(processDoc.data());
            }
        }
    });
    
    function showProcessDetails(data) {
        processListView.classList.add('hidden');
        processDetailView.classList.remove('hidden');

        document.getElementById('detail-process-number').textContent = data.number || 'Não informado';
        document.getElementById('detail-client').textContent = data.client || 'Não informado';
        document.getElementById('detail-opposing-party').textContent = data.opposingParty || 'Não informado';
        document.getElementById('detail-status').textContent = data.status || 'Não informado';
        document.getElementById('detail-last-update').textContent = data.lastUpdate || 'Não informado';
        document.getElementById('detail-court').textContent = data.court || 'Não informado';
        document.getElementById('detail-description').textContent = data.description || 'Nenhuma descrição fornecida.';
    }
    
    backToProcessListBtn.addEventListener('click', () => {
        processDetailView.classList.add('hidden');
        processListView.classList.remove('hidden');
    });
    
    document.getElementById('grant-trial-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const trialEmailInput = document.getElementById('trial-email');
        const email = trialEmailInput.value;
        const feedbackEl = document.getElementById('trial-feedback');
        
        feedbackEl.textContent = 'A criar utilizador de teste...';
        feedbackEl.classList.remove('text-red-600', 'text-green-600');

        const tempPassword = 'password123';

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
            const user = userCredential.user;

            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 3);
            const workspaceId = `ws_${user.uid}`;

            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                role: 'trial',
                trialEnds: trialEndDate,
                createdAt: new Date(),
                workspaceId: workspaceId
            });
            
            feedbackEl.textContent = `Utilizador de teste criado para ${email} com sucesso! A password temporária é "${tempPassword}".`;
            feedbackEl.classList.add('text-green-600');
            trialEmailInput.value = '';

        } catch (error) {
            console.error("Erro ao criar utilizador de teste:", error);
            feedbackEl.textContent = 'Erro: ' + error.message;
        }
    });

    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('open');
            const icon = card.querySelector('.feature-card-header span');
            icon.style.transform = card.classList.contains('open') ? 'rotate(90deg)' : 'rotate(0deg)';
        });
    });
});

