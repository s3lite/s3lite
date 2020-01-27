module.exports = function () {
  const Queue = {}
  const items = []
  let inProgress = false

  Queue.enqueue = (queueGroup, promise) => {
    return new Promise((resolve, reject) => {
      items.push({
        queueGroup,
        promise,
        resolve,
        reject
      })
      Queue.dequeue()
    })
  }

  Queue.dequeue = omitQueueGroup => {
    if (inProgress) {
      return false
    }
    const item = items.shift()
    if (!item) {
      return false
    }
    if (item.queueGroup === omitQueueGroup) {
      return Queue.dequeue(omitQueueGroup)
    }

    try {
      inProgress = true
      item
        .promise()
        .then(result => {
          inProgress = false
          item.resolve(result)
          Queue.dequeue()
        })
        .catch(error => {
          inProgress = false
          item.reject(error)
          Queue.dequeue(item.queueGroup)
        })
    } catch (error) {
      inProgress = false
      item.reject(error)
      Queue.dequeue(item.queueGroup)
    }

    return true
  }

  return Queue
}
