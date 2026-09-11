import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
// Using ES module imports for Node.js automation script.
dotenv.config();

// The service account should be retrieved from environment variables in GitHub Actions.
// FIREBASE_SERVICE_ACCOUNT must be a base64 encoded or stringified JSON of the service account key.
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountKey) {
  console.warn("FIREBASE_SERVICE_ACCOUNT not found. Skipping live DB update (dry run).");
}

let db = null;
if (serviceAccountKey) {
  try {
    const serviceAccount = JSON.parse(
      serviceAccountKey.startsWith('{') 
        ? serviceAccountKey 
        : Buffer.from(serviceAccountKey, 'base64').toString('utf8')
    );
    
    initializeApp({
      credential: cert(serviceAccount)
    });
    db = getFirestore();
  } catch (err) {
    console.error("Failed to initialize Firebase Admin SDK:", err);
    process.exit(1);
  }
}

// 2026 Tech Gadget dynamic inventory update
const latestGadgets = [
    {
      id: "holo-lens-x",
      name: "HoloLens Pro Vision X",
      category: "Augmented Reality",
      description: "Contact-lens based AR overlays with day-to-day utility integrations.",
      specs: ["Retina Display", "AI Assistant", "120hr Battery"],
      price: 899,
      inStock: true,
      releaseYear: 2026,
      cyberScore: 92
    },
    {
      id: "neural-link-sub",
      name: "NeuralLink Sub-Dermal Interface",
      category: "Cybernetics",
      description: "Direct thought-to-text interface with ultra-low latency quantum encryption.",
      specs: ["Sub-1ms Latency", "Quantum Secured", "Wireless Charging"],
      price: 2499,
      inStock: true,
      releaseYear: 2026,
      cyberScore: 98
    },
    {
      id: "quantum-comm-orb",
      name: "Quantum Comm Orb",
      category: "Communications",
      description: "Unhackable communication device utilizing quantum entanglement.",
      specs: ["100% Secure", "Infinite Range", "No Latency"],
      price: 4999,
      inStock: Math.random() > 0.5, // Simulate inventory changes dynamically
      releaseYear: 2026,
      cyberScore: 100
    },
    {
      id: "aero-boots-v2",
      name: "Anti-Gravity AeroBoots v2",
      category: "Transportation",
      description: "Personal mobility shoes with micro-thrusters for seamless levitation.",
      specs: ["Top Speed 45mph", "Kinetic Recharge", "AI Stabilization"],
      price: 1200,
      inStock: true,
      releaseYear: 2026,
      cyberScore: 85
    }
];

async function updateInventory() {
  console.log("Starting automated inventory update...");
  if (!db) {
     console.log("[Dry Run] Would update the following gadgets:");
     console.table(latestGadgets.map(g => ({ name: g.name, inStock: g.inStock, price: g.price })));
     return;
  }

  try {
    const batch = db.batch();
    for (const gadget of latestGadgets) {
      const docRef = db.collection('gadgets').doc(gadget.id);
      batch.set(docRef, gadget, { merge: true });
    }
    
    await batch.commit();
    console.log(`Successfully updated ${latestGadgets.length} gadgets in the Firestore DB.`);
  } catch (error) {
    console.error("Error updating inventory:", error);
    process.exit(1);
  }
}

updateInventory();
