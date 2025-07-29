#!/usr/bin/env python3
"""
Simple script to add sample rooms directly to the database
"""

import sqlite3
import os

# Database path
db_path = 'apps/hotel_reservations/databases/storage.db'

def add_sample_rooms():
    """Add sample rooms directly to database"""
    
    # Sample room data
    sample_rooms = [
        (1, 'WiFi, Air Conditioning, TV, Private Bathroom', 89.99, None),
        (2, 'WiFi, Air Conditioning, TV, Private Bathroom, Mini Fridge', 129.99, None),
        (2, 'WiFi, Air Conditioning, TV, Private Bathroom, Mini Fridge, Balcony', 149.99, None),
        (1, 'WiFi, Air Conditioning, TV, Private Bathroom, Kitchenette', 109.99, None),
        (3, 'WiFi, Air Conditioning, TV, Private Bathroom, Mini Fridge, Balcony, Sofa Bed', 189.99, None),
        (2, 'WiFi, Air Conditioning, TV, Private Bathroom, Jacuzzi, Balcony', 199.99, None)
    ]
    
    conn = None
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if rooms table exists and has data
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='rooms';")
        if not cursor.fetchone():
            print("Rooms table doesn't exist yet. Please run the application first to create tables.")
            return
        
        cursor.execute("SELECT COUNT(*) FROM rooms;")
        existing_count = cursor.fetchone()[0]
        
        if existing_count > 0:
            print(f"Database already has {existing_count} rooms. Skipping sample data creation.")
            return
        
        # Insert sample rooms
        for room in sample_rooms:
            cursor.execute("""
                INSERT INTO rooms (number_of_beds, amenities, price_per_night, image, created_on, created_by, modified_on, modified_by)
                VALUES (?, ?, ?, ?, datetime('now'), 1, datetime('now'), 1)
            """, room)
        
        conn.commit()
        print(f"Successfully added {len(sample_rooms)} sample rooms to the database!")
        
        # Show what was added
        cursor.execute("SELECT id, number_of_beds, price_per_night FROM rooms;")
        rooms = cursor.fetchall()
        print("\nRooms in database:")
        for room in rooms:
            print(f"  Room {room[0]}: {room[1]} bed(s) - ${room[2]}/night")
            
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    add_sample_rooms() 