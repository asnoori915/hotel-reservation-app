const { useState, useEffect } = React;

const CustomerDashboard = () => {
    const [customerData, setCustomerData] = useState(null);
    const [reservations, setReservations] = useState([]);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            await Promise.all([
                fetchCustomerData(),
                fetchReservations()
            ]);
        };

        fetchData();
    }, []);

    const fetchCustomerData = async () => {
        try {
            const res = await fetch("/hotel_reservations/api/customers");
            const data = await res.json();

            if (data.customers && data.customers.length > 0) {
                const customer = data.customers[0];
                setCustomerData({
                    id: customer.id || 'N/A',
                    name: customer.name || 'N/A',
                    email: customer.email || 'N/A',
                    phone: customer.phone_number || 'N/A',
                    address: customer.address || 'N/A'
                });
            } else {
                setCustomerData({
                    id: 'N/A',
                    name: 'N/A',
                    email: 'N/A',
                    phone: 'N/A',
                    address: 'N/A'
                });
            }
        } catch (err) {
            console.error('Error fetching customer data:', err);
            setError("Failed to load customer data");
        }
    };

    const fetchReservations = async () => {
        try {
            const res = await fetch("/hotel_reservations/api/reservations");
            const data = await res.json();

            console.log('Raw API response:', data);

            if (data.reservations && Array.isArray(data.reservations)) {
                const mapped = data.reservations.map(item => {
                    const reservation = item.reservations || item;
                    const room = item.rooms || {};

                    console.log('Processing reservation:', reservation);
                    console.log('Processing room:', room);

                    return {
                        id: reservation.id || 0,
                        room_id: reservation.room_id || 'N/A',
                        room_number: `Room ${reservation.room_id || 'N/A'} (${room.number_of_beds || 'N/A'} beds)`,
                        start_date: reservation.start_date || '',
                        end_date: reservation.end_date || '',
                        total_cost: typeof reservation.total_cost === 'number' ? reservation.total_cost : 0,
                        notes: reservation.notes || '',
                        status: getReservationStatus(reservation.start_date, reservation.end_date),
                        amenities: room.amenities || 'N/A',
                        price_per_night: typeof room.price_per_night === 'number' ? room.price_per_night : 0
                    };
                });

                console.log('Mapped reservations:', mapped);
                setReservations(mapped);
            } else {
                console.log('No reservations found in response');
                setReservations([]);
            }
        } catch (err) {
            console.error('Error fetching reservations:', err);
            setError("Failed to load reservations");
        } finally {
            setLoading(false);
        }
    };

    const getReservationStatus = (startDate, endDate) => {
        if (!startDate || !endDate) return 'unknown';

        try {
            const today = new Date();
            const start = new Date(startDate);
            const end = new Date(endDate);

            today.setHours(0, 0, 0, 0);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            if (end < today) {
                return 'completed';
            } else if (start <= today && end >= today) {
                return 'active';
            } else {
                return 'confirmed';
            }
        } catch (error) {
            return 'unknown';
        }
    };

    const handleViewInvoice = (reservation) => {
        setSelectedReservation(reservation);
    };

    const handleBackToList = () => {
        setSelectedReservation(null);
    };

    if (loading) {
        return (
            <div className="container mt-5">
                <div className="has-text-centered p-6">
                    <div className="is-loading" style={{ width: '50px', height: '50px', margin: '0 auto' }}></div>
                    <p className="mt-3">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-5">
                <div className="notification is-danger">
                    <strong>Error:</strong> {error}
                    <br />
                    <button className="button is-small is-light mt-2" onClick={() => window.location.reload()}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-5">
            {!selectedReservation ? (
                <>
                    <CustomerInfo customer={customerData} />
                    <ReservationsList reservations={reservations} onViewInvoice={handleViewInvoice} />
                </>
            ) : (
                <InvoiceView reservation={selectedReservation} customer={customerData} onBack={handleBackToList} />
            )}
        </div>
    );
};

const CustomerInfo = ({ customer }) => {
    if (!customer) {
        return (
            <div className="box mb-5">
                <h2 className="title is-4">My Profile</h2>
                <p className="has-text-grey">Customer information not available.</p>
            </div>
        );
    }

    return (
        <div className="box mb-5">
            <h2 className="title is-4">My Profile</h2>
            <div className="columns is-multiline">
                <InfoItem label="Name" value={customer.name} />
                <InfoItem label="Email" value={customer.email} />
                <InfoItem label="Phone" value={customer.phone} />
                <InfoItem label="Address" value={customer.address} />
            </div>
        </div>
    );
};

