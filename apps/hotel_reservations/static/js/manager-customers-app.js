const { useState, useEffect } = React;

const ManagerCustomers = () => {
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        const filtered = customers.filter(customer =>
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.phone_number.includes(searchTerm)
        );
        setFilteredCustomers(filtered);
    }, [searchTerm, customers]);

    const fetchCustomers = async () => {
        try {
            const response = await fetch('/hotel_reservations/api/manager/customers');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            const sortedCustomers = (data.customers || []).sort((a, b) =>
                a.name.localeCompare(b.name)
            );

            setCustomers(sortedCustomers);
            setFilteredCustomers(sortedCustomers);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching customers:", err);
            setError("Failed to load customers");
            setLoading(false);
        }
    };

    const handleViewCustomer = (customer) => {
        setSelectedCustomer(customer);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedCustomer(null);
    };

    if (loading) {
        return <div className="has-text-centered p-6">Loading customers...</div>;
    }

    if (error) {
        return <div className="notification is-danger m-5">{error}</div>;
    }

    return (
        <div className="container mt-5">
            <div className="level mb-5">
                <div className="level-left">
                    <div>
                        <h1 className="title">Customer Search</h1>
                        <p className="subtitle">Search and view customer information and reservations</p>
                    </div>
                </div>
                <div className="level-right">
                    <a href="/hotel_reservations/reservations" className="button is-primary">
                        ← Back to Reservations
                    </a>
                </div>
            </div>

            <div className="box">
                <div className="field">
                    <div className="control has-icons-left">
                        <input
                            className="input is-medium"
                            type="text"
                            placeholder="Search customers by name, email, or phone number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="icon is-left">
                            <i className="fas fa-search"></i>
                        </span>
                    </div>
                </div>

                <div className="level mt-4 mb-3">
                    <div className="level-left">
                        <p className="has-text-grey">
                            Showing {filteredCustomers.length} of {customers.length} customers
                        </p>
                    </div>
                    <div className="level-right">
                        <div className="tags">
                            <span className="tag is-info">Total: {customers.length}</span>
                        </div>
                    </div>
                </div>

                {filteredCustomers.length === 0 && searchTerm ? (
                    <div className="has-text-centered has-text-grey p-5">
                        <div className="content">
                            <p className="is-size-5">No customers found matching "{searchTerm}"</p>
                            <p>Try adjusting your search terms or browse all customers.</p>
                        </div>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table is-fullwidth is-striped is-hoverable">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Address</th>
                                    <th className="has-text-centered">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map(customer => (
                                    <tr key={customer.id}>
                                        <td>
                                            <strong>{customer.name}</strong>
                                        </td>
                                        <td>
                                            <span className="has-text-grey-dark">{customer.email}</span>
                                        </td>
                                        <td>{customer.phone_number || 'N/A'}</td>
                                        <td>
                                            <span title={customer.address}>
                                                {customer.address ?
                                                    (customer.address.length > 30 ?
                                                        customer.address.substring(0, 30) + '...' :
                                                        customer.address
                                                    ) : 'N/A'
                                                }
                                            </span>
                                        </td>
                                        <td className="has-text-centered">
                                            <button
                                                className="button is-small is-info"
                                                onClick={() => handleViewCustomer(customer)}
                                            >
                                                <span className="icon">
                                                    <i className="fas fa-eye"></i>
                                                </span>
                                                <span>View Details</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {filteredCustomers.length === 0 && !searchTerm && (
                    <div className="has-text-centered has-text-grey p-5">
                        <div className="content">
                            <p className="is-size-5">No customers found</p>
                            <p>There are currently no customers in the system.</p>
                        </div>
                    </div>
                )}
            </div>

            {showModal && selectedCustomer && (
                <CustomerDetailsModal
                    customer={selectedCustomer}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
};

const CustomerDetailsModal = ({ customer, onClose }) => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCustomerReservations();
    }, [customer.id]);

    const fetchCustomerReservations = async () => {
        try {
            const response = await fetch(`/hotel_reservations/api/manager/customers/${customer.id}/reservations`);
            const data = await response.json();
            setReservations(data.reservations || []);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching reservations:", err);
            setLoading(false);
        }
    };

    const getStatusColor = (startDate, endDate) => {
        const today = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);

        today.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        if (end < today) {
            return 'is-light'; // Past
        } else if (start <= today && end >= today) {
            return 'is-success'; // Current
        } else {
            return 'is-info'; // Future
        }
    };

    const getStatusText = (startDate, endDate) => {
        const today = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);

        today.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        if (end < today) {
            return 'Completed';
        } else if (start <= today && end >= today) {
            return 'Active';
        } else {
            return 'Upcoming';
        }
    };

    return (
        <div className="modal is-active">
            <div className="modal-background" onClick={onClose}></div>
            <div className="modal-card" style={{ width: '90%', maxWidth: '800px' }}>
                <header className="modal-card-head">
                    <p className="modal-card-title">
                        <span className="icon">
                            <i className="fas fa-user"></i>
                        </span>
                        Customer Details - {customer.name}
                    </p>
                    <button className="delete" onClick={onClose}></button>
                </header>

                <section className="modal-card-body">
                    {/* Customer Information */}
                    <div className="box">
                        <h3 className="subtitle is-5 mb-4">
                            <span className="icon">
                                <i className="fas fa-address-card"></i>
                            </span>
                            Contact Information
                        </h3>
                        <div className="columns is-multiline">
                            <div className="column is-half">
                                <div className="field is-horizontal">
                                    <div className="field-label is-normal">
                                        <label className="label">Name:</label>
                                    </div>
                                    <div className="field-body">
                                        <div className="field">
                                            <p className="control">
                                                <strong>{customer.name}</strong>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="column is-half">
                                <div className="field is-horizontal">
                                    <div className="field-label is-normal">
                                        <label className="label">Email:</label>
                                    </div>
                                    <div className="field-body">
                                        <div className="field">
                                            <p className="control">
                                                <a href={`mailto:${customer.email}`}>{customer.email}</a>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="column is-half">
                                <div className="field is-horizontal">
                                    <div className="field-label is-normal">
                                        <label className="label">Phone:</label>
                                    </div>
                                    <div className="field-body">
                                        <div className="field">
                                            <p className="control">
                                                {customer.phone_number || 'Not provided'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="column is-half">
                                <div className="field is-horizontal">
                                    <div className="field-label is-normal">
                                        <label className="label">Customer ID:</label>
                                    </div>
                                    <div className="field-body">
                                        <div className="field">
                                            <p className="control">
                                                <code>#{customer.id}</code>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {customer.address && (
                            <div className="field is-horizontal">
                                <div className="field-label is-normal">
                                    <label className="label">Address:</label>
                                </div>
                                <div className="field-body">
                                    <div className="field">
                                        <p className="control">
                                            {customer.address}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reservations History */}
                    <div className="box">
                        <div className="level mb-4">
                            <div className="level-left">
                                <h3 className="subtitle is-5 mb-0">
                                    <span className="icon">
                                        <i className="fas fa-calendar-alt"></i>
                                    </span>
                                    Reservation History
                                </h3>
                            </div>
                            <div className="level-right">
                                <div className="tags">
                                    <span className="tag is-primary">
                                        Total: {reservations.length}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="has-text-centered p-4">
                                <div className="is-loading" style={{ width: '2rem', height: '2rem' }}></div>
                                <p className="mt-2">Loading reservations...</p>
                            </div>
                        ) : reservations.length === 0 ? (
                            <div className="has-text-centered has-text-grey p-4">
                                <div className="content">
                                    <p className="is-size-6">No reservations found for this customer.</p>
                                    <p><em>This customer hasn't made any bookings yet.</em></p>
                                </div>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="table is-fullwidth is-striped">
                                    <thead>
                                        <tr>
                                            <th>Room</th>
                                            <th>Check-in</th>
                                            <th>Check-out</th>
                                            <th>Nights</th>
                                            <th>Total Cost</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reservations.map(reservation => {
                                            const nights = Math.ceil(
                                                (new Date(reservation.end_date) - new Date(reservation.start_date))
                                                / (1000 * 60 * 60 * 24)
                                            );

                                            return (
                                                <tr key={reservation.id}>
                                                    <td>
                                                        <strong>Room {reservation.room_id}</strong>
                                                    </td>
                                                    <td>{formatDate(reservation.start_date)}</td>
                                                    <td>{formatDate(reservation.end_date)}</td>
                                                    <td>
                                                        <span className="tag is-light">
                                                            {nights} night{nights !== 1 ? 's' : ''}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <strong className="has-text-success">
                                                            ${reservation.total_cost?.toFixed(2) || '0.00'}
                                                        </strong>
                                                    </td>
                                                    <td>
                                                        <span className={`tag ${getStatusColor(reservation.start_date, reservation.end_date)}`}>
                                                            {getStatusText(reservation.start_date, reservation.end_date)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>

                <footer className="modal-card-foot">
                    <button className="button is-primary" onClick={onClose}>
                        Close
                    </button>
                </footer>
            </div>
        </div>
    );
};

const formatDate = (dateString) => {
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        weekday: 'short'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
};

ReactDOM.render(<ManagerCustomers />, document.getElementById('manager-customers-app'));