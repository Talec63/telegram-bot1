require('dotenv').config();
const mongoose = require('mongoose');

async function testInvitations() {
    try {
        // 1. Connexion à la base de données
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: 'pinkgram_bot'
        });
        console.log('✅ Connecté à MongoDB');

        const db = mongoose.connection.getClient().db('pinkgram_bot');

        // 2. Test avec 2 invitations
        const TEST_USER_ID = "7234207143"; // Ton ID Telegram
        
        await db.collection('inviteSquad').updateOne(
            { userId: TEST_USER_ID },
            {
                $set: {
                    inviteCount: 2,
                    invitedUsers: ["TEST1", "TEST2"]
                }
            },
            { upsert: true }
        );

        console.log('✅ Test avec 2 invitations ajouté');
        
        // 3. Vérification
        const result = await db.collection('inviteSquad').findOne({ userId: TEST_USER_ID });
        console.log('📊 Données dans la base :', result);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Test terminé');
    }
}

testInvitations(); 