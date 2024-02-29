const express = require("express");
const bodyParser = require("body-parser");
const webhook = require("./handlers/webhook")
const challenge = require("./handlers/challenge")

require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.get('/webhook', challenge);
app.post('/webhook', webhook);

const listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
  if (!process.env.ORGANIZATION_ID || !process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.TEAMS_WEBHOOK || !process.env.CM_PIPELINE_EXECUTION_BASE_URL) {
    listener.close(function() { console.error('App has been stopped: environment variables are missing or incomplete'); });
  }
});




