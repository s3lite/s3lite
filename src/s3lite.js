const Database = require('./database')
const S3 = require('./lib/s3')
const Executor = require('./lib/executor')
const { parseS3Filename } = require('./lib/utils')
const { S3LiteError } = require('./lib/errors')

const S3Lite = {}

/**
 *
 * @param {string} s3Filename
 * @param {Object} [options]
 * @param {string} [options.localFilePath=/tmp/s3lite]
 * @param {number} [options.acquireLockRetryTimeout=100]
 * @param {number} [options.remoteDatabaseCacheTime=1000]
 * @param {number} [options.maxRetryOnRemoteDatabaseUpdated=1]
 * @param {number} [options.maxLockLifetime=60000]
 * @param {number} [options.minLockLifetime=1000]
 * @param {Object} [s3Options]
 * @return {Database}
 */
S3Lite.database = (
  s3Filename,
  {
    localFilePath = '/tmp/s3lite',
    s3Options = {},
    acquireLockRetryTimeout = 100,
    remoteDatabaseCacheTime = 1000,
    maxRetryOnRemoteDatabaseUpdated = 1,
    maxLockLifetime = 60000,
    minLockLifetime = 1000
  } = {}
) => {
  if (typeof localFilePath !== 'string' || localFilePath === '') {
    throw new S3LiteError('localFilePath value needs to be a non empty string')
  }
  if (typeof s3Options !== 'object' || s3Options === null) {
    throw new S3LiteError('s3Options needs to be an object')
  }
  if (
    typeof acquireLockRetryTimeout !== 'number' ||
    acquireLockRetryTimeout < 0
  ) {
    throw new S3LiteError(
      'acquireLockRetryTimeout needs to be an positive number'
    )
  }
  if (
    typeof remoteDatabaseCacheTime !== 'number' ||
    remoteDatabaseCacheTime < 0
  ) {
    throw new S3LiteError(
      'remoteDatabaseCacheTime needs to be an positive number'
    )
  }
  if (
    typeof maxRetryOnRemoteDatabaseUpdated !== 'number' ||
    maxRetryOnRemoteDatabaseUpdated < 0
  ) {
    throw new S3LiteError(
      'maxRetryOnRemoteDatabaseUpdated needs to be an positive number'
    )
  }
  if (typeof maxLockLifetime !== 'number' || maxLockLifetime < 0) {
    throw new S3LiteError('maxLockLifetime needs to be an positive number')
  }
  if (typeof minLockLifetime !== 'number' || minLockLifetime < 0) {
    throw new S3LiteError('minLockLifetime needs to be an positive number')
  }
  if (maxLockLifetime < minLockLifetime) {
    throw new S3LiteError(
      'minLockLifetime needs to be lower than maxLockLifetime'
    )
  }

  const { bucket, fileName, region } = parseS3Filename(s3Filename)
  if (region) {
    s3Options.region = region
  }

  if (!s3Options.region) {
    throw new S3LiteError('A region configuration value is required')
  }

  const s3 = new S3({
    bucket,
    fileName,
    localFilePath,
    s3Options,
    remoteDatabaseCacheTime,
    acquireLockRetryTimeout,
    maxLockLifetime,
    minLockLifetime
  })

  const executor = new Executor({ s3, maxRetryOnRemoteDatabaseUpdated })
  return new Database({ executor })
}

module.exports = S3Lite
