/**
 * Hotel Reservations Calendar and Booking System
 * Handles calendar display, availability checking, and reservation creation
 */

class ReservationSystem {
    constructor() {
        this.calendar = null;
        this.initializeElements();
        this.bindEvents();
        this.initializeCalendar();
        this.setMinimumDates();
    }

    initializeElements() {
        this.roomSelect = document.getElementById('room_id');
        this.startDateInput = document.getElementById('start_date');
        this.endDateInput = document.getElementById('end_date');
        this.checkAvailabilityBtn = document.getElementById('check-availability');
        this.makeReservationBtn = document.getElementById('make-reservation');
        this.bookingForm = document.getElementById('booking-form');

        this.availabilityInfo = document.getElementById('availability-info');
        this.availabilityMessage = document.getElementById('availability-message');
        this.totalCostDiv = document.getElementById('total-cost');
        this.roomInfo = document.getElementById('room-info');
        this.roomDetails = document.getElementById('room-details');
        this.alertContainer = document.getElementById('alert-container');
    }

    bindEvents() {
        this.roomSelect.addEventListener('change', () => this.handleRoomSelection());

        this.checkAvailabilityBtn.addEventListener('click', () => this.checkAvailability());

        this.bookingForm.addEventListener('submit', (e) => this.handleReservation(e));

        [this.startDateInput, this.endDateInput].forEach(input => {
            input.addEventListener('change', () => {
                if (this.roomSelect.value && this.startDateInput.value && this.endDateInput.value) {
                    this.checkAvailability();
                }
            });
        });
    }

    initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
            },
            height: 'auto',
            events: {
                url: window.calendarEventsUrl,
                method: 'GET',
                failure: () => {
                    this.showAlert('There was an error while fetching calendar events!', 'danger');
                }
            },
            eventClick: (info) => this.handleEventClick(info),
            dateClick: (info) => this.handleDateClick(info)
        });

        this.calendar.render();
    }

    handleRoomSelection() {
        const selectedOption = this.roomSelect.options[this.roomSelect.selectedIndex];

        if (selectedOption.value) {
            const beds = selectedOption.dataset.beds;
            const price = selectedOption.dataset.price;
            const amenities = selectedOption.dataset.amenities;

            this.roomDetails.innerHTML = `
                <p><strong>Beds:</strong> ${beds}</p>
                <p><strong>Price per night:</strong> $${price}</p>
                <p><strong>Amenities:</strong> ${amenities}</p>
            `;
            this.roomInfo.style.display = 'block';
        } else {
            this.roomInfo.style.display = 'none';
        }

        this.availabilityInfo.style.display = 'none';
        this.makeReservationBtn.disabled = true;
    }

    handleEventClick(info) {
        const event = info.event;
        const props = event.extendedProps;

        let message = `Reservation: ${event.title}\n`;
        message += `Dates: ${event.start.toLocaleDateString()} to ${event.end.toLocaleDateString()}\n`;
        message += `Cost: $${props.totalCost || 0}`;

        if (props.notes) {
            message += `\nNotes: ${props.notes}`;
        }

        alert(message);
    }

    handleDateClick(info) {
        this.startDateInput.value = info.dateStr;

        if (!this.endDateInput.value) {
            const nextDay = new Date(info.date);
            nextDay.setDate(nextDay.getDate() + 1);
            this.endDateInput.value = nextDay.toISOString().split('T')[0];
        }
    }

    async checkAvailability() {
        const roomId = this.roomSelect.value;
        const startDate = this.startDateInput.value;
        const endDate = this.endDateInput.value;

        if (!roomId || !startDate || !endDate) {
            this.showAlert('Please select a room and both dates.', 'danger');
            return;
        }

        if (startDate >= endDate) {
            this.showAlert('Check-out date must be after check-in date.', 'danger');
            return;
        }

        try {
            const response = await fetch(
                `${window.checkAvailabilityUrl}?room_id=${roomId}&start_date=${startDate}&end_date=${endDate}`
            );
            const data = await response.json();

            this.displayAvailability(data);
        } catch (error) {
            console.error('Error:', error);
            this.showAlert('Error checking availability. Please try again.', 'danger');
        }
    }

    displayAvailability(data) {
        this.availabilityInfo.style.display = 'block';

        if (data.available) {
            this.availabilityInfo.className = 'availability-info availability-available';
            this.availabilityMessage.innerHTML = `✓ Room is available for ${data.nights} night(s)`;
            this.totalCostDiv.innerHTML = `Total Cost: $${data.total_cost.toFixed(2)}`;
            this.makeReservationBtn.disabled = false;
        } else {
            this.availabilityInfo.className = 'availability-info availability-unavailable';
            this.availabilityMessage.innerHTML = '✗ Room is not available for selected dates';
            this.totalCostDiv.innerHTML = '';
            this.makeReservationBtn.disabled = true;
        }
    }


    async handleReservation(e) {
        e.preventDefault();

        const customerIdentifierElement = document.getElementById('customer_identifier');
        if (!customerIdentifierElement) {
            this.showAlert('Customer identifier field not found. Please refresh the page.', 'danger');
            console.error('customer_identifier element not found in DOM');
            return;
        }

        const formData = {
            room_id: parseInt(this.roomSelect.value),
            start_date: this.startDateInput.value,
            end_date: this.endDateInput.value,
            customer_identifier: customerIdentifierElement.value.trim(),
            notes: document.getElementById('notes').value
        };

        console.log('Form data being sent:', formData);

        if (!formData.customer_identifier) {
            this.showAlert('Please enter a customer name or email.', 'danger');
            return;
        }

        try {
            const response = await fetch(window.makeReservationUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                this.showAlert(
                    `Reservation created successfully! Reservation ID: ${data.reservation_id}. Total cost: $${data.total_cost.toFixed(2)}. Customer: ${data.customer_name}`,
                    'success'
                );

                this.resetForm();

                this.calendar.refetchEvents();
            } else {
                this.showAlert(`Error: ${data.error}`, 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showAlert('Error creating reservation. Please try again.', 'danger');
        }
    }
    resetForm() {
        this.bookingForm.reset();
        this.availabilityInfo.style.display = 'none';
        this.roomInfo.style.display = 'none';
        this.makeReservationBtn.disabled = true;
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;

        this.alertContainer.innerHTML = '';
        this.alertContainer.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    setMinimumDates() {
        const today = new Date().toISOString().split('T')[0];
        this.startDateInput.min = today;
        this.endDateInput.min = today;
    }
}

// Initialize the system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ReservationSystem();
}); 