"""
This file defines actions, i.e. functions the URLs are mapped into
The @action(path) decorator exposed the function at URL:

    http://127.0.0.1:8000/{app_name}/{path}

If app_name == '_default' then simply

    http://127.0.0.1:8000/{path}

If path == 'index' it can be omitted:

    http://127.0.0.1:8000/

The path follows the bottlepy syntax.

@action.uses('generic.html')  indicates that the action uses the generic.html template
@action.uses(session)         indicates that the action uses the session
@action.uses(db)              indicates that the action uses the db
@action.uses(T)               indicates that the action uses the i18n & pluralization
@action.uses(auth.user)       indicates that the action requires a logged in user
@action.uses(auth)            indicates that the action requires the auth object

session, db, T, auth, and tempates are examples of Fixtures.
Warning: Fixtures MUST be declared with @action.uses({fixtures}) else your app will result in undefined behavior
"""

from yatl.helpers import A

from py4web import URL, abort, action, redirect, request

from .common import (
    T,
    auth,
    authenticated,
    cache,
    db,
    flash,
    logger,
    session,
    unauthenticated,
)

# check compatibility
import py4web

assert py4web.check_compatible("1.20190709.1")

# by importing controllers you expose the actions defined in it
from . import controllers

# by importing db you expose it to the _dashboard/dbladmin
from .models import db

# import the scheduler
from .tasks import scheduler

# optional parameters
__version__ = "0.0.0"
__author__ = "you <you@example.com>"
__license__ = "anything you want"

@action("index")
@action.uses("index.html", auth, T)
def index():
    user = auth.get_user()

    if user:
        # Check user type from auth_user table
        manager = db(db.managers.user_id == user['id']).select().first()
        account_type = 'manager' if manager else 'customer'
        if account_type == 'manager':
            redirect(URL('reservations'))
        else:
            redirect(URL('customer'))

    message = T("Hotel Reservations Website!")
    return dict(message=message)


@action('customer')
@action.uses('customer.html', auth.user)
def customer():
    user = auth.get_user()    
    print(f"DEBUG CUSTOMER: Current user: {user}")
    print(f"DEBUG CUSTOMER: User ID: {user['id']}")
    
    customer = db(db.customers.user_id == user['id']).select().first()
    print(f"DEBUG CUSTOMER: Found existing customer: {customer}")
    
    if not customer:
        print("DEBUG CUSTOMER: Creating new customer...")
        customer_id = db.customers.insert(
            user_id=user['id'],
            name=f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
            email=user.get('email', ''),
            phone_number='',
            address=''
        )
        db.commit()
        print(f"DEBUG CUSTOMER: Created customer with ID: {customer_id}")
        
        # Fetch the newly created customer
        customer = db(db.customers.id == customer_id).select().first()
        print(f"DEBUG CUSTOMER: Newly created customer: {customer}")
    else:
        print(f"DEBUG CUSTOMER: Found existing customer: {customer}")
    
    return dict()

@action('api/reservations')
@action.uses(db, auth.user)
def get_reservations():
    user = auth.get_user()
    print(f"DEBUG: Current user: {user}")
    print(f"DEBUG: User ID: {user['id']}")
    
    # find the matching customer id based on the user id
    customer = db(db.customers.user_id == user['id']).select().first()
    print(f"DEBUG: Found customer: {customer}")
    
    if customer:
        print(f"DEBUG: Customer ID: {customer.id}")
        print(f"DEBUG: Customer name: {customer.name}")
        print(f"DEBUG: Customer email: {customer.email}")
    
    # Let's also check ALL customers to see what's in the database
    all_customers = db(db.customers).select()
    print(f"DEBUG: All customers in database:")
    for c in all_customers:
        print(f"  - ID: {c.id}, User ID: {c.user_id}, Name: {c.name}, Email: {c.email}")
    
    # Let's check ALL reservations
    all_reservations = db(db.reservations).select()
    print(f"DEBUG: All reservations in database:")
    for r in all_reservations:
        print(f"  - ID: {r.id}, Customer ID: {r.customer_id}, Room ID: {r.room_id}, Dates: {r.start_date} to {r.end_date}")

    # return an empty list if no customer is found
    if not customer:
        print("DEBUG: No customer found for current user!")
        return dict(reservations=[])
    
    # retrieve all room information associated with the customer reservation
    reservations = db(db.reservations.customer_id == customer.id).select(
        db.reservations.ALL, 
        db.rooms.number_of_beds, 
        db.rooms.amenities, 
        db.rooms.price_per_night,
        left=db.rooms.on(db.rooms.id == db.reservations.room_id)
    )
    
    print(f"DEBUG: Found {len(reservations)} reservations for customer {customer.id}")
    for r in reservations:
        print(f"  - Reservation: {r.reservations.id}, Room: {r.reservations.room_id}, Dates: {r.reservations.start_date} to {r.reservations.end_date}")
    
    print("RESERVATIONS", dict(reservations=[r.as_dict() for r in reservations]))
    # return in JSON dictionary format
    return dict(reservations=[r.as_dict() for r in reservations])

