"""
This file defines the database models
"""

from pydal.validators import *

from .common import Field, db, auth

### Define your table below
#
# db.define_table('thing', Field('name'))
#
## always commit your models to avoid problems later
#
# db.commit()
#

db.define_table('rooms',
    Field('number_of_beds', 'integer', requires=IS_INT_IN_RANGE(1, 5), notnull=True),
    Field('amenities', 'text', requires=IS_NOT_EMPTY()),
    Field('price_per_night', 'double', requires=IS_FLOAT_IN_RANGE(0, None), notnull=True),
    Field('image', 'upload'),
    auth.signature, format="Room %(id)s | Beds: %(number_of_beds)s | $%(price_per_night).2f")

db.define_table('customers',
    Field('user_id', 'reference auth_user'),
    Field('name', 'string', requires=IS_NOT_EMPTY()),
    Field('address', 'text', requires=IS_NOT_EMPTY()),
    Field('phone_number', 'string' , requires=IS_MATCH(r'^\+?\d{7,15}$', error_message="Enter a valid phone number")),
    Field('email', 'string', requires=[IS_EMAIL(), IS_NOT_EMPTY()], unique=True),
    auth.signature, format="%(name)s | %(email)s | %(phone_number)s")

db.define_table('managers',
    Field('user_id', 'reference auth_user'),
    Field('name', 'string', requires=IS_NOT_EMPTY()),
    Field('phone_number', 'string' , requires=IS_MATCH(r'^\+?\d{7,15}$', error_message="Enter a valid phone number")),
    Field('email', 'string', requires=[IS_EMAIL(), IS_NOT_EMPTY()], unique=True),
    auth.signature, format="%(name)s | %(email)s | %(phone_number)s")

db.define_table('reservations',
    Field('room_id', 'reference rooms', notnull=True),
    Field('customer_id', 'reference customers', notnull=True),
    Field('start_date', 'date', requires=IS_DATE(format="%Y-%m-%d"), notnull=True),
    Field('end_date', 'date', requires=IS_DATE(format="%Y-%m-%d"), notnull=True),
    Field('notes', 'text'),
    Field('total_cost', 'double', requires=IS_FLOAT_IN_RANGE(0, None)),
    auth.signature, format="Reservation %(id)s | Room %(room_id)s | Customer %(customer_id)s")

db.commit()