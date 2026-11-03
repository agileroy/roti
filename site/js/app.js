// Point d'entrée : choisit la base (Firebase, ou mémoire partagée entre onglets avec ?demo) et lance l'interface.
import { firebaseConfig } from './firebase-config.js?v=__VERSION__';
import { createRotiStore } from './roti-store.js?v=__VERSION__';
import { startApp, showFatal } from './ui.js?v=__VERSION__';

const demo = new URLSearchParams(location.search).has('demo');

async function createDb() {
  if (demo) {
    const { createDemoDb } = await import('./memory-db.js?v=__VERSION__');
    return createDemoDb();
  }
  const { createFirebaseDb } = await import('./firebase-db.js?v=__VERSION__');
  return createFirebaseDb(firebaseConfig);
}

createDb()
  .then((db) => startApp(createRotiStore(db), { demo }))
  .catch((error) => {
    console.error(error);
    showFatal('Service temps réel injoignable : vérifiez votre réseau, le VPN de l\'entreprise le bloque. Rechargez la page pour réessayer.');
  });