@action('api/customers')
@action.uses(db, auth.user)
def get_customer_info():
    user = auth.get_user()
    print(f"API: Current user: {user}")  # Debug print
    
    # get customer information for current user only
    customer = db(db.customers.user_id == user['id']).select().first()
    print(f"API: Found customer: {customer}")  # Debug print
    
    if not customer:
        print("API: No customer found!")  # Debug print
        return dict(customers=[])
    
    return dict(customers=[customer.as_dict()])

@action('manager/customers')
@action.uses('layout_plain.html', 'manager-customers.html', auth.user)
def manager_customers():
    user = auth.get_user()
    manager = db(db.managers.user_id == user['id']).select().first()
    if not manager:
        print('redirect works')
        redirect(URL('index')) 
    return dict()


# get all the customers
@action('api/manager/customers', method=['GET'])
@action.uses(db, auth.user)
def get_all_customers():
    user = auth.get_user()
    manager = db(db.managers.user_id == user['id']).select().first()
    if not manager:
        print('redirect works')
        redirect(URL('index')) 
    """Get all customers, excluding managers"""

    manager_user_ids = db(db.managers).select(db.managers.user_id)
    manager_ids = [m.user_id for m in manager_user_ids]
    
    if manager_ids:
        customers = db(
            (db.customers.user_id != None) & 
            (~db.customers.user_id.belongs(manager_ids))
        ).select(orderby=db.customers.name)
    else:
        customers = db(db.customers).select(orderby=db.customers.name)
    
    return dict(customers=[c.as_dict() for c in customers])

# add a new cust
@action('api/manager/customers', method=['POST'])
@action.uses(db, auth.user)
def add_customer():
    user = auth.get_user()
    manager = db(db.managers.user_id == user['id']).select().first()
    if not manager:
        print('redirect works')
        redirect(URL('index')) 
    """Add a new customer"""
    data = request.json
    try:
        # new account
        user_id = db.auth_user.insert(
            email=data.get('email'),
            first_name=data.get('name', '').split()[0] if data.get('name') else '',
            last_name=' '.join(data.get('name', '').split()[1:]) if data.get('name') else '',
            password=db.auth_user.password.requires[0]('defaultpassword')[0]  
        )
        
        # Create customer record
        customer_id = db.customers.insert(
            user_id=user_id,
            name=data.get('name'),
            email=data.get('email'),
            phone_number=data.get('phone_number', ''),
            address=data.get('address', '')
        )
        db.commit()
        return dict(success=True, id=customer_id)
    except Exception as e:
        db.rollback()
        return dict(success=False, error=str(e))

# del a customer
@action('api/manager/customers/<customer_id:int>', method=['DELETE'])
@action.uses(db, auth.user)
def delete_customer(customer_id):
    user = auth.get_user()
    manager = db(db.managers.user_id == user['id']).select().first()
    if not manager:
        print('redirect works')
        redirect(URL('index')) 
    """Delete a customer and their user account"""
    try:
        #  search
        customer = db(db.customers.id == customer_id).select().first()
        if customer:
            # Delete all reservations for this customer
            db(db.reservations.customer_id == customer_id).delete()
            # Delete the customer record
            db(db.customers.id == customer_id).delete()
            # Delete the associated user account
            if customer.user_id:
                db(db.auth_user.id == customer.user_id).delete()
        db.commit()
        return dict(success=True)
    except Exception as e:
        db.rollback()
        return dict(success=False, error=str(e))

