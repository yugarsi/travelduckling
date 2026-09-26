# Test TravelDuckling locally

These steps run the website, API, and Firebase Authentication against local emulators. They do not publish rides to production or use production Firebase accounts.

## Requirements

- Node.js and npm
- Java 21 (needed by the Firebase Auth Emulator)
- Python 3.12

## 1. Start Firebase Authentication Emulator

In Terminal 1:

```sh
cd /Users/yugarsighosh/TravelDuckling-1.0/travelduckling
npx --yes firebase-tools@15.1.0 emulators:start --only auth --project travelduckling
```

The first run downloads the CLI temporarily through `npx`; it does not install the Firebase CLI globally. Keep this terminal open. The emulator UI is at <http://127.0.0.1:4000/auth> and Auth listens on port `9099`.

## 2. Create two local test accounts

In Terminal 2, start the website:

```sh
cd /Users/yugarsighosh/TravelDuckling-1.0/travelduckling
python3 -m http.server 5500 --bind 127.0.0.1
```

Open <http://127.0.0.1:5500/pages/signup.html>. Create separate driver and rider accounts using test-only email addresses and passwords. Use the emulator’s email action link to verify both addresses; the link is printed in the Firebase Emulator terminal. In the Emulator UI, copy each account’s UID.

## 3. Start the API with local-only test settings

In Terminal 3:

```sh
cd /Users/yugarsighosh/TravelDuckling-1.0/travelduckling-api
python3.12 -m venv .venv
source .venv/bin/activate
pip install 'cryptography==45.0.7'
pip install -r requirements.txt
```

The cryptography pin uses a prebuilt macOS wheel with Python 3.12, avoiding a local Rust build. Now start the API (replace the UID placeholders with the values from the Emulator UI):

```sh
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_PROJECT_ID=travelduckling \
DATABASE_URL=sqlite:///./travelduckling-readme.db \
RIDE_STORE=sqlite \
ALLOWED_FIREBASE_UIDS='DRIVER_UID,RIDER_UID' \
RIDE_IDENTITY_VERIFICATION_BYPASS_UIDS='DRIVER_UID' \
CORS_ALLOWED_ORIGINS='http://127.0.0.1:5500' \
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The identity-verification bypass is only for the local driver account in this terminal session. Never use it in production. The local SQLite file is ignored by Git. You can confirm the API is running at <http://127.0.0.1:8000/api/v1/health>.

## 4. Run the end-to-end flow

Open <http://127.0.0.1:5500> in a browser:

1. Sign out. Enter an origin and destination and search. Guest search should show available rides, while the action says **Log in to request**.
2. Sign in as the driver. Choose **Offer a ride**, enter a future departure within the next two hours, and publish it. The confirmation should offer **View your trips**.
3. Sign out, sign in as the rider, search the same route, and choose **Request to join**.
4. Sign out, sign in as the driver, open **My trips**, and accept the pending rider request. The accepted rider count increases and available seats decrease.
5. Start the trip from the driver's trip card. Sign in as the rider and open **My trips** to see the accepted trip.

Use test accounts and test data only. Stop the three local processes with `Ctrl+C` when finished. The Auth Emulator accounts and SQLite data are local to this machine.
