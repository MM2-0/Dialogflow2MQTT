const express = require('express')
const mqtt = require('async-mqtt')

async function main() {
  const app = express()
  app.use(express.json())

  const mqttClient = await mqtt.connectAsync(`${process.env.MQTT_SERVER}`, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD
  })

  app.post('/post', async (req, res) => {
    if (req.header('access_token') !== process.env.ACCESS_TOKEN) {
      res.status(403).send('Access denied')
      return
    }

    const queryResult = req.body.queryResult
    const intentId = queryResult.intent.name


    await mqttClient.subscribe(`${process.env.TOPIC_PREFIX}/response/${req.body.responseId}`)

    const responsePromise = new Promise(((resolve, reject) => {
      mqttClient.on('message', ((topic, payload) => {
        console.log(topic, req.body.responseId)
        if (topic === `${process.env.TOPIC_PREFIX}/response/${req.body.responseId}`) resolve(payload.toString())
      }))
    }))
    await mqttClient.publish(`${process.env.TOPIC_PREFIX}/request${intentId.substring(intentId.lastIndexOf('/'))}`, JSON.stringify(req.body))


    const timeout = new Promise((resolve, reject) => {
      setTimeout(reject, 10000)
    })


    try {
      const response = await Promise.race([responsePromise, timeout])
      res.json({
        'fulfillmentMessages': [
          {
            'text': {
              'text': [
                response
              ]
            }
          }
        ]
      })
    } catch (e) {
      if (e) console.log(e.toString())
      res.json({
        'fulfillmentMessages': [
          {
            'text': {
              'text': [
                process.env.DEFAULT_RESPONSE
              ]
            }
          }
        ]
      })
    }
    await mqttClient.unsubscribe(`${process.env.TOPIC_PREFIX}/response/${req.body.responseId}`)
  })

  app.listen(8080, function () {
    console.log('Dialogflow2MQTT is up and running on port 8080')
    if (process.env.ACCESS_TOKEN == null) {
      console.warn('You did not set an ACCESS_TOKEN env variable. This means your webservice will be publicly accessible for everyone.')
    }
  })
}

main()