# specific customers reservations
@action('api/manager/customers/<customer_id:int>/reservations', method=['GET'])
@action.uses(db, auth.user)
def get_customer_reservations(customer_id):
    user = auth.get_user()
    manager = db(db.managers.user_id == user['id']).select().first()
    if not manager:
        print('redirect works')
        redirect(URL('index')) 
    reservations = db(db.reservations.customer_id == customer_id).select(
        db.reservations.ALL,
        orderby=~db.reservations.start_date
    )
    return dict(reservations=[r.as_dict() for r in reservations])

# delete a reservation
@action('api/manager/reservations/<reservation_id:int>', method=['DELETE'])
@action.uses(db, auth.user)
def delete_reservation(reservation_id):
    user = auth.get_user()
    manager = db(db.managers.user_id == user['id']).select().first()
    if not manager:
        print('redirect works')
        redirect(URL('index')) 
    """Delete a reservation"""
    try:
        db(db.reservations.id == reservation_id).delete()
        db.commit()
        return dict(success=True)
    except Exception as e:
        db.rollback()
        return dict(success=False, error=str(e))

@action('api/rooms')
@action.uses(db, auth.user)
def get_all_rooms():
    """API endpoint to get all rooms information for managers"""
    rooms = db(db.rooms).select()
    
    rooms_data = []
    for room in rooms:
        room_dict = room.as_dict()
        # can add URL here later for image, if wanted
        if room_dict.get('image'):
            room_dict['image_url'] = URL('download', room_dict['image'])
        rooms_data.append(room_dict)
    
    return dict(rooms=rooms_data)


@action('api/rooms/available')
@action.uses(db, auth.user)
def get_available_rooms():
    """API endpoint to get available rooms for specific dates"""
    start_date = request.query.get('start_date')
    end_date = request.query.get('end_date')
    
    if not start_date or not end_date:
        return dict(error="start_date and end_date parameters required"), 400
    
    # get all rooms
    all_rooms = db(db.rooms).select()
    
    # find rooms that are NOT reserved during the specified period
    reserved_room_ids = db(
        (db.reservations.start_date <= end_date) & 
        (db.reservations.end_date >= start_date)
    ).select(db.reservations.room_id, distinct=True)
    
    reserved_ids = [r.room_id for r in reserved_room_ids]
    
    # filter out the already reserved rooms
    available_rooms = []
    for room in all_rooms:
        if room.id not in reserved_ids:
            room_dict = room.as_dict()
            #this isn't needed but option to display room photos for now here
            if room_dict.get('image'):
                room_dict['image_url'] = URL('download', room_dict['image'])
            available_rooms.append(room_dict)
    
    return dict(
        available_rooms=available_rooms,
        date_range=dict(start_date=start_date, end_date=end_date)
    )

@action('reservations')
@action.uses('reservations.html', auth.user, db)
def reservations():
    """Main reservations page with calendar and booking form"""
    user = auth.get_user()
    
    # Get customer info
    customer = db(db.customers.user_id == user['id']).select().first()
    if not customer:
        # Create customer if doesn't exist
        customer_id = db.customers.insert(
            user_id=user['id'],
            name=f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
            email=user.get('email', ''),
            phone_number='',
            address=''
        )
        db.commit()
        customer = db(db.customers.id == customer_id).select().first()
    
    # Get available rooms
    rooms = db(db.rooms).select()
    
    return dict(customer=customer, rooms=rooms)

