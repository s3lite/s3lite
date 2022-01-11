const AWS = require('aws-sdk')
const md5 = require('md5')
const LockFile = require('./lockFile')
const { now, wait, getFile, saveToFile, getLocalFileName } = require('./utils')
const { S3LiteError } = require('./errors')

module.exports = function ({
  bucket,
  fileName,
  localFilePath,
  acquireLockRetryTimeout,
  remoteDatabaseCacheTime,
  minLockLifetime,
  maxLockLifetime,
  allowNotFound,
  s3Options
}) {
  const S3 = {}
  const lockFile = new LockFile({ minLockLifetime, maxLockLifetime })
  const s3Cli = new AWS.S3({
    signatureVersion: 'v4',
    ...s3Options
  })
  const localFile = getLocalFileName(localFilePath, fileName)
  const lockName = `${fileName}.lock`
  let databaseETag
  let fileLastCheck

  function createLock () {
    const lockContent = lockFile.getLockContent()
    const lockMD5 = md5(lockContent)
    return s3Cli
      .putObject({
        Bucket: bucket,
        Key: lockName,
        Body: lockContent
      })
      .promise()
      .then(data => {
        if (data.ETag !== `"${lockMD5}"`) {
          return wait(acquireLockRetryTimeout).then(() => S3.acquireLock())
        }
        return data
      })
  }

  S3.acquireLock = () => {
    return s3Cli
      .getObject({
        Bucket: bucket,
        Key: lockName
      })
      .promise()
      .then(data => {
        if (!lockFile.isValid(data.Body)) {
          return createLock()
        }
        return wait(acquireLockRetryTimeout).then(() => S3.acquireLock())
      })
      .catch(error => {
        if (error.statusCode !== 404) {
          throw error
        }
        return createLock()
      })
  }

  S3.releaseLock = () => {
    return s3Cli
      .getObject({
        Bucket: bucket,
        Key: lockName,
        IfMatch: md5(lockFile.getLockContent())
      })
      .promise()
      .then(() => {
        return s3Cli
          .deleteObject({
            Bucket: bucket,
            Key: lockName
          })
          .promise()
          .catch(() => Promise.resolve())
      })
      .catch(() => Promise.resolve())
  }

  S3.pullDatabase = (useCache = true) => {
    const startTime = now()
    if (
      useCache &&
      localFile &&
      fileLastCheck &&
      now() - fileLastCheck <= remoteDatabaseCacheTime
    ) {
      return Promise.resolve(localFile)
    }

    return s3Cli
      .getObject({
        Bucket: bucket,
        Key: fileName,
        IfNoneMatch: databaseETag
      })
      .promise()
      .then(data => {
        fileLastCheck = now()
        databaseETag = data.ETag
        return saveToFile(localFile, data.Body).then(localFile => {
          lockFile.saveTime('pullDatabase', startTime)
          return localFile
        })
      })
      .catch(error => {
        if (fileLastCheck && error.statusCode === 304) {
          return Promise.resolve(localFile)
        }
        if (error.statusCode === 404) {
          if (!allowNotFound) throw error
          return saveToFile(localFile, '')
        }
        fileLastCheck = now()
        throw error
      })
  }

  S3.pushDatabase = () => {
    const startTime = now()
    return getFile(localFile).then(body => {
      const bodyMD5 = md5(body)
      return s3Cli
        .putObject({
          Bucket: bucket,
          Key: fileName,
          Body: body
        })
        .promise()
        .then(data => {
          if (data.ETag !== `"${bodyMD5}"`) {
            throw new S3LiteError('ETag different from ContentMD5')
          }
          lockFile.saveTime('pushDatabase', startTime)
          databaseETag = data.ETag
          return localFile
        })
    })
  }

  return S3
}
