import urllib.request
import json

def test_api():
    # 1. Test Events list
    res = urllib.request.urlopen('http://127.0.0.1:8000/api/v1/events/')
    events = json.loads(res.read())
    print(f"1. Events count: {len(events)}")
    assert any('Arijit Singh' in e['title'] for e in events), "Arijit Singh event missing"
    assert any('Tech Summit' in e['title'] for e in events), "Tech Summit event missing"
    assert any('Chennai Food Fest' in e['title'] for e in events), "Chennai Food Fest missing"
    print("   -> All screenshot events verified!")

    # 2. Test Demo Login for Naveen KS (Attendee)
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/auth/demo-login/',
        data=json.dumps({'role': 'attendee'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    res = urllib.request.urlopen(req)
    tokens = json.loads(res.read())
    print(f"2. Demo Login: User {tokens['user']['name']} ({tokens['user']['email']}) logged in with JWT")
    token = tokens['access']

    # 3. Test Booking List for Naveen KS
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/bookings/',
        headers={'Authorization': f'Bearer {token}'}
    )
    res = urllib.request.urlopen(req)
    bookings = json.loads(res.read())
    print(f"3. Bookings count for Naveen KS: {len(bookings)}")

    # 4. Test Gate Scanner for ticket
    ticket_qr = bookings[0]['tickets'][0]['qr_code']
    print(f"4. Testing Gate Scanner on QR code: {ticket_qr}")
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/tickets/validate/',
        data=json.dumps({'qr_code': ticket_qr}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    res = urllib.request.urlopen(req)
    scan_res = json.loads(res.read())
    print(f"   -> Scan 1 Result: {scan_res['result']} ({scan_res['message']})")
    assert scan_res['result'] == 'VALID', "Expected VALID scan"

    # Rescan same ticket to verify ALREADY_USED
    res = urllib.request.urlopen(req)
    scan_res2 = json.loads(res.read())
    print(f"   -> Scan 2 (Rescan) Result: {scan_res2['result']} ({scan_res2['message']})")
    assert scan_res2['result'] == 'ALREADY_USED', "Expected ALREADY_USED scan"

    # 5. Test PDF Download endpoint
    booking_id = bookings[0]['id']
    pdf_res = urllib.request.urlopen(f'http://127.0.0.1:8000/api/v1/bookings/{booking_id}/pdf/')
    pdf_bytes = pdf_res.read()
    print(f"5. PDF Ticket generated: {len(pdf_bytes)} bytes (header: {pdf_bytes[:4].decode('latin1')})")
    assert pdf_bytes.startswith(b'%PDF'), "Invalid PDF file"

    # 6. Test Promo Code validation
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/promos/validate/',
        data=json.dumps({'code': 'EARLYBIRD10', 'amount': 1000}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    res = urllib.request.urlopen(req)
    promo_res = json.loads(res.read())
    print(f"6. Promo Code EARLYBIRD10 Valid: {promo_res['valid']}, Discount: ₹{promo_res['discount_amount']}")
    assert promo_res['valid'] is True

    # 7. Test Admin Stats
    admin_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/auth/demo-login/',
        data=json.dumps({'role': 'admin'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    admin_res = urllib.request.urlopen(admin_req)
    admin_tokens = json.loads(admin_res.read())
    admin_stats_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/admin/stats/',
        headers={'Authorization': f"Bearer {admin_tokens['access']}"}
    )
    admin_stats = json.loads(urllib.request.urlopen(admin_stats_req).read())
    print(f"7. Admin Stats: {admin_stats['total_users']} users, {admin_stats['total_events']} events, Gross GMV: ₹{admin_stats['gross_revenue']}")

    print("\n==============================================")
    print("ALL 7 END-TO-END SYSTEM TESTS PASSED PERFECTLY!")
    print("==============================================")

if __name__ == '__main__':
    test_api()