@action('api/calendar/reservations')
@action.uses(db, auth.user)
def calendar_reservations():
    """API endpoint to get reservation data for calendar display"""
    user = auth.get_user()
    start_date = request.query.get('start')
    end_date = request.query.get('end')
    
    # Get all reservations for the date range
    query = db.reservations.id > 0
    if start_date:
        query &= (db.reservations.end_date >= start_date)
    if end_date:
        query &= (db.reservations.start_date <= end_date)
    
    reservations = db(query).select(
        db.reservations.ALL,
        db.rooms.ALL,
        db.customers.name,
        left=[
            db.rooms.on(db.rooms.id == db.reservations.room_id),
            db.customers.on(db.customers.id == db.reservations.customer_id)
        ]
    )
    
    # Format for calendar - return events directly, not wrapped in dict
    events = []
    for r in reservations:
        events.append({
            'id': r.reservations.id,
            'title': f'Room {r.reservations.room_id} - {r.customers.name}',
            'start': str(r.reservations.start_date),
            'end': str(r.reservations.end_date),
            'backgroundColor': '#007bff',
            'borderColor': '#007bff',
            'extendedProps': {
                'roomId': r.reservations.room_id,
                'customerId': r.reservations.customer_id,
                'customerName': r.customers.name,
                'totalCost': float(r.reservations.total_cost) if r.reservations.total_cost else 0,
                'notes': r.reservations.notes
            }
        })
    
    return events  # Return events directly, not wrapped in dict

@action('api/check-availability')
@action.uses(db, auth.user)
def check_availability():
    """Check room availability for given dates"""
    room_id = request.query.get('room_id')
    start_date = request.query.get('start_date')
    end_date = request.query.get('end_date')
    
    if not all([room_id, start_date, end_date]):
        return dict(available=False, error="Missing required parameters")
    
    # Check for conflicting reservations
    conflict = db(
        (db.reservations.room_id == room_id) &
        (
            ((db.reservations.start_date <= start_date) & (db.reservations.end_date > start_date)) |
            ((db.reservations.start_date < end_date) & (db.reservations.end_date >= end_date)) |
            ((db.reservations.start_date >= start_date) & (db.reservations.end_date <= end_date))
        )
    ).select().first()
    
    available = conflict is None
    
    # Get room details for pricing
    room = db(db.rooms.id == room_id).select().first()
    total_cost = 0
    if available and room:
        from datetime import datetime
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        nights = (end - start).days
        total_cost = float(room.price_per_night) * nights
    
    return dict(
        available=available,
        total_cost=total_cost,
        nights=(datetime.strptime(end_date, '%Y-%m-%d') - datetime.strptime(start_date, '%Y-%m-%d')).days if available else 0
    )

@action('api/make-reservation', method=['POST'])
@action.uses(db, auth.user)
def make_reservation():
    """Create a new reservation with customer identification"""
    user = auth.get_user()
    data = request.json
    
    # Debug logging
    print(f"Received reservation data: {data}")
    
    try:
        # Validate required fields
        required_fields = ['room_id', 'start_date', 'end_date', 'customer_identifier']
        missing_fields = []
        for field in required_fields:
            if field not in data or not data.get(field):
                missing_fields.append(field)
        
        if missing_fields:
            print(f"Missing fields: {missing_fields}")
            return dict(success=False, error=f"Missing required fields: {', '.join(missing_fields)}")
        
        customer_identifier = data['customer_identifier'].strip()
        print(f"Looking for customer with identifier: '{customer_identifier}'")
        
        # Try to find existing customer by email first, then by name
        customer = None
        
        # Check if identifier looks like an email
        if '@' in customer_identifier:
            customer = db(db.customers.email == customer_identifier).select().first()
        
        # If not found by email, try to find by name
        if not customer:
            customer = db(db.customers.name.contains(customer_identifier)).select().first()
        
        # If customer not found, return error
        if not customer:
            return dict(
                success=False, 
                error=f"Customer not found with identifier '{customer_identifier}'. Please check the name or email and try again."
            )
        
        # Check availability one more time
        room_id = data['room_id']
        start_date = data['start_date']
        end_date = data['end_date']
        
        conflict = db(
            (db.reservations.room_id == room_id) &
            (
                ((db.reservations.start_date <= start_date) & (db.reservations.end_date > start_date)) |
                ((db.reservations.start_date < end_date) & (db.reservations.end_date >= end_date)) |
                ((db.reservations.start_date >= start_date) & (db.reservations.end_date <= end_date))
            )
        ).select().first()
        
        if conflict:
            return dict(success=False, error="Room is not available for selected dates")
        
        # Calculate total cost
        room = db(db.rooms.id == room_id).select().first()
        if not room:
            return dict(success=False, error="Room not found")
        
        from datetime import datetime
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        nights = (end - start).days
        
        if nights <= 0:
            return dict(success=False, error="End date must be after start date")
        
        total_cost = float(room.price_per_night) * nights
        
        # Create reservation
        reservation_id = db.reservations.insert(
            room_id=room_id,
            customer_id=customer.id,
            start_date=start_date,
            end_date=end_date,
            notes=data.get('notes', ''),
            total_cost=total_cost
        )
        
        db.commit()
        
        return dict(
            success=True, 
            reservation_id=reservation_id, 
            total_cost=total_cost,
            customer_name=customer.name
        )
        
    except Exception as e:
        db.rollback()
        return dict(success=False, error=str(e))

