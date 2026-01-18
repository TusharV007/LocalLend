# Locale Lend - Community Item Sharing Platform

A Next.js application that enables neighbors to share items within their local community, built with Firebase backend.

## Features

- 🔐 **Authentication** - Email/Password sign-in with Firebase Auth
- 📦 **Item Listings** - Add, manage, and browse shareable items
- 🗺️ **Location-based** - Find items nearby with interactive map
- 💬 **Real-time Chat** - Message owners directly about items
- 🔔 **Request System** - Send/accept borrow requests
- 🔍 **Search** - Find items by title
- ✅ **Status Management** - Track item availability (Available/Lended/Unavailable)

## Tech Stack

- **Frontend**: Next.js 16, React, TailwindCSS, Framer Motion
-** Backend**: Firebase (Auth, Firestore, Storage)
- **Maps**: Leaflet

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/TusharV007/LocalLend.git
cd LocalLend/frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Firebase**

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

4. **Set up Firebase Security Rules**

Go to Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /items/{itemId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.owner.id;
    }
    match /requests/{requestId} {
      allow read: if request.auth.uid == resource.data.borrowerId 
                  || request.auth.uid == resource.data.lenderId;
      allow create: if request.auth != null;
      allow update: if request.auth.uid == resource.data.lenderId;
      
      match /messages/{messageId} {
        allow read, create: if request.auth.uid == get(/databases/$(database)/documents/requests/$(requestId)).data.borrowerId
                            || request.auth.uid == get(/databases/$(database)/documents/requests/$(requestId)).data.lenderId;
      }
    }
  }
}
```

Go to Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /items/{itemId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

5. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/              # Next.js app directory
│   ├── auth/         # Authentication page
│   ├── messages/     # Messaging hub
│   ├── profile/      # User profile
│   └── page.tsx      # Home/Browse items
├── components/       # React components
├── lib/              # Utilities
│   ├── db.ts         # Firestore functions
│   ├── firebase.ts   # Firebase config
│   └── storage.ts    # Image upload
├── types/            # TypeScript types
└── public/           # Static assets
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT License - feel free to use this project for learning or commercial purposes.
