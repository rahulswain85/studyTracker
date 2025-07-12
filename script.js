// Daily Study Tracker - Main JavaScript File

class StudyTracker {
    constructor() {
        this.studyLogs = this.loadFromLocalStorage();
        this.filteredLogs = [...this.studyLogs];
        this.init();
    }

    // Initialize the application
    init() {
        this.setupEventListeners();
        this.setDefaultDate();
        this.updateSummary();
        this.renderLogs();
        this.updateFilters();
        this.renderCharts();
    }

    // Setup all event listeners
    setupEventListeners() {
        // Form submission
        const form = document.getElementById('studyForm');
        form.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Filter events
        document.getElementById('filterSubject').addEventListener('change', () => this.applyFilters());
        document.getElementById('filterDate').addEventListener('change', () => this.applyFilters());
        document.getElementById('clearFilters').addEventListener('click', () => this.clearFilters());

        // Action buttons
        document.getElementById('exportCSV').addEventListener('click', () => this.exportToCSV());
        document.getElementById('clearAll').addEventListener('click', () => this.showClearAllConfirmation());

        // Modal events
        document.getElementById('confirmYes').addEventListener('click', () => this.handleModalConfirm());
        document.getElementById('confirmNo').addEventListener('click', () => this.hideModal());
        
        // Close modal when clicking outside
        document.getElementById('confirmModal').addEventListener('click', (e) => {
            if (e.target.id === 'confirmModal') {
                this.hideModal();
            }
        });
    }

    // Set default date to today
    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    // Handle form submission
    handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const studySession = {
            id: Date.now().toString(),
            subject: formData.get('subject').trim(),
            duration: parseInt(formData.get('duration')),
            timeUnit: formData.get('timeUnit'),
            date: formData.get('date'),
            notes: formData.get('notes').trim(),
            timestamp: new Date().toISOString()
        };

        // Validate input
        if (!studySession.subject || studySession.duration <= 0) {
            this.showNotification('Please fill in all required fields correctly.', 'error');
            return;
        }

        // Add to logs
        this.studyLogs.unshift(studySession);
        this.saveToLocalStorage();
        this.updateSummary();
        this.renderLogs();
        this.updateFilters();
        this.renderCharts();

        // Reset form
        e.target.reset();
        this.setDefaultDate();
        
