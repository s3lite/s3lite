const md5 = require('md5')
const { now } = require('./utils')

module.exports = function ({ minLockLifetime, maxLockLifetime }) {
  const times = {}
  const LockFile = {}

  function getValidTo () {
    const validTo =
      (Object.values(times).length < 2 ? 3 : 2) *
      Object.values(times).reduce((prev, current) => prev + current, 0)
    if (validTo < minLockLifetime) {
      return minLockLifetime
    }
    if (validTo > maxLockLifetime) {
      return maxLockLifetime
    }
    return validTo + now()
  }

  LockFile.getLockContent = () => {
    const lockObject = {
      id: md5(`${now()}-${Math.random()}`),
      validTo: getValidTo()
    }
    return JSON.stringify(lockObject)
  }

  LockFile.isValid = body => {
    try {
      const lockObject = JSON.parse(body)
      return lockObject.validTo >= now()
    } catch (e) {
      return false
    }
  }

  LockFile.saveTime = (type, startTime) => {
    times[type] = now() - startTime
  }

  return LockFile
}