# Customer registration and reservation history
@action('customer/register')
@action.uses('customer-register.html', db)
def customer_register():
    """Simple customer registration page"""
    return dict()

@action('api/customer/register', method=['POST'])
@action.uses(db, auth, session)
def api_customer_register():
    data = request.json

    required_fields = ['username', 'password', 'email', 'name']
    for field in required_fields:
        if not data.get(field):
            return dict(success=False, error=f"Missing field: {field}")

    existing = db(
        (db.auth_user.username == data['username']) |
        (db.auth_user.email == data['email'])
    ).select().first()

    if existing:
        return dict(success=False, error="Username or email already exists")

    try:
        hashed_password = db.auth_user.password.validate(data['password'])[0]

        user_id = db.auth_user.insert(
            username=data['username'],
            email=data['email'],
            password=hashed_password
        )

        db.customers.insert(
            user_id=user_id,
            name=data['name'],
            email=data['email'],
            phone_number=data.get('phone_number', ''),
            address=data.get('address', '')
        )

        db.commit()
        return dict(success=True, message="Registration successful!")

    except Exception as e:
        db.rollback()
        return dict(success=False, error=str(e))

@action('manager/register')
@action.uses('manager-register.html', db)
def manager_register():
    return dict()

@action('api/manager/register', method=['POST'])
@action.uses(db, auth, session)
def api_manager_register():
    data = request.json or {}
    required = ['username', 'password', 'email', 'name', 'phone_number']

    missing = [f for f in required if not data.get(f)]
    if missing:
        return dict(success=False, error=f"Missing fields: {', '.join(missing)}")

    # Check for existing username or email
    exists = db(
        (db.auth_user.username == data['username']) |
        (db.auth_user.email == data['email']) |
        (db.managers.email == data['email'])
    ).select(limitby=(0, 1)).first()

    if exists:
        return dict(success=False, error="Username or email already exists")

    try:
        hashed_pw, _ = db.auth_user.password.validate(data['password'])

        user_id = db.auth_user.insert(
            username=data['username'],
            email=data['email'],
            password=hashed_pw,
        )

        db.managers.insert(
            user_id=user_id,
            name=data['name'],
            email=data['email'],
            phone_number=data['phone_number']
        )

        db.commit()
        return dict(success=True, message="Manager registration successful")

    except Exception as e:
        db.rollback()
        return dict(success=False, error=str(e))


@action('customer/history')
@action.uses('customer-history.html', db)
def customer_history():
    """Customer reservation history lookup"""
    return dict()

