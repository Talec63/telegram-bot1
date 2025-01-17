const messages = {
    welcome: (name) => `👋 Bienvenue ${name} !
    
    Pour rejoindre notre canal privé, veuillez répondre à cette question :
    Combien font 2 + 2 ?`,
    
    success: (name) => `✅ Félicitations ${name} !
    Vous avez été validé avec succès.
    
    Préparez-vous à découvrir mon univers...`,
    
    error: (name) => `❌ Désolé ${name}, une erreur est survenue. 
    Veuillez réessayer plus tard.`,

    wrongAnswer: (name, attemptsLeft) => `❌ Désolé ${name}, ce n'est pas la bonne réponse.
    Il vous reste ${attemptsLeft} essai(s).`,

    tooManyAttempts: (name) => `⚠️ Désolé ${name}, vous avez épuisé vos tentatives.
    Veuillez réessayer dans 30 minutes.`,

    alreadyMember: (name) => `👋 Hey ${name} !
    Vous êtes déjà membre du canal.`,

    photoPreview: "✨ Bientôt disponible : Un aperçu exclusif de mon univers privé...",
    
    chatPlaceholder: "💭 Le chat privé sera bientôt disponible...",
    
    codesPlaceholder: "🎁 Des codes exclusifs arrivent bientôt...",

    promoExpired: (name) => `Hey ${name} !
    Ton code promo a expiré... Mais j'ai une surprise pour toi ! 
    Contacte-moi en privé 😘`
}

module.exports = messages