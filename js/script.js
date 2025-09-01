
// Classe principal para gerenciar as ideias
class IdeaManager {
    constructor() {
        this.ideas = [];
        this.currentFilter = 'today';
        this.editingId = null;
        this.apiBaseUrl = 'http://localhost:5000/api';

        this.init();
    }

    async init() {
        this.displayDate();
        await this.loadIdeas();
        this.setupEventListeners();
        this.updateStats();
        this.renderChart();
    }

    displayDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date();
        document.getElementById('currentDate').textContent = today.toLocaleDateString('pt-BR', options);
    }

    async loadIdeas() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/ideas`);
            if (!response.ok) throw new Error('Erro ao carregar ideias');

            this.ideas = await response.json();
            this.renderIdeas();
        } catch (error) {
            console.error('Erro:', error);
            this.showNotification('Erro ao carregar ideias', 'error');
        }
    }

    renderIdeas() {
        const container = document.getElementById('ideasContainer');
        const emptyState = document.getElementById('emptyState');

        // Filtrar ideias baseado no filtro atual
        let filteredIdeas = [];
        if (this.currentFilter === 'today') {
            const today = new Date().toISOString().split('T')[0];
            filteredIdeas = this.ideas.filter(idea => idea.date.startsWith(today));
        } else {
            filteredIdeas = this.ideas;
        }

        // Limpar container
        container.innerHTML = '';

        // Mostrar empty state se não houver ideias
        if (filteredIdeas.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        // Adicionar ideias ao container
        filteredIdeas.forEach(idea => {
            const ideaElement = this.createIdeaElement(idea);
            container.appendChild(ideaElement);
        });
    }

    createIdeaElement(idea) {
        const ideaBox = document.createElement('div');
        ideaBox.className = `idea-box ${idea.completed ? 'completed' : ''}`;
        ideaBox.dataset.id = idea.id;

        const ideaDate = new Date(idea.date);
        const formattedDate = ideaDate.toLocaleDateString('pt-BR');

        ideaBox.innerHTML = `
                    <div class="checkbox-container">
                        <input type="checkbox" ${idea.completed ? 'checked' : ''} class="complete-checkbox">
                    </div>
                    <h3>${idea.title}</h3>
                    <p>${idea.content}</p>
                    <div class="idea-meta">
                        <span>${formattedDate}</span>
                        <span>${this.getCategoryLabel(idea.category)}</span>
                    </div>
                    <div class="idea-actions">
                        <button class="action-btn edit"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete"><i class="fas fa-trash"></i></button>
                    </div>
                `;

        // Adicionar event listeners para os botões
        ideaBox.querySelector('.complete-checkbox').addEventListener('change', (e) => {
            this.toggleComplete(idea.id, e.target.checked);
        });

        ideaBox.querySelector('.edit').addEventListener('click', () => {
            this.openEditModal(idea.id);
        });

        ideaBox.querySelector('.delete').addEventListener('click', () => {
            this.deleteIdea(idea.id);
        });

        return ideaBox;
    }

    getCategoryLabel(category) {
        const labels = {
            'meta': 'Meta',
            'pensamento': 'Pensamento',
            'ideia': 'Ideia',
            'lembrete': 'Lembrete'
        };

        return labels[category] || 'Outro';
    }

    async addIdea(title, content, category) {
        try {
            const newIdea = {
                title,
                content,
                category,
                date: new Date().toISOString(),
                completed: false
            };

            const response = await fetch(`${this.apiBaseUrl}/ideas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newIdea)
            });

            if (!response.ok) throw new Error('Erro ao adicionar ideia');

            this.showNotification('Ideia adicionada com sucesso!', 'success');

            // Recarregar a lista de ideias
            await this.loadIdeas();
            this.updateStats();
            this.renderChart();

            // Limpar formulário
            document.getElementById('ideaTitle').value = '';
            document.getElementById('ideaContent').value = '';
        } catch (error) {
            console.error('Erro:', error);
            this.showNotification('Erro ao adicionar ideia', 'error');
        }
    }

    async editIdea(id, title, content, category) {
        try {
            const updatedIdea = {
                title,
                content,
                category
            };

            const response = await fetch(`${this.apiBaseUrl}/ideas/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedIdea)
            });

            if (!response.ok) throw new Error('Erro ao editar ideia');

            this.showNotification('Ideia atualizada com sucesso!', 'success');

            // Recarregar a lista de ideias
            await this.loadIdeas();
            this.updateStats();
        } catch (error) {
            console.error('Erro:', error);
            this.showNotification('Erro ao editar ideia', 'error');
        }
    }

    async deleteIdea(id) {
        if (!confirm('Tem certeza que deseja excluir esta ideia?')) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/ideas/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Erro ao excluir ideia');

            this.showNotification('Ideia excluída com sucesso!', 'success');

            // Recarregar a lista de ideias
            await this.loadIdeas();
            this.updateStats();
            this.renderChart();
        } catch (error) {
            console.error('Erro:', error);
            this.showNotification('Erro ao excluir ideia', 'error');
        }
    }

    async toggleComplete(id, completed) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/ideas/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ completed })
            });

            if (!response.ok) throw new Error('Erro ao atualizar ideia');

            // Recarregar a lista de ideias
            await this.loadIdeas();
            this.updateStats();
            this.renderChart();
        } catch (error) {
            console.error('Erro:', error);
            this.showNotification('Erro ao atualizar ideia', 'error');
        }
    }

    openEditModal(id) {
        const idea = this.ideas.find(idea => idea.id === id);

        if (idea) {
            this.editingId = id;
            document.getElementById('editTitle').value = idea.title;
            document.getElementById('editContent').value = idea.content;
            document.getElementById('editCategory').value = idea.category;

            document.getElementById('editModal').style.display = 'flex';
        }
    }

    closeEditModal() {
        this.editingId = null;
        document.getElementById('editModal').style.display = 'none';
    }

    updateStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayIdeas = this.ideas.filter(idea => idea.date.startsWith(today));
        const completedIdeas = this.ideas.filter(idea => idea.completed);

        document.getElementById('todayCount').textContent = todayIdeas.length;
        document.getElementById('totalCount').textContent = this.ideas.length;
        document.getElementById('completedCount').textContent = completedIdeas.length;

        const completionRate = this.ideas.length > 0
            ? Math.round((completedIdeas.length / this.ideas.length) * 100)
            : 0;
        document.getElementById('completionRate').textContent = `${completionRate}%`;
    }

    renderChart() {
        const ctx = document.getElementById('progressChart').getContext('2d');

        // Calcular dados da semana
        const weekData = this.getWeekData();

        if (window.progressChart) {
            window.progressChart.destroy();
        }

        window.progressChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: weekData.labels,
                datasets: [{
                    label: 'Ideias por Dia',
                    data: weekData.data,
                    backgroundColor: 'rgba(109, 93, 202, 0.7)',
                    borderColor: 'rgba(109, 93, 202, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    getWeekData() {
        const result = {
            labels: [],
            data: []
        };

        // Gerar os últimos 7 dias
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);

            const dateString = date.toISOString().split('T')[0];
            const label = date.toLocaleDateString('pt-BR', { weekday: 'short' });

            const ideasCount = this.ideas.filter(idea => {
                return idea.date.startsWith(dateString);
            }).length;

            result.labels.push(label);
            result.data.push(ideasCount);
        }

        return result;
    }

    showNotification(message, type) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    setupEventListeners() {
        // Adicionar nova ideia
        document.getElementById('addIdeaBtn').addEventListener('click', () => {
            const title = document.getElementById('ideaTitle').value.trim();
            const content = document.getElementById('ideaContent').value.trim();
            const category = document.getElementById('ideaCategory').value;

            if (title && content) {
                this.addIdea(title, content, category);
            } else {
                this.showNotification('Por favor, preencha o título e o conteúdo da ideia.', 'error');
            }
        });

        // Filtros
        document.getElementById('todayBtn').addEventListener('click', () => {
            this.currentFilter = 'today';
            this.renderIdeas();
        });

        document.getElementById('allBtn').addEventListener('click', () => {
            this.currentFilter = 'all';
            this.renderIdeas();
        });

        // Modal de edição
        document.querySelector('.close').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('saveEdit').addEventListener('click', () => {
            const title = document.getElementById('editTitle').value.trim();
            const content = document.getElementById('editContent').value.trim();
            const category = document.getElementById('editCategory').value;

            if (title && content) {
                this.editIdea(this.editingId, title, content, category);
                this.closeEditModal();
            } else {
                this.showNotification('Por favor, preencha o título e o conteúdo da ideia.', 'error');
            }
        });

        // Fechar modal clicando fora dele
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('editModal');
            if (e.target === modal) {
                this.closeEditModal();
            }
        });
    }
}

// Inicializar a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    const ideaManager = new IdeaManager();
});
