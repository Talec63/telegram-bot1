// src/lib/models.js
const { userModel } = require('../components/user')
const { sessionModel } = require('../components/session')
const { blueMessageModel } = require('../components/messages')
const dailyPlanModel = require('../components/messages/dailyPlan.model.js')

const models = {
  user: userModel,
  session: sessionModel,
  blue_message: blueMessageModel,
  daily_plan: dailyPlanModel
}

module.exports = models
