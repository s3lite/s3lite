class S3LiteError extends Error {
  constructor (message) {
    super(message)
    this.name = 'S3LiteError'
  }
}

module.exports = {
  S3LiteError
}