const InfoItem = ({ label, value }) => (
    <div className="column is-half">
        <p><strong>{label}:</strong> {value || 'Not provided'}</p>
    </div>
);

const ReservationsList = ({ reservations, onViewInvoice }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case "confirmed": return "is-success";
            case "pending": return "is-warning";
            case "completed": return "is-info";
            case "active": return "is-primary";
            default: return "is-light";
        }
    };

    if (!Array.isArray(reservations)) {
        return (
            <div className="box">
                <h2 className="title is-4">My Reservations</h2>
                <p className="has-text-grey">Unable to load reservations.</p>
            </div>
        );
    }

    return (
        <div className="box">
            <h2 className="title is-4">My Reservations</h2>
            {reservations.length === 0 ? (
                <div className="has-text-centered p-5">
                    <p className="is-size-5 has-text-grey">No reservations found</p>
                    <p className="has-text-grey">You haven't made any reservations yet.</p>
                </div>
            ) : (
                <table className="table is-fullwidth is-striped mt-3">
                    <thead>
                        <tr>
                            <th>Room</th>
                            <th>Check-in</th>
                            <th>Check-out</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reservations.map(reservation => (
                            <tr key={reservation.id}>
                                <td>{reservation.room_number || 'N/A'}</td>
                                <td>{formatDate(reservation.start_date)}</td>
                                <td>{formatDate(reservation.end_date)}</td>
                                <td>
                                    ${typeof reservation.total_cost === 'number' ?
                                        reservation.total_cost.toFixed(2) :
                                        '0.00'
                                    }
                                </td>
                                <td>
                                    <span className={`tag ${getStatusColor(reservation.status)}`}>
                                        {reservation.status || 'unknown'}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        className="button is-link is-small"
                                        onClick={() => onViewInvoice(reservation)}
                                    >
                                        View Invoice
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

const InvoiceView = ({ reservation, customer, onBack }) => {
    if (!reservation || !customer) {
        return (
            <div className="box">
                <button className="button is-dark mb-4" onClick={onBack}>← Back to Reservations</button>
                <p className="has-text-grey">Invoice data not available.</p>
            </div>
        );
    }

    const startDate = new Date(reservation.start_date);
    const endDate = new Date(reservation.end_date);
    const nights = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    const totalCost = typeof reservation.total_cost === 'number' ? reservation.total_cost : 0;
    const pricePerNight = reservation.price_per_night || (nights > 0 ? totalCost / nights : 0);

    return (
        <div className="box">
            <button className="button is-dark mb-4" onClick={onBack}>← Back to Reservations</button>

            <div className="box has-background-light">
                <div className="level mb-5">
                    <div className="level-left">
                        <h2 className="title is-4">Invoice</h2>
                    </div>
                    <div className="level-right has-text-grey">
                        Invoice #: INV-{reservation.id.toString().padStart(5, '0')}
                    </div>
                </div>

                <div className="columns mb-4">
                    <div className="column">
                        <h3 className="subtitle is-6 mb-1">Hotel Name</h3>
                        <p>
                            123 Hotel Street<br />
                            Hotel City, HC 12345<br />
                            Phone: (555) 123-4567
                        </p>
                    </div>
                    <div className="column">
                        <h3 className="subtitle is-6 mb-1">Bill To:</h3>
                        <p>
                            {customer.name || 'N/A'}<br />
                            {customer.address || 'N/A'}<br />
                            {customer.email || 'N/A'}<br />
                            {customer.phone || 'N/A'}
                        </p>
                    </div>
                </div>

                <table className="table is-fullwidth is-bordered">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Details</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                {reservation.room_number || 'Room N/A'}
                                {reservation.amenities && reservation.amenities !== 'N/A' && (
                                    <><br /><small className="has-text-grey">Amenities: {reservation.amenities}</small></>
                                )}
                            </td>
                            <td>
                                {formatDate(reservation.start_date)} - {formatDate(reservation.end_date)}<br />
                                ({nights} nights × ${pricePerNight.toFixed(2)})
                            </td>
                            <td>${totalCost.toFixed(2)}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="2" className="has-text-right has-text-weight-bold">Total:</td>
                            <td><strong>${totalCost.toFixed(2)}</strong></td>
                        </tr>
                    </tfoot>
                </table>

                {reservation.notes && (
                    <div className="notification is-info mt-4">
                        <strong>Notes:</strong> {reservation.notes}
                    </div>
                )}

                <div className="has-text-centered has-text-grey mt-5">
                    Thank you for choosing our hotel!
                </div>
            </div>
        </div>
    );
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';

    try {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
        return 'Invalid Date';
    }
};

ReactDOM.render(<CustomerDashboard />, document.getElementById('customer-app'));