@action('api/customer/history', method=['POST'])
@action.uses(db)
def api_customer_history():
    """Get customer reservation history by email"""
    data = request.json
    email = data.get('email')
    
    if not email:
        return dict(success=False, error="Email is required")
    
    try:
        customer = db(db.customers.email == email).select().first()
        if not customer:
            return dict(success=False, error="No customer found with this email")
        
        reservations = db(db.reservations.customer_id == customer.id).select(
            db.reservations.ALL,
            db.rooms.ALL,
            left=db.rooms.on(db.rooms.id == db.reservations.room_id),
            orderby=~db.reservations.start_date
        )
        
        reservation_list = []
        for r in reservations:
            reservation_list.append({
                'id': r.reservations.id,
                'start_date': str(r.reservations.start_date),
                'end_date': str(r.reservations.end_date),
                'total_cost': float(r.reservations.total_cost) if r.reservations.total_cost else 0,
                'notes': r.reservations.notes,
                'room_id': r.reservations.room_id,
                'room_beds': r.rooms.number_of_beds if r.rooms else 'N/A',
                'room_amenities': r.rooms.amenities if r.rooms else 'N/A',
                'room_price': float(r.rooms.price_per_night) if r.rooms else 0,
                'created_on': str(r.reservations.created_on) if r.reservations.created_on else 'N/A'
            })
        
        return dict(
            success=True, 
            customer=customer.as_dict(),
            reservations=reservation_list
        )
        
    except Exception as e:
        return dict(success=False, error=str(e))

# Room availability visualization
@action('availability-chart')
@action.uses('availability-chart.html', db)
def availability_chart():
    """Simple room availability chart/calendar view"""
    # Get all rooms for the chart
    rooms = db(db.rooms).select(orderby=db.rooms.id)
    return dict(rooms=rooms)

@action('api/availability-data')
@action.uses(db)
def api_availability_data():
    """Get room availability data for visualization"""
    start_date = request.vars.get('start_date')
    end_date = request.vars.get('end_date')
    
    # Default to next 30 days if no dates provided
    if not start_date or not end_date:
        from datetime import datetime, timedelta
        start = datetime.now()
        end = start + timedelta(days=30)
        start_date = start.strftime('%Y-%m-%d')
        end_date = end.strftime('%Y-%m-%d')
    
    try:
        # Get all rooms
        rooms = db(db.rooms).select(orderby=db.rooms.id)
        
        # Get reservations in date range
        reservations = db(
            (db.reservations.start_date <= end_date) & 
            (db.reservations.end_date >= start_date)
        ).select(
            db.reservations.room_id,
            db.reservations.start_date,
            db.reservations.end_date,
            db.customers.name,
            left=db.customers.on(db.customers.id == db.reservations.customer_id)
        )
        
        # Format data for chart
        room_data = []
        for room in rooms:
            room_reservations = []
            for res in reservations:
                if res.reservations.room_id == room.id:
                    room_reservations.append({
                        'start': str(res.reservations.start_date),
                        'end': str(res.reservations.end_date),
                        'customer': res.customers.name if res.customers else 'Unknown'
                    })
            
            room_data.append({
                'id': room.id,
                'beds': room.number_of_beds,
                'price': float(room.price_per_night),
                'amenities': room.amenities,
                'reservations': room_reservations
            })
        
        return dict(
            success=True,
            start_date=start_date,
            end_date=end_date,
            rooms=room_data
        )
        
    except Exception as e:
        return dict(success=False, error=str(e))
    


@action('manager/rooms')
@action.uses('manager-rooms.html', auth.user, db)
def manager_rooms():
    user = auth.get_user()
    manager = db(db.managers.user_id == user['id']).select().first()
    if not manager:
        print('redirect works')
        redirect(URL('index'))
    return dict()


#room addition
@action('api/manager/rooms', method=['POST'])
@action.uses(db, auth.user)
def add_room():
    user = auth.get_user()
    manager = db(db.managers.user_id == user['id']).select().first()
    if not manager:
        print('redirect works')
        redirect(URL('index')) 
    """Add a new room"""
    data = request.json
    try:
        required_fields = ['number_of_beds', 'amenities', 'price_per_night']
        for field in required_fields:
            if not data.get(field):
                return dict(success=False, error=f"Missing required field: {field}")
        
        #validators
        try:
            beds = int(data['number_of_beds'])
            price = float(data['price_per_night'])
        except ValueError:
            return dict(success=False, error="Invalid number format")
        
        if beds < 1 or beds > 5:
            return dict(success=False, error="Number of beds must be between 1 and 5")
        
        if price <= 0:
            return dict(success=False, error="Price must be greater than 0")
        
        room_id = db.rooms.insert(
            number_of_beds=beds,
            amenities=data['amenities'].strip(),
            price_per_night=price
        )
        
        db.commit()
        return dict(success=True, id=room_id, message="Room added successfully")
        
    except Exception as e:
        db.rollback()
        return dict(success=False, error=str(e))

