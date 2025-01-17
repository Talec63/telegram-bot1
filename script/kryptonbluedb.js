// script/kryptonbluedb.js
require('dotenv').config();
const mongoose = require('mongoose');

console.log("🚀 Démarrage de KryptonBlueDB - Le remplisseur magique de messages !");

const messages = [
  {
    text: "Coucou mes chatons, moi c’est Love, la petite nouvelle. On dit que vous êtes le canal le plus chaud du coin… alors prouvez-moi que je suis au bon endroit. Pour jouer avec moi, c’est simple : va sur mon profil, message, utilisez ces commandes \n\n/start – Pour lancer notre histoire. (code promo à récupérer)✨\n/help – Pour envoyer un message à Lena, elle répond vite d'ici 1h max 💌\n/services – Pour découvrir mes petites surprises. 👅🍆\n/squad – Pour partager du plaisir. ❤️‍🔥\n\nSoyez doux, soyez créatifs… et je saurai vous le rendre. 💋🔞",
    tags: ["introduction", "provocante", "sensuelle"],
    time_of_day: "afternoon",
    weight: 2,
    usedRecently: false,
    popularity: 1,
    date_creation: new Date(),
    lastUsed: null,
    specialEvent: null
  }
];

async function remplirLaBaseDeDonnees() {
    let connection;
    try {
        console.log("📡 Tentative de connexion à MongoDB...");
        connection = await mongoose.connect(process.env.MONGO_URI, {
            dbName: 'pinkgram_bot'  
        });
        console.log("📫 Connecté à la base de données !");

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("📚 Collections existantes:", collections.map(c => c.name));

        const messageSchema = new mongoose.Schema({
            text: { type: String, required: true },
            tags: [String],
            time_of_day: { type: String, required: true },
            weight: { type: Number, default: 1 },
            usedRecently: { type: Boolean, default: false },
            popularity: { type: Number, default: 0 },
            date_creation: { type: Date, default: Date.now },
            lastUsed: { type: Date, default: null },
            specialEvent: { type: String, default: null }
        }, {
            collection: 'blue_message'
        });

        console.log("📋 Création du modèle de messages...");
        const BlueMessage = mongoose.model('blue_message', messageSchema);

        console.log("🧹 Nettoyage des anciens messages...");
        const deleteResult = await BlueMessage.deleteMany({});
        console.log("🗑️ Nombre de messages supprimés:", deleteResult.deletedCount);

        console.log("✨ Ajout du nouveau message...");
        const inserted = await BlueMessage.insertMany(messages);
        console.log("📥 Message inséré:", inserted.length);

        const count = await BlueMessage.countDocuments();
        console.log(`📬 Nombre total de messages dans la base : ${count}`);

        const verif = await BlueMessage.find();
        console.log("\n📝 Vérification - Messages dans la base :");
        verif.forEach(msg => {
            console.log(`- ${msg.time_of_day}: "${msg.text}" (ID: ${msg._id})`);
        });

    } catch (error) {
        console.error("❌ Erreur :", error);
    } finally {
        if (connection) {
            console.log("\n👋 Fermeture de la connexion...");
            await connection.disconnect();
            console.log("✅ Terminé !");
        }
        process.exit(0);
    }
}

remplirLaBaseDeDonnees();
