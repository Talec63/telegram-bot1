const { Schema, model } = require('mongoose');
const dayjs = require('dayjs');

const helpSchema = new Schema({
    user_id: {
        type: String,
        required: true,
        index: true
    },
    username: {
        type: String,
        default: null
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'answered', 'archived'],
        default: 'pending',
        index: true
    },
    createdAt: {
        type: Date,
        default: () => dayjs().utc().toDate(),
        index: true
    },
    promo: {
        code: {
            type: String,
            unique: true,
            sparse: true
        },
        generatedAt: {
            type: Date,
            default: null
        },
        expiresAt: {
            type: Date,
            default: null
        },
        used: {
            type: Boolean,
            default: false
        },
        usedAt: {
            type: Date,
            default: null
        }
    },
    answer: {
        text: String,
        answeredBy: String,
        answeredAt: Date
    }
}, {
    collection: 'help_messages',
    timestamps: true
});

// Index composites
helpSchema.index({ user_id: 1, createdAt: -1 });
helpSchema.index({ status: 1, createdAt: -1 });

// Méthodes statiques
helpSchema.statics = {
    async canSendMessage(userId) {
        const lastMessage = await this.findOne(
            { user_id: userId },
            null,
            { sort: { createdAt: -1 } }
        );

        if (!lastMessage) return true;

        const hoursSinceLastMessage = dayjs().diff(dayjs(lastMessage.createdAt), 'hour');
        return hoursSinceLastMessage >= 1;
    },

    async getActivePromo(userId) {
        const message = await this.findOne({
            user_id: userId,
            'promo.code': { $exists: true },
            'promo.expiresAt': { $gt: new Date() },
            'promo.used': false
        });

        return message?.promo || null;
    }
};

// Méthodes d'instance
helpSchema.methods = {
    async markAsAnswered(adminId, answerText) {
        this.status = 'answered';
        this.answer = {
            text: answerText,
            answeredBy: adminId,
            answeredAt: dayjs().utc().toDate()
        };
        return this.save();
    },

    async usePromoCode() {
        if (this.promo && !this.promo.used) {
            this.promo.used = true;
            this.promo.usedAt = dayjs().utc().toDate();
            return this.save();
        }
        return false;
    }
};

module.exports = model('HelpMessage', helpSchema);