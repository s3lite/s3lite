class S3LiteError extends Error {
  constructor (message) {
    super(message)
    this.name = 'S3LiteError'
  }
}

class S3RemoteDatabaseUpdatedError extends S3LiteError {
  constructor (message) {
    super(message)
    this.name = 'S3RemoteDatabaseUpdatedError'
  }
}

module.exports = {
  S3LiteError,
  S3RemoteDatabaseUpdatedError
}
