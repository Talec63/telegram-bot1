const { Router } = require("telegraf");
const router = new Router(require("./router"));
const { helpHandler } = require("../../../components/help");
const { serviceHandler } = require("../services");
const testHandler = require("./test/messageTest");

router.handlers = new Map();
router.handlers.set("help", helpHandler);
router.handlers.set("services", serviceHandler);
router.handlers.set("testmessage", testHandler);
router.handlers.set("sendnow", testHandler);


module.exports = router;    