# edits to a room
@action('api/manager/rooms/<room_id:int>', method=['PUT'])
@action.uses(db, auth.user)
def update_room(room_id):
    user = auth.get_user()
    manager = db(db.managers.user_id == user['id']).select().first()
    if not manager:
        print('redirect works')
        redirect(URL('index')) 
    """Update a room"""
    data = request.json
    try:
        room = db(db.rooms.id == room_id).select().first()
        if not room:
            return dict(success=False, error="Room not found")
        
        # ensure its not in use
        from datetime import datetime
        today = datetime.now().date()
        active_reservations = db(
            (db.reservations.room_id == room_id) & 
            (db.reservations.end_date >= today)
        ).count()
        
        if active_reservations > 0:
            return dict(success=False, error="Cannot modify room with active or future reservations")
        
        # safety
        update_data = {}
        if 'number_of_beds' in data:
            try:
                beds = int(data['number_of_beds'])
                if beds < 1 or beds > 5:
                    return dict(success=False, error="Number of beds must be between 1 and 5")
                update_data['number_of_beds'] = beds
            except ValueError:
                return dict(success=False, error="Invalid number of beds")
        
        if 'price_per_night' in data:
            try:
                price = float(data['price_per_night'])
                if price <= 0:
                    return dict(success=False, error="Price must be greater than 0")
                update_data['price_per_night'] = price
            except ValueError:
                return dict(success=False, error="Invalid price format")
        
        if 'amenities' in data:
            if not data['amenities'].strip():
                return dict(success=False, error="Amenities cannot be empty")
            update_data['amenities'] = data['amenities'].strip()
        
        if update_data:
            db(db.rooms.id == room_id).update(**update_data)
            db.commit()
        
        return dict(success=True, message="Room updated successfully")
        
    except Exception as e:
        db.rollback()
        return dict(success=False, error=str(e))

# get rid of a room
@action('api/manager/rooms/<room_id:int>', method=['DELETE'])
@action.uses(db, auth.user)
def delete_room(room_id):
    user = auth.get_user()
    manager = db(db.managers.user_id == user['id']).select().first()
    if not manager:
        print('redirect works')
        redirect(URL('index')) 
    """Delete a room"""
    try:
        room = db(db.rooms.id == room_id).select().first()
        if not room:
            return dict(success=False, error="Room not found")
  
        reservations_count = db(db.reservations.room_id == room_id).count()
        if reservations_count > 0:
            return dict(success=False, error="Cannot delete room with existing reservations")
        
        db(db.rooms.id == room_id).delete()
        db.commit()
        
        return dict(success=True, message="Room deleted successfully")
        
    except Exception as e:
        db.rollback()
        return dict(success=False, error=str(e))

@action('api/manager/rooms/<room_id:int>/reservations', method=['GET'])
@action.uses(db, auth.user)
def get_room_reservations(room_id):
    user = auth.get_user()
    manager = db(db.managers.user_id == user['id']).select().first()
    if not manager:
        print('redirect works')
        redirect(URL('index')) 
    """Get all reservations for a specific room"""
    try:
        reservations = db(db.reservations.room_id == room_id).select(
            db.reservations.ALL,
            db.customers.name,
            left=db.customers.on(db.customers.id == db.reservations.customer_id),
            orderby=db.reservations.start_date
        )
        
        reservation_list = []
        for r in reservations:
            reservation_list.append({
                'id': r.reservations.id,
                'customer_name': r.customers.name if r.customers else 'Unknown',
                'start_date': str(r.reservations.start_date),
                'end_date': str(r.reservations.end_date),
                'total_cost': float(r.reservations.total_cost) if r.reservations.total_cost else 0,
                'notes': r.reservations.notes or ''
            })
        
        return dict(success=True, reservations=reservation_list)
        
    except Exception as e:
        return dict(success=False, error=str(e))
