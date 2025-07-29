
class RoomManager {
    constructor() {
        this.rooms = [];
        this.filteredRooms = [];
        this.editingRoom = null;

        this.initializeElements();
        this.bindEvents();
        this.loadRooms();
    }

    initializeElements() {
        this.roomsGrid = document.getElementById('rooms-grid');
        this.searchInput = document.getElementById('search-input');
        this.loadingDiv = document.getElementById('loading');
        this.noRoomsDiv = document.getElementById('no-rooms');
        this.alertContainer = document.getElementById('alert-container');
        this.modal = document.getElementById('room-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.roomForm = document.getElementById('room-form');


        this.addRoomBtn = document.getElementById('add-room-btn');
        this.modalClose = document.getElementById('modal-close');
        this.cancelBtn = document.getElementById('cancel-btn');
        this.saveBtn = document.getElementById('save-btn');


        this.totalRoomsEl = document.getElementById('total-rooms');
        this.avgPriceEl = document.getElementById('avg-price');
        this.minPriceEl = document.getElementById('min-price');
        this.maxPriceEl = document.getElementById('max-price');
    }

    bindEvents() {
        this.searchInput.addEventListener('input', () => this.filterRooms());
        this.addRoomBtn.addEventListener('click', () => this.openAddModal());
        this.modalClose.addEventListener('click', () => this.closeModal());
        this.cancelBtn.addEventListener('click', () => this.closeModal());
        this.roomForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });
    }

    async loadRooms() {
        this.showLoading(true);
        try {
            const response = await fetch(window.roomsApiUrl);
            const data = await response.json();

            this.rooms = data.rooms || [];
            this.filteredRooms = [...this.rooms];
            this.renderRooms();
            this.updateStats();
        } catch (error) {
            console.error('Error loading rooms:', error);
            this.showAlert('Failed to load rooms. Please try again.', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    renderRooms() {
        if (this.filteredRooms.length === 0) {
            this.roomsGrid.innerHTML = '';
            this.noRoomsDiv.style.display = 'block';
            return;
        }

        this.noRoomsDiv.style.display = 'none';

        this.roomsGrid.innerHTML = this.filteredRooms.map(room => `
            <div class="room-card" data-room-id="${room.id}">
                <div class="room-header">
                    <h3 class="room-id">Room ${room.id}</h3>
                </div>
                <div class="room-body">
                    <div class="room-detail">
                        <label>Beds:</label>
                        <span>${room.number_of_beds}</span>
                    </div>
                    <div class="room-detail">
                        <label>Price:</label>
                        <span class="price">$${parseFloat(room.price_per_night).toFixed(2)}/night</span>
                    </div>
                    <div class="room-detail">
                        <label>Amenities:</label>
                        <span class="amenities" title="${room.amenities}">${room.amenities}</span>
                    </div>
                    <div class="room-actions">
                        <button class="btn btn-warning btn-small" onclick="roomManager.editRoom(${room.id})">
                            Edit
                        </button>
                        <button class="btn btn-primary btn-small" onclick="roomManager.viewReservations(${room.id})">
                            Reservations
                        </button>
                        <button class="btn btn-danger btn-small" onclick="roomManager.deleteRoom(${room.id})">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    filterRooms() {
        const searchTerm = this.searchInput.value.toLowerCase().trim();

        if (!searchTerm) {
            this.filteredRooms = [...this.rooms];
        } else {
            this.filteredRooms = this.rooms.filter(room => {
                return (
                    room.id.toString().includes(searchTerm) ||
                    room.amenities.toLowerCase().includes(searchTerm) ||
                    room.price_per_night.toString().includes(searchTerm) ||
                    room.number_of_beds.toString().includes(searchTerm)
                );
            });
        }

        this.renderRooms();
    }

    updateStats() {
        if (this.rooms.length === 0) {
            this.totalRoomsEl.textContent = '0';
            this.avgPriceEl.textContent = '$0';
            this.minPriceEl.textContent = '$0';
            this.maxPriceEl.textContent = '$0';
            return;
        }

        const prices = this.rooms.map(room => parseFloat(room.price_per_night));
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        this.totalRoomsEl.textContent = this.rooms.length;
        this.avgPriceEl.textContent = `$${avgPrice.toFixed(2)}`;
        this.minPriceEl.textContent = `$${minPrice.toFixed(2)}`;
        this.maxPriceEl.textContent = `$${maxPrice.toFixed(2)}`;
    }

    openAddModal() {
        this.editingRoom = null;
        this.modalTitle.textContent = 'Add New Room';
        this.saveBtn.textContent = 'Add Room';
        this.roomForm.reset();
        this.modal.classList.add('active');
        document.getElementById('number_of_beds').focus();
    }

    editRoom(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) return;

        this.editingRoom = room;
        this.modalTitle.textContent = `Edit Room ${room.id}`;
        this.saveBtn.textContent = 'Update Room';

        document.getElementById('number_of_beds').value = room.number_of_beds;
        document.getElementById('price_per_night').value = room.price_per_night;
        document.getElementById('amenities').value = room.amenities;

        this.modal.classList.add('active');
    }

    closeModal() {
        this.modal.classList.remove('active');
        this.editingRoom = null;
        this.roomForm.reset();
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        const formData = new FormData(this.roomForm);
        const roomData = {
            number_of_beds: parseInt(formData.get('number_of_beds')),
            price_per_night: parseFloat(formData.get('price_per_night')),
            amenities: formData.get('amenities').trim()
        };
        if (roomData.number_of_beds < 1 || roomData.number_of_beds > 5) {
            this.showAlert('Number of beds must be between 1 and 5.', 'danger');
            return;
        }

        if (roomData.price_per_night <= 0) {
            this.showAlert('Price must be greater than 0.', 'danger');
            return;
        }

        if (!roomData.amenities) {
            this.showAlert('Amenities cannot be empty.', 'danger');
            return;
        }

        try {
            this.saveBtn.disabled = true;
            this.saveBtn.textContent = this.editingRoom ? 'Updating...' : 'Adding...';

            let response;
            if (this.editingRoom) {
                response = await fetch(`${window.managerRoomsApiUrl}/${this.editingRoom.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(roomData)
                });
            } else {
                response = await fetch(window.managerRoomsApiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(roomData)
                });
            }

            const result = await response.json();

            if (result.success) {
                this.showAlert(result.message, 'success');
                this.closeModal();
                await this.loadRooms();
            } else {
                this.showAlert(result.error, 'danger');
            }
        } catch (error) {
            console.error('Error saving room:', error);
            this.showAlert('Failed to save room. Please try again.', 'danger');
        } finally {
            this.saveBtn.disabled = false;
            this.saveBtn.textContent = this.editingRoom ? 'Update Room' : 'Add Room';
        }
    }

    async deleteRoom(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) return;

        if (!confirm(`Are you sure you want to delete Room ${room.id}?\n\nThis action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`${window.managerRoomsApiUrl}/${roomId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert(result.message, 'success');
                await this.loadRooms();
            } else {
                this.showAlert(result.error, 'danger');
            }
        } catch (error) {
            console.error('Error deleting room:', error);
            this.showAlert('Failed to delete room. Please try again.', 'danger');
        }
    }

    async viewReservations(roomId) {
        try {
            const response = await fetch(`${window.managerRoomsApiUrl}/${roomId}/reservations`);
            const result = await response.json();

            if (result.success) {
                this.showReservationsModal(roomId, result.reservations);
            } else {
                this.showAlert(result.error, 'danger');
            }
        } catch (error) {
            console.error('Error loading reservations:', error);
            this.showAlert('Failed to load reservations. Please try again.', 'danger');
        }
    }

    showReservationsModal(roomId, reservations) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">Room ${roomId} Reservations</h2>
                    <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div style="max-height: 400px; overflow-y: auto;">
                    ${reservations.length === 0 ?
                '<p style="text-align: center; padding: 20px; color: #666;">No reservations found for this room.</p>' :
                `<table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f8f9fa;">
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Customer</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Check-in</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Check-out</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${reservations.map(res => `
                                    <tr>
                                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${res.customer_name}</td>
                                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${this.formatDate(res.start_date)}</td>
                                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${this.formatDate(res.end_date)}</td>
                                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${res.total_cost.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>`
            }
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    showLoading(show) {
        this.loadingDiv.style.display = show ? 'block' : 'none';
        this.roomsGrid.style.display = show ? 'none' : 'grid';
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;

        this.alertContainer.innerHTML = '';
        this.alertContainer.appendChild(alertDiv);
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.roomManager = new RoomManager();
});