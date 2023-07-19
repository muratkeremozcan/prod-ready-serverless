const {SQSClient, ReceiveMessageCommand} = require('@aws-sdk/client-sqs')
const {ReplaySubject, firstValueFrom} = require('rxjs')
const {filter} = require('rxjs/operators')

// RxJs's [ReplaySubject](https://rxjs-dev.firebaseapp.com/api/index/class/ReplaySubject)
// lets you capture events and then replay them for every new subscriber.
// We will use it as a message buffer to capture all the messages that are in SQS,
// and when a test wants to wait for a specific message to arrive, we will replay through all the buffered messages.

const startListening = () => {
  const messages = new ReplaySubject(100)
  const messageIds = new Set()
  let stopIt = false

  const sqs = new SQSClient()
  const queueUrl = process.env.E2eTestQueueUrl

  const loop = async () => {
    while (!stopIt) {
      // When the test calls startListening we will use long-polling against SQS
      // to pull in any messages it has
      const receiveCmd = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        // shorter long polling frequency so we don't have to wait as long when we ask it to stop
        WaitTimeSeconds: 5,
      })
      const resp = await sqs.send(receiveCmd)

      if (resp.Messages) {
        // Because we disabled RawMessageDelivery in the SNS subscription,
        // we have the necessary information to work out if a message has come from the SNS topic.
        // As you can see below, for each SQS message, we capture the SNS topic ARN
        // as well as the actual message body.
        resp.Messages.forEach(msg => {
          if (messageIds.has(msg.MessageId)) {
            // seen this message already, ignore
            return
          }

          messageIds.add(msg.MessageId)

          const body = JSON.parse(msg.Body)
          if (body.TopicArn) {
            messages.next({
              sourceType: 'sns',
              source: body.TopicArn,
              message: body.Message,
            })
          }
        })
      }
    }
  }

  const loopStopped = loop()

  // we receive messages in the while loop, which can be stopped by calling the stop function that is returned.
  //  Because at the start of each iteration, the while loop would check if stopIt has been set to true.
  const stop = async () => {
    console.log('stop polling SQS...')
    stopIt = true

    await loopStopped
    console.log('long polling stopped')
  }

  // finds the first message in the ReplaySubject that satisfies the caller's predicate function.
  // While Rxjs operators normally return an Observable,
  // the firstValueFrom function lets us return the first value returned by the Observable as a Promise.
  // So the caller can use async await syntax to wait for their message to arrive.
  const waitForMessage = predicate => {
    const data = messages.pipe(filter(x => predicate(x)))
    return firstValueFrom(data)
  }

  return {
    stop,
    waitForMessage,
  }
}

module.exports = {
  startListening,
}
