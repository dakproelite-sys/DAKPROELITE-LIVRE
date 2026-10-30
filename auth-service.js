import { auth, db } from "./firebase-config.js";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { ref, set, get, child } from "firebase/database";

/**
 * Inscription utilisateur / livreur
 * Enregistre l'email/mot de passe dans Authentication et stocke les détails dans DB /users/{uid}
 */
export async function registerUser(email, password, userData) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Structure des données utilisateur dans Realtime Database
    const userProfile = {
      uid: user.uid,
      email: user.email,
      nom: userData.nom || "",
      telephone: userData.telephone || "",
      role: userData.role || "livreur", // "livreur", "acheteur", "vendeur", etc.
      createdAt: new Date().toISOString(),
      // Champs spécifiques au profil livreur
      livreurProfile: userData.role === "livreur" ? {
        statut: "en_attente", // "actif", "suspendu", "en_attente"
        vehicule: userData.vehicule || "",
        documentsAdministratifs: {
          permis: userData.docs?.permis || "",
          carteIdentite: userData.docs?.carteIdentite || "",
          assurance: userData.docs?.assurance || "",
          statutVerification: "en_cours" // "valide", "rejete", "en_cours"
        }
      } : null
    };

    // Écriture dans Realtime Database sous 'users/{uid}'
    await set(ref(db, `users/${user.uid}`), userProfile);

    return { success: true, user: userProfile };
  } catch (error) {
    console.error("Erreur d'inscription:", error.message);
    throw error;
  }
}

/**
 * Connexion utilisateur
 */
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Récupération des données du profil depuis Realtime Database
    const snapshot = await get(child(ref(db), `users/${user.uid}`));
    if (snapshot.exists()) {
      return { success: true, user: user.uid, profile: snapshot.val() };
    } else {
      throw new Error("Profil utilisateur introuvable dans la base de données.");
    }
  } catch (error) {
    console.error("Erreur de connexion:", error.message);
    throw error;
  }
}

/**
 * Déconnexion
 */
export async function logoutUser() {
  return await signOut(auth);
}