        this.showNotification('Study session added successfully!', 'success');
    }

    // Render study logs
    renderLogs() {
        const container = document.getElementById('logsContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (this.filteredLogs.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        
        container.innerHTML = this.filteredLogs.map(log => this.createLogCard(log)).join('');
        
        // Add delete event listeners
        this.filteredLogs.forEach(log => {
            const deleteBtn = document.querySelector(`[data-delete-id="${log.id}"]`);
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.deleteLog(log.id));
            }
        });
    }

    // Create log card HTML
    createLogCard(log) {
        const durationInMinutes = log.timeUnit === 'hours' ? log.duration * 60 : log.duration;
        const formattedDate = new Date(log.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        return `
            <div class="log-card fade-in" data-log-id="${log.id}">
                <div class="log-header">
                    <div class="log-subject">${this.escapeHtml(log.subject)}</div>
                    <div class="log-duration">${log.duration} ${log.timeUnit}</div>
                </div>
                
                <div class="log-details">
                    <div class="log-detail">
                        <div class="log-detail-label">Date</div>
                        <div class="log-detail-value">${formattedDate}</div>
                    </div>
                    <div class="log-detail">
                        <div class="log-detail-label">Duration (minutes)</div>
                        <div class="log-detail-value">${durationInMinutes}</div>
                    </div>
                    <div class="log-detail">
                        <div class="log-detail-label">Added</div>
                        <div class="log-detail-value">${new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                </div>
                
                ${log.notes ? `<div class="log-notes">${this.escapeHtml(log.notes)}</div>` : ''}
                
                <div class="log-actions">
                    <button class="btn btn-danger" data-delete-id="${log.id}">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }

    // Delete a log entry
    deleteLog(id) {
        this.studyLogs = this.studyLogs.filter(log => log.id !== id);
        this.saveToLocalStorage();
        this.updateSummary();
        this.renderLogs();
        this.updateFilters();
        this.renderCharts();
        this.showNotification('Study session deleted successfully!', 'success');
    }

    // Apply filters
    applyFilters() {
        const subjectFilter = document.getElementById('filterSubject').value;
        const dateFilter = document.getElementById('filterDate').value;
        
        this.filteredLogs = this.studyLogs.filter(log => {
            const subjectMatch = !subjectFilter || log.subject.toLowerCase().includes(subjectFilter.toLowerCase());
            const dateMatch = !dateFilter || log.date === dateFilter;
            return subjectMatch && dateMatch;
        });
        
        this.renderLogs();
    }

    // Clear all filters
    clearFilters() {
        document.getElementById('filterSubject').value = '';
        document.getElementById('filterDate').value = '';
        this.filteredLogs = [...this.studyLogs];
        this.renderLogs();
    }

    // Update filter options
    updateFilters() {
        const subjects = [...new Set(this.studyLogs.map(log => log.subject))].sort();
        const filterSelect = document.getElementById('filterSubject');
        
        // Keep the "All Subjects" option
        filterSelect.innerHTML = '<option value="">All Subjects</option>';
        
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            filterSelect.appendChild(option);
        });
    }

    // Update summary statistics
    updateSummary() {
        const today = new Date().toISOString().split('T')[0];
        const todayLogs = this.studyLogs.filter(log => log.date === today);
        const weekLogs = this.getWeekLogs();
        
        const todayTotal = this.calculateTotalMinutes(todayLogs);
        const weekTotal = this.calculateTotalMinutes(weekLogs);
        
        document.getElementById('todayTotal').textContent = this.formatDuration(todayTotal);
        document.getElementById('weekTotal').textContent = this.formatDuration(weekTotal);
        document.getElementById('totalSessions').textContent = this.studyLogs.length;
    }

    // Get logs from the current week
    getWeekLogs() {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        return this.studyLogs.filter(log => {
            const logDate = new Date(log.date);
            return logDate >= startOfWeek;
        });
    }

    // Calculate total minutes from logs
    calculateTotalMinutes(logs) {
        return logs.reduce((total, log) => {
            const minutes = log.timeUnit === 'hours' ? log.duration * 60 : log.duration;
            return total + minutes;
        }, 0);
    }

    // Format duration in minutes to readable format
    formatDuration(minutes) {
        if (minutes < 60) {
            return `${minutes} min`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }

    // Render charts
    renderCharts() {
        this.renderSubjectChart();
        this.renderDailyChart();
    }

    // Render subject breakdown chart
    renderSubjectChart() {
        const canvas = document.getElementById('subjectChart');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (this.studyLogs.length === 0) {
            this.drawEmptyChart(ctx, canvas.width, canvas.height, 'No data available');
            return;
        }

        // Group by subject
        const subjectData = {};
        this.studyLogs.forEach(log => {
            const minutes = log.timeUnit === 'hours' ? log.duration * 60 : log.duration;
            subjectData[log.subject] = (subjectData[log.subject] || 0) + minutes;
        });

        const subjects = Object.keys(subjectData);
        const values = Object.values(subjectData);
        
        if (subjects.length === 0) return;

        // Calculate chart dimensions
        const padding = 40;
        const chartWidth = canvas.width - 2 * padding;
        const chartHeight = canvas.height - 2 * padding;
        
        // Find max value for scaling
        const maxValue = Math.max(...values);
        
        // Colors for bars
        const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];
        
        // Draw bars
        const barWidth = chartWidth / subjects.length;
        subjects.forEach((subject, index) => {
            const barHeight = (values[index] / maxValue) * chartHeight;
            const x = padding + index * barWidth;
            const y = canvas.height - padding - barHeight;
            
            // Draw bar
            ctx.fillStyle = colors[index % colors.length];
            ctx.fillRect(x + 5, y, barWidth - 10, barHeight);
            
            // Draw label
            ctx.fillStyle = '#2d3748';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(subject.substring(0, 8), x + barWidth / 2, canvas.height - 10);
            
            // Draw value
            ctx.fillText(this.formatDuration(values[index]), x + barWidth / 2, y - 5);
        });
    }

    // Render daily progress chart
    renderDailyChart() {
        const canvas = document.getElementById('dailyChart');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (this.studyLogs.length === 0) {
            this.drawEmptyChart(ctx, canvas.width, canvas.height, 'No data available');
            return;
        }

        // Get last 7 days
        const dates = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }

        // Calculate daily totals
        const dailyData = dates.map(date => {
            const dayLogs = this.studyLogs.filter(log => log.date === date);
            return this.calculateTotalMinutes(dayLogs);
        });

        // Calculate chart dimensions
        const padding = 40;
        const chartWidth = canvas.width - 2 * padding;
        const chartHeight = canvas.height - 2 * padding;
        
        // Find max value for scaling
        const maxValue = Math.max(...dailyData, 1);
        
        // Draw line chart
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        dates.forEach((date, index) => {
            const x = padding + (index / (dates.length - 1)) * chartWidth;
            const y = canvas.height - padding - (dailyData[index] / maxValue) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            // Draw point
            ctx.fillStyle = '#667eea';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        ctx.stroke();
        
        // Draw labels
        ctx.fillStyle = '#2d3748';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        dates.forEach((date, index) => {
            const x = padding + (index / (dates.length - 1)) * chartWidth;
            const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
            ctx.fillText(dayName, x, canvas.height - 10);
        });
    }

    // Draw empty chart message
    drawEmptyChart(ctx, width, height, message) {
        ctx.fillStyle = '#718096';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(message, width / 2, height / 2);
    }

    // Export data to CSV
    exportToCSV() {
        if (this.studyLogs.length === 0) {
            this.showNotification('No data to export.', 'error');
            return;
        }

        const headers = ['Subject', 'Duration', 'Time Unit', 'Date', 'Notes', 'Timestamp'];
        const csvContent = [
            headers.join(','),
            ...this.studyLogs.map(log => [
                `"${log.subject}"`,
                log.duration,
                log.timeUnit,
                log.date,
                `"${log.notes || ''}"`,
                log.timestamp
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `study-tracker-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Data exported successfully!', 'success');
    }

    // Show clear all confirmation
    showClearAllConfirmation() {
        this.showModal('Are you sure you want to delete all study sessions? This action cannot be undone.');
        this.currentAction = 'clearAll';
    }

    // Handle modal confirmation
    handleModalConfirm() {
        if (this.currentAction === 'clearAll') {
            this.studyLogs = [];
            this.saveToLocalStorage();
            this.updateSummary();
            this.renderLogs();
            this.updateFilters();
            this.renderCharts();
            this.showNotification('All study sessions cleared!', 'success');
        }
        this.hideModal();
    }

    // Show modal
    showModal(message) {
        document.getElementById('modalMessage').textContent = message;
        document.getElementById('confirmModal').classList.add('show');
    }

    // Hide modal
    hideModal() {
        document.getElementById('confirmModal').classList.remove('show');
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        // Set background color based on type
        const colors = {
            success: '#48bb78',
            error: '#e53e3e',
            info: '#667eea'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Local storage methods
    saveToLocalStorage() {
        try {
            localStorage.setItem('studyTrackerData', JSON.stringify(this.studyLogs));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }

    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem('studyTrackerData');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return [];
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StudyTracker();
}); 