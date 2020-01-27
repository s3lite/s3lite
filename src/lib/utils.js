const fs = require('fs')
const mkdirp = require('mkdirp')
const { S3LiteError } = require('./errors')

const Utils = {}

Utils.parseS3Filename = s3Filename => {
  if (typeof s3Filename !== 'string') {
    throw new S3LiteError('s3Filename value needs to be a string')
  }

  let match

  // Virtual Hosted Style Access
  // https://bucket-name.s3.region.amazonaws.com/key
  match = s3Filename.match(
    /^https?:\/\/([a-z0-9]([a-z0-9-]*(\.[a-z0-9])?))\.s3\.([a-z]{2}-[a-z]{4,}-[1-9])\.amazonaws\.com\/(.+)$/
  )
  if (match) {
    return {
      region: match[4],
      bucket: match[1],
      fileName: match[5]
    }
  }

  // Path-Style Access
  // https://s3.region.amazonaws.com/bucket-name/key
  match = s3Filename.match(
    /^https?:\/\/s3\.([a-z]{2}-[a-z]{4,}-[1-9])\.amazonaws\.com\/([a-z0-9]([a-z0-9-]*(\.[a-z0-9])?))\/(.+)$/
  )
  if (match) {
    return {
      region: match[1],
      bucket: match[2],
      fileName: match[5]
    }
  }

  // Aws-Cli Style Access
  // s3://bucket-name/key
  match = s3Filename.match(/^s3:\/\/([a-z0-9]([a-z0-9-]*(\.[a-z0-9])?))\/(.+)$/)
  if (match) {
    return {
      bucket: match[1],
      fileName: match[4]
    }
  }

  throw new S3LiteError(
    "Can't retrieve bucketName and fileName from the given s3Filename"
  )
}

Utils.getLocalFileName = (localFilePath, fileName) => {
  return `${localFilePath.replace(/(\/)+$/, '')}/${fileName}`
}

Utils.now = () => {
  return +new Date()
}

Utils.wait = ms => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

Utils.saveToFile = (fileName, body) => {
  const directory = fileName.match(/(.*)[/\\]/)[1] || ''

  return new Promise((resolve, reject) => {
    mkdirp(directory, error => {
      if (error) reject(error)
      else {
        fs.writeFile(fileName, body, error => {
          if (error) reject(error)
          else resolve(fileName)
        })
      }
    })
  })
}

Utils.getFile = fileName => {
  return new Promise((resolve, reject) => {
    fs.readFile(fileName, (error, body) => {
      if (error) reject(error)
      else resolve(body)
    })
  })
}

module.exports = Utils
